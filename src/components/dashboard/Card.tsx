import type { ReactNode } from "react";

type CardProps = {
  children: ReactNode;
  className?: string;
};

export default function Card({ children, className }: CardProps) {
  return (
    <div
      className={`rounded-2xl border border-border bg-card p-6 shadow-sm shadow-border/40 backdrop-blur ${className ?? ""}`}
    >
      {children}
    </div>
  );
}
