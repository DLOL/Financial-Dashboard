import { useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import { AppDispatch, flushBuffer, setStreamStatus } from "../store/transactionStore";
import { Transaction, TransactionCategory } from "../store/transactionTypes";
import {
  streamTransactions,
  TransactionResponse as GrpcTransactionResponse,
} from "../grpc/reportingClient";
import { ClientReadableStream } from "grpc-web";

const CATEGORIES: TransactionCategory[] = [
  "Payment",
  "Refund",
  "Transfer",
  "Deposit",
  "Withdrawal",
];

const FLUSH_INTERVAL_MS = 500;

function isTransactionCategory(value: string): value is TransactionCategory {
  return CATEGORIES.includes(value as TransactionCategory);
}

function isTransactionStatus(value: string): value is Transaction["status"] {
  return value === "success" || value === "failed";
}

/**
 * Maps Protobuf Timestamp (seconds + nanos) to JavaScript Date object
 * preserving sub-second millisecond precision.
 */
function protoTimestampToDate(seconds: number, nanos: number): Date {
  const ms = seconds * 1000 + Math.floor(nanos / 1_000_000);
  return new Date(ms);
}

function mapProtoToTransaction(payload: GrpcTransactionResponse): Transaction {
  const seconds = Number(payload.occurredAt?.seconds || 0);
  const nanos = Number(payload.occurredAt?.nanos || 0);
  return {
    id: payload.transactionId,
    category: isTransactionCategory(payload.category) ? payload.category : "Payment",
    amount: payload.amount,
    timestamp: protoTimestampToDate(seconds, nanos).toISOString(),
    status: isTransactionStatus(payload.status) ? payload.status : "failed",
  };
}

export function useTransactionStream(): void {
  const dispatch = useDispatch<AppDispatch>();

  const bufferRef = useRef<Transaction[]>([]);
  const grpcStreamRef = useRef<ClientReadableStream<any> | null>(null);
  const flushRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attemptRef = useRef(0);
  const dispatchRef = useRef(dispatch);
  dispatchRef.current = dispatch;

  useEffect(() => {
    let mounted = true;

    // Explicitly cancels gRPC stream on cleanup to prevent memory leaks (Part C Constraint)
    function stopStream() {
      if (grpcStreamRef.current) {
        try {
          grpcStreamRef.current.cancel();
        } catch {
          // Stream might already be closed
        }
        grpcStreamRef.current = null;
      }
    }

    function pushTx(tx: Transaction) {
      attemptRef.current = 0;
      bufferRef.current.push(tx);
      if (mounted) dispatchRef.current(setStreamStatus("live"));
    }

    function startStream() {
      if (!mounted) return;
      stopStream();
      dispatchRef.current(setStreamStatus("reconnecting"));

      const stream = streamTransactions(
        { reportId: "live-report", maxItems: 10000 },
        {
          onData: (data: GrpcTransactionResponse) => {
            if (!mounted) return;
            pushTx(mapProtoToTransaction(data));
          },
          onEnd: () => {
            if (!mounted) return;
            dispatchRef.current(setStreamStatus("cached"));
            scheduleReconnect();
          },
          onError: (err) => {
            if (!mounted) return;
            stopStream();
            dispatchRef.current(setStreamStatus("cached"));
            scheduleReconnect();
          },
        }
      );

      grpcStreamRef.current = stream;
    }

    function scheduleReconnect() {
      if (!mounted) return;
      if (reconnectRef.current) clearTimeout(reconnectRef.current);

      const delay = Math.min(1000 * Math.pow(2, attemptRef.current), 30000);
      attemptRef.current += 1;
      dispatchRef.current(setStreamStatus("reconnecting"));

      reconnectRef.current = setTimeout(() => {
        if (mounted) startStream();
      }, delay);
    }

    // 500ms Client-Side Buffer flush loop to prevent React render storms
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
