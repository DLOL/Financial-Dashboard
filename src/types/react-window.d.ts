declare module "react-window" {
  import * as React from "react";

  export interface RowProps<T = any> {
    index: number;
    style: React.CSSProperties;
    ariaAttributes?: Record<string, any>;
    [key: string]: any;
  }

  export interface ListProps {
    rowCount: number;
    rowHeight: number | { getRowHeight: (index: number) => number; getAverageRowHeight: () => number };
    rowComponent: React.ComponentType<any>;
    rowProps?: Record<string, any>;
    height?: number | string;
    width?: number | string;
    style?: React.CSSProperties;
    className?: string;
    defaultHeight?: number;
    overscanCount?: number;
    children?: React.ReactNode;
  }

  export const List: React.ComponentType<ListProps>;
}
