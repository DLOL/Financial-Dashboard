import React, { useMemo } from "react";
import ChartistGraph from "react-chartist";
import { useSelector } from "react-redux";
import { List } from "react-window";
import { useTransactionStream } from "../hooks/useTransactionStream";
import { styles, getAmountColor, getStatusColor } from "./dashboardStyles";
import { RootState } from "../store/transactionStore";
import {
  StreamStatus,
  Transaction,
  TransactionCategory,
} from "../store/transactionTypes";

const CATEGORIES: TransactionCategory[] = [
  "Payment",
  "Refund",
  "Transfer",
  "Deposit",
  "Withdrawal",
];

const CATEGORY_COLORS: Record<TransactionCategory, string> = {
  Payment: "#1d8cf8",
  Refund: "#ffd8f0",
  Transfer: "#fb6340",
  Deposit: "#2dce89",
  Withdrawal: "#11cdef",
};

const STATUS_CONFIG: Record<
  StreamStatus,
  { color: string; label: string; icon: string }
> = {
  connecting: {
    color: "#adb5bd",
    label: "CONNECTING...",
    icon: "fas fa-sync fa-spin",
  },
  live: { color: "#2dce89", label: "LIVE", icon: "fas fa-circle" },
  cached: {
    color: "#fb6340",
    label: "CACHED VIEW",
    icon: "fas fa-database",
  },
  reconnecting: {
    color: "#f5365c",
    label: "RECONNECTING...",
    icon: "fas fa-sync fa-spin",
  },
};

const sx = styles as any;

function formatRM(amount: number, fractionDigits = 2): string {
  return `RM ${amount.toLocaleString(undefined, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })}`;
}

interface TransactionRowProps {
  index: number;
  style: React.CSSProperties;
  transactions: Transaction[];
}

/**
 * Virtualized Row Renderer for react-window to handle 10,000+ entries without DOM lag.
 */
function TransactionRow({ index, style, transactions }: TransactionRowProps) {
  const txn = transactions ? transactions[index] : null;
  if (!txn) return null;

  const time = new Date(txn.timestamp).toLocaleTimeString();
  const combinedStyle = {
    ...style,
    ...sx.txnRow.base,
    ...(index % 2 === 0 ? sx.txnRow.even : sx.txnRow.odd),
  };

  return (
    <div style={combinedStyle}>
      <span style={sx.txnCol.id}>{txn.id}</span>
      <span style={{ ...sx.txnCol.category, color: CATEGORY_COLORS[txn.category] }}>
        {txn.category}
      </span>
      <span style={{ ...sx.txnCol.amount, color: getAmountColor(txn.amount) }}>
        {formatRM(txn.amount, 2)}
      </span>
      <span style={{ ...sx.txnCol.status, color: getStatusColor(txn.status) }}>
        {txn.status}
      </span>
      <span style={sx.txnCol.time}>{time}</span>
    </div>
  );
}

interface StatCardProps {
  icon: string;
  iconColor: string;
  label: string;
  value: React.ReactNode;
  footerIcon: string;
  footerText: string;
}

function StatCard({
  icon,
  iconColor,
  label,
  value,
  footerIcon,
  footerText,
}: StatCardProps) {
  return (
    <div style={sx.card.wrapper}>
      <div style={sx.statCard.body}>
        <div style={sx.statCard.iconBox}>
          <i className={icon} style={{ color: iconColor }}></i>
        </div>
        <div style={sx.statCard.numbersBox}>
          <p style={sx.statCard.label}>{label}</p>
          <p style={sx.statCard.value}>{value}</p>
        </div>
      </div>
      <div style={sx.card.footer}>
        <hr style={sx.divider} />
        <i className={footerIcon} style={{ marginRight: 4 }}></i>
        {footerText}
      </div>
    </div>
  );
}

export default function Dashboard() {
  useTransactionStream();

  const { list: transactions, streamStatus, totalCount } = useSelector(
    (state: RootState) => state.transactions
  );

  const { totalRevenue, avgTransaction } = useMemo(() => {
    let revenue = 0;
    let successCount = 0;
    for (const t of transactions) {
      if (t.status === "success") {
        revenue += t.amount;
        successCount += 1;
      }
    }
    return {
      totalRevenue: revenue,
      avgTransaction: successCount > 0 ? revenue / successCount : 0,
    };
  }, [transactions]);

  const categoryData = useMemo(() => {
    const counts = Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Record<
      TransactionCategory,
      number
    >;
    for (const t of transactions) {
      counts[t.category] += 1;
    }

    return {
      labels: CATEGORIES,
      series: CATEGORIES.map((c) => counts[c]),
    };
  }, [transactions]);

  const statusCfg = STATUS_CONFIG[streamStatus] || STATUS_CONFIG.connecting;

  return (
    <div style={sx.layout.page}>
      <div style={sx.layout.row}>
        <div style={sx.layout.statCol}>
          <StatCard
            icon="fas fa-money-bill-wave"
            iconColor="#2dce89"
            label="Total Revenue"
            value={formatRM(totalRevenue, 0)}
            footerIcon="fas fa-chart-line"
            footerText="Live stream total"
          />
        </div>
        <div style={sx.layout.statCol}>
          <StatCard
            icon="fas fa-calculator"
            iconColor="#fb6340"
            label="Avg Transaction"
            value={formatRM(avgTransaction, 2)}
            footerIcon="fas fa-check-circle"
            footerText="Per successful txn"
          />
        </div>
        <div style={sx.layout.statCol}>
          <StatCard
            icon="fas fa-stream"
            iconColor="#1d8cf8"
            label="Total Received"
            value={totalCount.toLocaleString()}
            footerIcon="fas fa-bolt"
            footerText="~100 txn/sec stream"
          />
        </div>
        <div style={sx.layout.statCol}>
          <div style={sx.card.wrapper}>
            <div style={sx.statCard.body}>
              <div style={sx.statCard.iconBox}>
                <i className="fas fa-server" style={{ color: statusCfg.color }}></i>
              </div>
              <div style={sx.statCard.numbersBox}>
                <p style={sx.statCard.label}>Stream Status</p>
                <p style={sx.statCard.value}>
                  <span
                    style={{ ...sx.statusBadge.base, background: statusCfg.color }}
                  >
                    <i className={statusCfg.icon} style={{ marginRight: 4 }}></i>
                    {statusCfg.label}
                  </span>
                </p>
              </div>
            </div>
            <div style={sx.card.footer}>
              <hr style={sx.divider} />
              <i className="fas fa-plug" style={{ marginRight: 4 }}></i>
              gRPC-Web stream · packets: {totalCount.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      <div style={sx.layout.row}>
        <div style={sx.layout.mainCol}>
          <div style={sx.card.wrapper}>
            <div style={sx.card.header}>
              <h4 style={sx.card.title}>Live Transactions</h4>
              <p style={sx.card.subtitle}>
                Showing latest {transactions.length.toLocaleString()} of{" "}
                {totalCount.toLocaleString()} - virtualized react-window list (500ms buffer)
              </p>
            </div>
            <div style={sx.card.bodyNoPad}>
              <div style={sx.tableHeader.row}>
                <span style={sx.tableHeader.id}>Transaction ID</span>
                <span style={sx.tableHeader.category}>Category</span>
                <span style={sx.tableHeader.amount}>Amount</span>
                <span style={sx.tableHeader.status}>Status</span>
                <span style={sx.tableHeader.time}>Time</span>
              </div>
              <List
                style={{ height: 400 }}
                rowCount={transactions.length}
                rowHeight={42}
                rowComponent={TransactionRow}
                rowProps={{ transactions }}
              />
            </div>
            <div style={sx.card.footer}>
              <hr style={sx.divider} />
              <i className="fas fa-bolt" style={{ marginRight: 4 }}></i>
              react-window Virtualized List - handles 10,000+ entries without DOM lag
            </div>
          </div>
        </div>

        <div style={sx.layout.sideCol}>
          <div style={sx.card.wrapper}>
            <div style={sx.card.header}>
              <h4 style={sx.card.title}>By Category</h4>
              <p style={sx.card.subtitle}>Transaction volume distribution</p>
            </div>
            <div style={sx.card.body}>
              <div>
                <style>
                  {`
                    .category-chart .ct-series-a .ct-slice-donut,
                    .category-chart .ct-series-a .ct-slice-pie {
                      stroke: ${CATEGORY_COLORS.Payment};
                    }
                    .category-chart .ct-series-b .ct-slice-donut,
                    .category-chart .ct-series-b .ct-slice-pie {
                      stroke: ${CATEGORY_COLORS.Refund};
                    }
                    .category-chart .ct-series-c .ct-slice-donut,
                    .category-chart .ct-series-c .ct-slice-pie {
                      stroke: ${CATEGORY_COLORS.Transfer};
                    }
                    .category-chart .ct-series-d .ct-slice-donut,
                    .category-chart .ct-series-d .ct-slice-pie {
                      stroke: ${CATEGORY_COLORS.Deposit};
                    }
                    .category-chart .ct-series-e .ct-slice-donut,
                    .category-chart .ct-series-e .ct-slice-pie {
                      stroke: ${CATEGORY_COLORS.Withdrawal};
                    }
                  `}
                </style>
                <div className="category-chart">
                  <ChartistGraph
                    data={categoryData}
                    type="Pie"
                    options={{
                      height: "200px",
                      donut: true,
                      donutWidth: 35,
                      showLabel: false,
                    }}
                  />
                </div>
              </div>
              <div style={sx.categoryLegend.container}>
                {CATEGORIES.map((cat, i) => (
                  <div key={cat} style={sx.categoryLegend.row}>
                    <span>
                      <i
                        className="fas fa-circle"
                        style={{
                          ...sx.categoryLegend.icon,
                          color: CATEGORY_COLORS[cat],
                          marginRight: 8,
                        }}
                      ></i>
                      {cat}
                    </span>
                    <strong style={sx.categoryLegend.count}>
                      {categoryData.series[i].toLocaleString()}
                    </strong>
                  </div>
                ))}
              </div>
            </div>
            <div style={sx.card.footer}>
              <hr style={sx.divider} />
              <i className="fas fa-sync-alt" style={{ marginRight: 4 }}></i>
              Updates every 500ms
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
