declare module "react-chartist" {
  import * as React from "react";

  interface ChartistGraphProps {
    data: unknown;
    type: "Line" | "Bar" | "Pie";
    options?: Record<string, unknown>;
    responsiveOptions?: unknown[];
    listener?: Record<string, unknown>;
  }

  const ChartistGraph: React.ComponentType<ChartistGraphProps>;
  export default ChartistGraph;
}
