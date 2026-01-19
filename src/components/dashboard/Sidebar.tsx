import Link from "next/link";
import Card from "./Card";
import {
  CalendarIcon,
  ChartIcon,
  CrossIcon,
  FolderIcon,
  MapPinIcon,
  SettingsIcon,
  ShieldIcon,
  UsersIcon,
} from "./icons";

const navItems = [
  {
    label: "Datasets",
    icon: FolderIcon,
    subItems: [{ label: "Deposits DP10", href: "/datasets/deposits_dp_10" }],
  },
  { label: "Lineage", icon: MapPinIcon },
  { label: "Access", icon: ShieldIcon },
  { label: "Team", icon: UsersIcon },
  { label: "History", icon: CalendarIcon },
];

export default function Sidebar() {
  return (
    <aside className="flex w-full flex-col gap-8 self-stretch border-b border-slate-100/80 bg-white/90 px-6 py-8 lg:min-h-full lg:w-72 lg:border-b-0 lg:border-r">
      <div className="flex items-center gap-3 text-slate-900">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white">
          <CrossIcon className="h-6 w-6" />
        </div>
        <div>
          <p className="font-display text-lg font-semibold">ETL Pulse</p>
          <p className="text-xs text-slate-500">DuckDB analytics</p>
        </div>
      </div>

      {/* <button
        type="button"
        className="group flex items-center justify-between rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition hover:-translate-y-0.5"
      >
        New ingestion
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-lg">
          +
        </span>
      </button> */}

      <nav className="flex flex-col gap-2 text-sm font-medium text-slate-600">
        <Link
          href="/pipelines"
          className="flex items-center gap-3 rounded-xl bg-slate-900 px-3 py-2.5 text-left text-white shadow-sm transition"
        >
          <ChartIcon className="h-5 w-5" />
          Pipelines
        </Link>
        <Link
          href="/pipelines/deposits"
          className="ml-8 rounded-xl px-3 py-2 text-xs font-semibold text-slate-500 transition hover:bg-slate-100"
        >
          Deposits
        </Link>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="flex flex-col gap-1">
              <button
                type="button"
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                  item.active
                    ? "bg-slate-900 text-white shadow-sm"
                    : "hover:bg-slate-100"
                }`}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </button>
              {item.subItems?.map((subItem) => (
                <Link
                  key={subItem.href}
                  href={subItem.href}
                  className="ml-8 rounded-xl px-3 py-2 text-xs font-semibold text-slate-500 transition hover:bg-slate-100"
                >
                  {subItem.label}
                </Link>
              ))}
            </div>
          );
        })}
      </nav>

      <div className="mt-2 lg:mt-auto">
        <Card className="bg-gradient-to-br from-slate-100 via-white to-slate-50 p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">
              Mobile insights
            </p>
            <div className="h-8 w-8 rounded-full bg-white shadow">
              <div className="flex h-full w-full items-center justify-center text-slate-900">
                <SettingsIcon className="h-4 w-4" />
              </div>
            </div>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-slate-500">
            Monitor ingestion and API traffic from your phone in real time.
          </p>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              className="flex-1 rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:border-slate-300"
            >
              iOS app
            </button>
            <button
              type="button"
              className="flex-1 rounded-full bg-slate-900 px-3 py-2 text-xs font-semibold text-white"
            >
              Android
            </button>
          </div>
        </Card>
      </div>
    </aside>
  );
}
