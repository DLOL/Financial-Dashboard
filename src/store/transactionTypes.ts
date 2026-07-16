export type StreamStatus = "connecting" | "live" | "cached" | "reconnecting";

export type TransactionCategory =
  | "Payment"
  | "Refund"
  | "Transfer"
  | "Deposit"
  | "Withdrawal";

export type TransactionStatus = "success" | "failed";

export interface Transaction {
  id: string;
  category: TransactionCategory;
  amount: number;
  timestamp: string;
  status: TransactionStatus;
}

export interface TransactionsState {
  list: Transaction[];
  streamStatus: StreamStatus;
  totalCount: number;
}
