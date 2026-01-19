import type { ReactNode } from "react";

type CardProps = {
  children: ReactNode;
  className?: string;
};

export default function Card({ children, className }: CardProps) {
  return (
    <div
      className={`rounded-2xl border border-slate-100/80 bg-white/90 p-6 shadow-sm shadow-slate-200/40 backdrop-blur ${className ?? ""}`}
    >
      {children}
    </div>
  );
}
