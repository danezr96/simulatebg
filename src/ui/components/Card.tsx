// src/ui/components/Card.tsx
import * as React from "react";
import { cn } from "../../utils/format";

/**
 * Card – container
 * - Soft surfaces
 * - Subtle borders
 * - Composable sections (Header / Content / Footer)
 */

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
}

export function Card({ className, interactive, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-[var(--border)] bg-[var(--card)]",
        interactive ? "cursor-pointer hover:bg-[var(--card-2)]" : "",
        className
      )}
      {...props}
    />
  );
}

export interface CardSectionProps extends React.HTMLAttributes<HTMLDivElement> {}

export function CardHeader({ className, ...props }: CardSectionProps) {
  return <div className={cn("px-5 pt-5", className)} {...props} />;
}

export function CardContent({ className, ...props }: CardSectionProps) {
  return <div className={cn("px-5 pb-5", className)} {...props} />;
}

export function CardFooter({ className, ...props }: CardSectionProps) {
  return <div className={cn("px-5 pb-5", className)} {...props} />;
}

// Optional default export to keep old imports working:
//   import Card from "../components/Card";
export default Card;
