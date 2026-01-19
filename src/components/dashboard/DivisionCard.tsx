import Card from "./Card";

type Division = {
  name: string;
  value: number;
};

type DivisionCardProps = {
  divisions: Division[];
};

export default function DivisionCard({ divisions }: DivisionCardProps) {
  return (
    <Card className="animate-[fade-up_0.85s_ease-out]">
      <div className="flex items-center justify-between">
        <p className="font-display text-base font-semibold text-slate-900">
          Pipelines by Division
        </p>
        <button type="button" className="text-xs font-semibold text-slate-500">
          View
        </button>
      </div>
      <div className="mt-6 flex flex-col gap-4">
        {divisions.map((division) => (
          <div
            key={division.name}
            className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600"
          >
            <span>{division.name}</span>
            <span className="font-semibold text-slate-800">
              {division.value}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
