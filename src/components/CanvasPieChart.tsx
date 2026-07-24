import React, { useEffect, useRef } from "react";

interface CanvasPieChartProps {
  categoryCounts: number[];
}

const CATEGORY_COLORS = [
  "#1d8cf8", // Payment
  "#ffd8f0", // Refund
  "#fb6340", // Transfer
  "#2dce89", // Deposit
  "#11cdef", // Withdrawal
];

export function CanvasPieChart({ categoryCounts }: CanvasPieChartProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Support High-DPI screens (Retina displays) for razor-sharp rendering
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 10;

    // Clear previous drawing
    ctx.clearRect(0, 0, width, height);

    const total = categoryCounts.reduce((sum, count) => sum + count, 0);

    if (total === 0) {
      // Draw a grey circle if there is no data yet
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.fillStyle = "#e9ecef";
      ctx.fill();

      // Donut hole
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 0.6, 0, 2 * Math.PI);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      return;
    }

    let startAngle = -0.5 * Math.PI; // Start at the top (12 o'clock)

    for (let i = 0; i < categoryCounts.length; i++) {
      const count = categoryCounts[i];
      if (count === 0) continue;

      const sliceAngle = (count / total) * 2 * Math.PI;
      const endAngle = startAngle + sliceAngle;

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.fillStyle = CATEGORY_COLORS[i] || "#ccc";
      ctx.fill();

      startAngle = endAngle;
    }

    // Draw the donut hole (clearing the center back to white)
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.65, 0, 2 * Math.PI);
    ctx.fillStyle = "#ffffff";
    ctx.fill();

    // Add a thin inner border to make it look premium
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.65, 0, 2 * Math.PI);
    ctx.strokeStyle = "#f0f0f0";
    ctx.lineWidth = 1;
    ctx.stroke();

  }, [categoryCounts]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: "100%",
        height: "200px",
        display: "block",
      }}
    />
  );
}
