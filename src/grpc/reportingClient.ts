import {
  ClientReadableStream,
  GrpcWebClientBase,
  MethodDescriptor,
  MethodType,
  RpcError,
} from "grpc-web";
import { Field, Type } from "protobufjs/light";

declare const process: {
  env: Record<string, string | undefined>;
};

export interface ReportRequest {
  reportId: string;
  maxItems: number;
}

export interface StreamTimestamp {
  seconds: number;
  nanos: number;
}

export interface TransactionResponse {
  transactionId: string;
  category: string;
  amount: number;
  status: string;
  occurredAt: StreamTimestamp;
}

class ReportRequestMessage {
  constructor(public payload: { report_id: string; max_items: number }) {}
}

class TransactionResponseMessage {
  constructor(public payload: TransactionResponse) {}
}

const TimestampType = new Type("Timestamp")
  .add(new Field("seconds", 1, "int64"))
  .add(new Field("nanos", 2, "int32"));

const ReportRequestType = new Type("ReportRequest")
  .add(new Field("report_id", 1, "string"))
  .add(new Field("max_items", 2, "int32"));

const TransactionResponseType = new Type("TransactionResponse")
  .add(new Field("transaction_id", 1, "string"))
  .add(new Field("category", 2, "string"))
  .add(new Field("amount", 3, "double"))
  .add(new Field("status", 4, "string"))
  .add(new Field("occurred_at", 5, "Timestamp"));

TransactionResponseType.add(TimestampType);

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (value && typeof value === "object" && "toString" in value) {
    return Number((value as { toString: () => string }).toString());
  }
  return 0;
}

function serializeReportRequest(message: ReportRequestMessage): Uint8Array {
  return ReportRequestType.encode(message.payload).finish();
}

function deserializeTransactionResponse(bytes: Uint8Array): TransactionResponseMessage {
  const decoded = TransactionResponseType.decode(bytes) as {
    transaction_id?: string;
    category?: string;
    amount?: number;
    status?: string;
    occurred_at?: { seconds?: unknown; nanos?: unknown };
  };

  const seconds = toNumber(decoded.occurred_at?.seconds);
  const nanos = toNumber(decoded.occurred_at?.nanos);

  return new TransactionResponseMessage({
    transactionId: decoded.transaction_id ?? "",
    category: decoded.category ?? "Payment",
    amount: decoded.amount ?? 0,
    status: decoded.status ?? "failed",
    occurredAt: {
      seconds,
      nanos,
    },
  });
}

const client = new GrpcWebClientBase({ format: "text" });
const backendBaseUrl = process.env.REACT_APP_BACKEND_URL ?? "http://localhost:5178";

const streamTransactionsMethod = new MethodDescriptor<
  ReportRequestMessage,
  TransactionResponseMessage
>(
  "/reporting.ReportingService/StreamTransactions",
  MethodType.SERVER_STREAMING,
  ReportRequestMessage,
  TransactionResponseMessage,
  serializeReportRequest,
  deserializeTransactionResponse
);

export function streamTransactions(
  request: ReportRequest,
  handlers: {
    onData: (item: TransactionResponse) => void;
    onEnd: () => void;
    onError: (error: RpcError) => void;
  }
): ClientReadableStream<TransactionResponseMessage> {
  const stream = client.serverStreaming(
    `${backendBaseUrl}${streamTransactionsMethod.getName()}`,
    new ReportRequestMessage({
      report_id: request.reportId,
      max_items: request.maxItems,
    }),
    {},
    streamTransactionsMethod
  );

  stream.on("data", (message) => handlers.onData(message.payload));
  stream.on("end", handlers.onEnd);
  stream.on("error", handlers.onError);

  return stream;
}
