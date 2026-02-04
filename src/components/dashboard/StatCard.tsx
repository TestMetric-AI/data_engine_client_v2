import type { ReactNode } from "react";
import Card from "./Card";

type StatCardProps = {
  title: string;
  value: string;
  delta: string;
  icon: ReactNode;
  accent: string;
};

export default function StatCard({
  title,
  value,
  delta,
  icon,
  accent,
}: StatCardProps) {
  return (
    <Card className="flex items-center justify-between gap-6">
      <div className="flex items-center gap-4">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-2xl"
          style={{ background: accent }}
        >
          {icon}
        </div>
        <div>
          <p className="text-sm text-text-secondary">{title}</p>
          <p className="font-display text-2xl font-semibold text-text-primary">
            {value}
          </p>
        </div>
      </div>
      <span className="rounded-full bg-surface px-3 py-1 text-xs font-semibold text-text-secondary">
        {delta}
      </span>
    </Card>
  );
}
