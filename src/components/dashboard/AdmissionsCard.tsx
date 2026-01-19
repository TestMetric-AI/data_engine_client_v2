import Card from "./Card";

type LinePoint = {
  label: string;
  value: number;
};

type AdmissionsCardProps = {
  data: LinePoint[];
};

export default function AdmissionsCard({ data }: AdmissionsCardProps) {
  const maxValue = Math.max(...data.map((point) => point.value));
  const points = data
    .map((point, index) => {
      const x = (index / (data.length - 1)) * 260;
      const y = 120 - (point.value / maxValue) * 100;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <Card className="col-span-2 animate-[fade-up_0.8s_ease-out]">
      <div className="flex items-center justify-between">
        <p className="font-display text-base font-semibold text-slate-900">
          Time Admitted
        </p>
        <button
          type="button"
          className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600"
        >
          Today
        </button>
      </div>
      <div className="mt-6 flex items-end gap-8">
        <div className="relative h-36 w-full">
          <svg className="h-full w-full" viewBox="0 0 260 140">
            <polyline
              fill="none"
              stroke="#fb923c"
              strokeWidth="3"
              strokeLinejoin="round"
              strokeLinecap="round"
              points={points}
            />
          </svg>
          <div className="absolute left-[46%] top-[30%] rounded-md bg-slate-900 px-2 py-1 text-xs text-white">
            113
          </div>
        </div>
      </div>
      <div className="mt-4 flex justify-between text-xs text-slate-400">
        {data.map((point) => (
          <span key={point.label}>{point.label}</span>
        ))}
      </div>
    </Card>
  );
}
