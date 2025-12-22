// src/ui/components/Table.tsx
import * as React from "react";
import { cn } from "../../utils/format";

/**
 * Japandi Table
 * - Clean spacing, soft borders, rounded container
 * - Optional caption + empty state
 * - Works as a simple wrapper around native <table>
 */

export interface TableProps extends React.HTMLAttributes<HTMLDivElement> {
  caption?: string;
  emptyMessage?: string;
  isEmpty?: boolean;
}

export const Table = React.forwardRef<HTMLDivElement, TableProps>(
  ({ className, caption, emptyMessage = "No data.", isEmpty, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm",
          "overflow-hidden",
          className
        )}
        {...props}
      >
        {caption ? (
          <div className="px-4 py-3 border-b border-[var(--border)]">
            <div className="text-sm font-semibold text-[var(--text)]">{caption}</div>
          </div>
        ) : null}

        <div className="w-full overflow-x-auto">
          <table className="w-full text-left text-sm">
            {children}
          </table>
        </div>

        {isEmpty ? (
          <div className="px-4 py-6 text-sm text-[var(--text-muted)]">
            {emptyMessage}
          </div>
        ) : null}
      </div>
    );
  }
);
Table.displayName = "Table";

export const THead = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead
    ref={ref}
    className={cn(
      "bg-[color:var(--card-2)] text-[var(--text-muted)]",
      "border-b border-[var(--border)]",
      className
    )}
    {...props}
  />
));
THead.displayName = "THead";

export const TBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody ref={ref} className={cn("divide-y divide-[var(--border)]", className)} {...props} />
));
TBody.displayName = "TBody";

export const TR = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement> & { interactive?: boolean }
>(({ className, interactive, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      interactive ? "hover:bg-[color:var(--card-2)] transition-colors" : "",
      className
    )}
    {...props}
  />
));
TR.displayName = "TR";

export const TH = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "px-4 py-3 text-xs font-semibold uppercase tracking-wide",
      "text-[var(--text-muted)]",
      className
    )}
    {...props}
  />
));
TH.displayName = "TH";

export const TD = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement> & { mono?: boolean }
>(({ className, mono, ...props }, ref) => (
  <td
    ref={ref}
    className={cn(
      "px-4 py-3 text-[var(--text)]",
      mono ? "tabular-nums font-medium" : "",
      className
    )}
    {...props}
  />
));
TD.displayName = "TD";

export default Table;
