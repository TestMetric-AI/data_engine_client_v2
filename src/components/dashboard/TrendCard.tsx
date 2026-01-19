import Card from "./Card";

type TrendPoint = {
  month: string;
  inbound: number;
  outbound: number;
};

type TrendCardProps = {
  data: TrendPoint[];
};

export default function TrendCard({ data }: TrendCardProps) {
  const maxValue = Math.max(...data.map((point) => point.inbound));
  const donutValue = 72;
  return (
    <Card className="col-span-2 animate-[fade-up_0.6s_ease-out]">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-display text-lg font-semibold text-slate-900">
            Ingestion vs. Delivery Trend
          </p>
          <p className="text-sm text-slate-500">
            Incoming files compared to API deliveries
          </p>
        </div>
        <button
          type="button"
          className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600"
        >
          Show by months
        </button>
      </div>

      <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-center">
        <div className="flex-1">
          <div className="grid h-48 grid-cols-6 items-end gap-6">
            {data.map((point) => {
              const inboundHeight = (point.inbound / maxValue) * 100;
              const outboundHeight = (point.outbound / maxValue) * 100;
              return (
                <div key={point.month} className="flex flex-col items-center gap-3">
                  <div className="flex h-36 items-end gap-2">
                    <div
                      className="w-3 rounded-full bg-emerald-400"
                      style={{ height: `${outboundHeight}%` }}
                    />
                    <div
                      className="w-3 rounded-full bg-violet-500"
                      style={{ height: `${inboundHeight}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-400">{point.month}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex items-center gap-6 text-xs text-slate-500">
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-violet-500" />
              Inbound
            </span>
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Outbound
            </span>
          </div>
        </div>

        <div className="flex w-full max-w-xs flex-col items-center gap-3 rounded-2xl bg-slate-50 p-4">
          <div
            className="relative flex h-32 w-32 items-center justify-center rounded-full"
            style={{
              background: `conic-gradient(#6d28d9 0 ${donutValue}%, #22c55e ${donutValue}% 100%)`,
            }}
          >
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white text-center text-sm font-semibold text-slate-700">
              {donutValue}%
            </div>
          </div>
          <p className="text-sm font-semibold text-slate-700">
            Delivery SLA
          </p>
          <p className="text-xs text-slate-500">
            Requests fulfilled within 30 minutes
          </p>
        </div>
      </div>
    </Card>
  );
}
