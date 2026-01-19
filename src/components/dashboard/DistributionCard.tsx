import Card from "./Card";

type DistributionCardProps = {
  title: string;
  primaryLabel: string;
  secondaryLabel: string;
  primaryPercent: number;
};

export default function DistributionCard({
  title,
  primaryLabel,
  secondaryLabel,
  primaryPercent,
}: DistributionCardProps) {
  return (
    <Card className="flex flex-col items-center gap-6 animate-[fade-up_0.7s_ease-out]">
      <div className="w-full">
        <p className="font-display text-base font-semibold text-slate-900">
          {title}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Current month distribution
        </p>
      </div>
      <div
        className="relative flex h-32 w-32 items-center justify-center rounded-full"
        style={{
          background: `conic-gradient(#fb923c 0 ${primaryPercent}%, #7c3aed ${primaryPercent}% 100%)`,
        }}
      >
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white text-sm font-semibold text-slate-700">
          {primaryPercent}%
        </div>
      </div>
      <div className="flex gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-orange-400" />
          {primaryLabel}
        </span>
        <span className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-violet-600" />
          {secondaryLabel}
        </span>
      </div>
    </Card>
  );
}
