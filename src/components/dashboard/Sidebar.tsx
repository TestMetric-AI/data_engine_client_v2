"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import Card from "./Card";
import {
  CalendarIcon,
  ChartIcon,
  CrossIcon,
  FolderIcon,
  LogOutIcon,
  MapPinIcon,
  SettingsIcon,
  ShieldIcon,
  UsersIcon,
} from "./icons";

const navItems = [
  {
    label: "Datasets",
    icon: FolderIcon,
    subItems: [
      { label: "Deposits DP10", href: "/datasets/deposits_dp_10" },
      { label: "Deposits Query", href: "/datasets/deposits_query" },
      { label: "Client Exonerated", href: "/datasets/client_exonerated" },
    ],
  },
  { label: "Lineage", icon: MapPinIcon },
  { label: "Access", icon: ShieldIcon },
  { label: "Team", icon: UsersIcon },
  { label: "History", icon: CalendarIcon },
];

export default function Sidebar() {
  const pathname = usePathname();
  const isPipelinesActive = pathname.startsWith("/pipelines");
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

      <nav className="flex flex-col gap-2 text-sm font-medium text-slate-600">
        <div
          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${isPipelinesActive
            ? "bg-slate-900 text-white shadow-sm"
            : "text-slate-600"
            }`}
        >
          <ChartIcon className="h-5 w-5" />
          Pipelines
        </div>
        <Link
          href="/pipelines/deposits"
          className={`ml-8 rounded-xl px-3 py-2 text-xs font-semibold transition hover:bg-slate-100 ${pathname === "/pipelines/deposits"
            ? "bg-slate-100 text-slate-900"
            : "text-slate-500"
            }`}
        >
          Deposits
        </Link>
        <Link
          href="/pipelines/client_exonerated"
          className={`ml-8 rounded-xl px-3 py-2 text-xs font-semibold transition hover:bg-slate-100 ${pathname === "/pipelines/client_exonerated"
            ? "bg-slate-100 text-slate-900"
            : "text-slate-500"
            }`}
        >
          Client Exonerated
        </Link>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="flex flex-col gap-1">
              <button
                type="button"
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-slate-100"
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </button>
              {item.subItems?.map((subItem) => (
                <Link
                  key={subItem.href}
                  href={subItem.href}
                  className={`ml-8 rounded-xl px-3 py-2 text-xs font-semibold transition hover:bg-slate-100 ${pathname === subItem.href
                    ? "bg-slate-100 text-slate-900"
                    : "text-slate-500"
                    }`}
                >
                  {subItem.label}
                </Link>
              ))}
            </div>
          );
        })}
      </nav>

      {/* <div className="mt-2 lg:mt-auto">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="mb-4 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-600 transition hover:bg-red-50 hover:text-red-600"
        >
          <LogOutIcon className="h-5 w-5" />
          Sign out
        </button>

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
      </div> */}
    </aside>
  );
}
