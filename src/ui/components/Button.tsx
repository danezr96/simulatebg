// src/ui/components/Button.tsx
import * as React from "react";
import { cn } from "../../utils/format";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg" | "icon";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      loading,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        className={cn(
          // Base
          "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl",
          "text-sm font-medium transition-all duration-200 select-none",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
          "disabled:pointer-events-none disabled:opacity-50",
          // Japandi feel
          "shadow-sm hover:shadow-md active:shadow-sm",
          // Subtle motion
          "active:translate-y-[1px]",
          // Sizes
          size === "sm" && "h-9 px-3",
          size === "md" && "h-10 px-4",
          size === "lg" && "h-11 px-5 text-base",
          size === "icon" && "h-10 w-10 px-0",
          // Variants
          variant === "primary" &&
            "bg-[var(--accent)] text-white hover:brightness-105 active:brightness-95 focus-visible:ring-[color:var(--accent)] focus-visible:ring-offset-[color:var(--bg)]",
          variant === "secondary" &&
            "bg-[var(--card)] text-[var(--text)] border border-[var(--border)] hover:bg-[color:var(--card-2)] focus-visible:ring-[color:var(--accent)] focus-visible:ring-offset-[color:var(--bg)]",
          variant === "ghost" &&
            "bg-transparent text-[var(--text)] hover:bg-[color:var(--card)] focus-visible:ring-[color:var(--accent)] focus-visible:ring-offset-[color:var(--bg)]",
          variant === "danger" &&
            "bg-[var(--danger)] text-white hover:brightness-105 active:brightness-95 focus-visible:ring-[color:var(--danger)] focus-visible:ring-offset-[color:var(--bg)]",
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <span className="inline-flex items-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            <span>{children}</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-2">
            {leftIcon ? <span className="inline-flex">{leftIcon}</span> : null}
            <span>{children}</span>
            {rightIcon ? <span className="inline-flex">{rightIcon}</span> : null}
          </span>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";

export default Button;
