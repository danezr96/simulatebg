import * as React from "react";

import { cn } from "../../../utils/format";

export type BottomSheetProps = {
  open: boolean;
  title?: string;
  onClose?: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export function BottomSheet({ open, title, onClose, children, footer }: BottomSheetProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        role="presentation"
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-t-3xl border border-[var(--border)] bg-[var(--card)]",
          "shadow-2xl"
        )}
      >
        <div className="flex items-center justify-between px-5 pt-4">
          <div className="text-sm font-semibold text-[var(--text)]">{title}</div>
          <button
            className="text-xs text-[var(--text-muted)]"
            type="button"
            onClick={onClose}
          >
            Close
          </button>
        </div>
        <div className="min-h-0 overflow-y-auto px-5 pb-5 pt-3">{children}</div>
        {footer ? <div className="border-t border-[var(--border)] px-5 py-4">{footer}</div> : null}
      </div>
    </div>
  );
}

export default BottomSheet;
