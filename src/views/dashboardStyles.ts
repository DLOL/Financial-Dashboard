import { CSSProperties } from "react";

export const styles: Record<string, any> = {
  layout: {
    page: {
      padding: "12px 16px",
      background: "#f4f3ef",
      height: "100vh",
      boxSizing: "border-box",
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
      gap: "12px",
    },
    row: {
      display: "flex",
      flexWrap: "wrap",
      gap: "20px",
      marginBottom: 0,
      minHeight: 0,
    },
    statCol: {
      flex: "1 1 200px",
      minWidth: "200px",
    },
    mainCol: {
      flex: "2 1 500px",
      minWidth: "300px",
      minHeight: 0,
    },
    sideCol: {
      flex: "1 1 260px",
      minWidth: "240px",
      minHeight: 0,
    },
  },
  card: {
    wrapper: {
      background: "#fff",
      borderRadius: "6px",
      boxShadow: "0 1px 4px rgba(0,0,0,0.14)",
      display: "flex",
      flexDirection: "column",
    },
    header: {
      padding: "16px 20px 8px",
      borderBottom: "1px solid #f0f0f0",
    },
    title: {
      margin: "0 0 4px",
      fontSize: "17px",
      fontWeight: 600,
      color: "#333",
    },
    subtitle: {
      margin: 0,
      fontSize: "12px",
      color: "#9a9a9a",
    },
    body: {
      padding: "16px 20px",
      flex: 1,
    },
    bodyNoPad: {
      padding: 0,
      flex: 1,
    },
    footer: {
      padding: "8px 20px 12px",
      borderTop: "1px solid #f0f0f0",
      fontSize: "12px",
      color: "#9a9a9a",
    },
  },
  statCard: {
    body: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "16px 20px",
    },
    iconBox: {
      width: "56px",
      height: "56px",
      borderRadius: "50%",
      background: "rgba(255,165,0,0.15)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "26px",
      flexShrink: 0,
    },
    numbersBox: {
      textAlign: "right",
      flex: 1,
      paddingLeft: "12px",
    },
    label: {
      margin: "0 0 4px",
      fontSize: "12px",
      color: "#9a9a9a",
      textTransform: "uppercase",
      letterSpacing: "0.5px",
    },
    value: {
      margin: 0,
      fontSize: "22px",
      fontWeight: 700,
      color: "#333",
      lineHeight: 1.2,
    },
  },
  txnRow: {
    base: {
      display: "flex",
      alignItems: "center",
      height: "42px",
      borderBottom: "1px solid #f0f0f0",
      padding: "0 16px",
      fontSize: "12px",
      flexShrink: 0,
    },
    even: { background: "#fff" },
    odd: { background: "#fafafa" },
  },
  txnCol: {
    id: {
      width: "28%",
      color: "#aaa",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    },
    category: { width: "20%", fontWeight: 600 },
    amount: { width: "22%", fontWeight: 600 },
    status: {
      width: "15%",
      textTransform: "uppercase",
      fontSize: "10px",
      fontWeight: 700,
    },
    time: { width: "15%", color: "#bbb" },
  },
  tableHeader: {
    row: {
      display: "flex",
      padding: "8px 16px",
      background: "#f5f5f5",
      fontWeight: 700,
      fontSize: "11px",
      textTransform: "uppercase",
      color: "#888",
      borderBottom: "2px solid #e8e8e8",
      letterSpacing: "0.5px",
    },
    id: { width: "28%" },
    category: { width: "20%" },
    amount: { width: "22%" },
    status: { width: "15%" },
    time: { width: "15%" },
  },
  listScroll: {
    height: "400px",
    overflowY: "auto",
  },
  statusBadge: {
    base: {
      display: "inline-block",
      padding: "3px 8px",
      borderRadius: "4px",
      color: "#fff",
      fontSize: "11px",
      fontWeight: 700,
      letterSpacing: "0.5px",
    },
  },
  categoryLegend: {
    container: { marginTop: "16px" },
    row: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "8px",
      fontSize: "13px",
    },
    icon: { fontSize: "10px" },
    count: { color: "#333" },
  },
  divider: {
    border: "none",
    borderTop: "1px solid #f0f0f0",
    margin: "6px 0",
  },
};

export function getAmountColor(amount: number): string {
  return amount > 5000 ? "#f5365c" : "#2dce89";
}

export function getStatusColor(status: "success" | "failed"): string {
  return status === "success" ? "#2dce89" : "#f5365c";
}
