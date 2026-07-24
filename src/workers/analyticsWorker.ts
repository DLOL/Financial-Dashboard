/* eslint-disable no-restricted-globals */

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

const CATEGORIES: TransactionCategory[] = [
  "Payment",
  "Refund",
  "Transfer",
  "Deposit",
  "Withdrawal",
];

self.addEventListener("message", (event: MessageEvent<Transaction[]>) => {
  const transactions = event.data || [];

  let totalRevenue = 0;
  let successCount = 0;
  const counts = Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Record<
    TransactionCategory,
    number
  >;

  for (let i = 0; i < transactions.length; i++) {
    const t = transactions[i];
    if (t.status === "success") {
      totalRevenue += t.amount;
      successCount += 1;
    }
    if (counts[t.category] !== undefined) {
      counts[t.category] += 1;
    }
  }

  const avgTransaction = successCount > 0 ? totalRevenue / successCount : 0;
  const series = CATEGORIES.map((c) => counts[c]);

  self.postMessage({
    totalRevenue,
    avgTransaction,
    categoryCounts: series,
  });
});
