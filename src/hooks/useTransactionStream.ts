import { useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import { AppDispatch, flushBuffer, setStreamStatus } from "../store/transactionStore";
import { Transaction, TransactionCategory } from "../store/transactionTypes";

declare const process: {
  env: Record<string, string | undefined>;
};

const CATEGORIES: TransactionCategory[] = [
  "Payment",
  "Refund",
  "Transfer",
  "Deposit",
  "Withdrawal",
];

const FLUSH_INTERVAL_MS = 500;
const SSE_STREAM_URL =
  process.env.REACT_APP_STREAM_URL ?? "http://localhost:5178/api/transactions/stream";

interface SseTransactionEvent {
  transactionId: string;
  category: string;
  amount: number;
  status: string;
  occurredAt: {
    seconds: number | string;
    nanos: number;
  };
}

function isTransactionCategory(value: string): value is TransactionCategory {
  return CATEGORIES.includes(value as TransactionCategory);
}

function isTransactionStatus(value: string): value is Transaction["status"] {
  return value === "success" || value === "failed";
}

function protoTimestampToDate(seconds: number, nanos: number): Date {
  return new Date(seconds * 1000 + Math.floor(nanos / 1_000_000));
}

function mapSseToTransaction(payload: SseTransactionEvent): Transaction {
  return {
    id: payload.transactionId,
    category: isTransactionCategory(payload.category) ? payload.category : "Payment",
    amount: payload.amount,
    timestamp: protoTimestampToDate(Number(payload.occurredAt.seconds), payload.occurredAt.nanos).toISOString(),
    status: isTransactionStatus(payload.status) ? payload.status : "failed",
  };
}

export function useTransactionStream(): void {
  const dispatch = useDispatch<AppDispatch>();

  const bufferRef = useRef<Transaction[]>([]);
  const sseStreamRef = useRef<EventSource | null>(null);
  const flushRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attemptRef = useRef(0);
  const dispatchRef = useRef(dispatch);
  dispatchRef.current = dispatch;

  useEffect(() => {
    let mounted = true;

    function stopStream() {
      if (sseStreamRef.current) {
        sseStreamRef.current.close();
        sseStreamRef.current = null;
      }
    }

    function pushTx(tx: Transaction) {
      attemptRef.current = 0;
      bufferRef.current.push(tx);
      if (mounted) dispatchRef.current(setStreamStatus("live"));
    }

    function startStream() {
      if (!mounted) return;
      dispatchRef.current(setStreamStatus("reconnecting"));

      const source = new EventSource(SSE_STREAM_URL);
      sseStreamRef.current = source;

      source.onmessage = (event) => {
        if (!mounted || !event.data) return;
        try {
          const payload = JSON.parse(event.data) as SseTransactionEvent;
          pushTx(mapSseToTransaction(payload));
        } catch {
          // Ignore malformed payloads and keep stream alive.
        }
      };

      source.onerror = () => {
        if (!mounted) return;
        stopStream();
        dispatchRef.current(setStreamStatus("cached"));
        scheduleReconnect();
      };
    }

    function scheduleReconnect() {
      const delay = Math.min(1000 * Math.pow(2, attemptRef.current), 30000);
      attemptRef.current += 1;
      if (mounted) dispatchRef.current(setStreamStatus("reconnecting"));
      reconnectRef.current = setTimeout(() => {
        if (mounted) startStream();
      }, delay);
    }

    flushRef.current = setInterval(() => {
      if (mounted && bufferRef.current.length > 0) {
        dispatchRef.current(flushBuffer([...bufferRef.current]));
        bufferRef.current = [];
      }
    }, FLUSH_INTERVAL_MS);

    startStream();

    return () => {
      mounted = false;
      stopStream();
      if (flushRef.current) clearInterval(flushRef.current);
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      bufferRef.current = [];
    };
  }, []);
}
