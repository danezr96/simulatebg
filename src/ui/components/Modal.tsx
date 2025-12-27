// src/ui/components/Modal.tsx
import * as React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "../../utils/format";
import { MOTION } from "../../config/motion";
import Button from "./Button";

/**
 * Modal (Japandi)
 * - Soft overlay blur
 * - Rounded sheet with subtle border
 * - Framer Motion transitions (uses motionConfig)
 *
 * Usage:
 * <Modal open={open} onOpenChange={setOpen} title="Title">
 *   ...content...
 * </Modal>
 */

export interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;

  /**
   * width presets
   */
  size?: "sm" | "md" | "lg" | "xl";
  /**
   * clicking overlay closes modal
   */
  closeOnOverlayClick?: boolean;
}

const sizeClass: Record<NonNullable<ModalProps["size"]>, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
};

function useEscapeToClose(open: boolean, onClose: () => void) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
}

export const Modal: React.FC<ModalProps> = ({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = "md",
  closeOnOverlayClick = true,
}) => {
  const onClose = React.useCallback(() => onOpenChange(false), [onOpenChange]);

  useEscapeToClose(open, onClose);

  const portalTarget =
    typeof document !== "undefined" ? document.body : (null as any);

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          className={cn(
            "fixed inset-0 z-50",
            "flex items-center justify-center p-4"
          )}
          initial="hidden"
          animate="show"
          exit="exit"
          variants={MOTION.page.variants}

          aria-modal="true"
          role="dialog"
        >
          {/* Overlay */}
          <div
            className={cn(
              "absolute inset-0",
              "bg-black/30 backdrop-blur-[2px]"
            )}
            onMouseDown={() => {
              if (closeOnOverlayClick) onClose();
            }}
          />

          {/* Panel */}
          <motion.div
            className={cn(
              "relative z-10 w-full",
              sizeClass[size],
              "max-h-[calc(100vh-2rem)]",
              "flex flex-col",
              "rounded-3xl border border-[var(--border)]",
              "bg-[var(--card)] shadow-xl"
            )}
            variants={MOTION.page.variants}

            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Header */}
            {(title || description) && (
              <div className="px-5 pt-5 pb-3 border-b border-[var(--border)] shrink-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    {title ? (
                      <h2 className="text-base font-semibold text-[var(--text)]">
                        {title}
                      </h2>
                    ) : null}
                    {description ? (
                      <p className="mt-1 text-sm text-[var(--text-muted)]">
                        {description}
                      </p>
                    ) : null}
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    aria-label="Close"
                    className="shrink-0"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            )}

            {/* Body */}
            <div className="px-5 py-4 overflow-y-auto min-h-0">{children}</div>

            {/* Footer */}
            {footer ? (
              <div className="px-5 pb-5 pt-3 border-t border-[var(--border)] shrink-0">
                {footer}
              </div>
            ) : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    portalTarget
  );
};

export default Modal;
