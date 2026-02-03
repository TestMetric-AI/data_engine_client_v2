"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  CalendarIcon,
  ChartIcon,
  CrossIcon,
  FolderIcon,
  MapPinIcon,
  ShieldIcon,
  UsersIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
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
  const [isCollapsed, setIsCollapsed] = useState(false);
  const isPipelinesActive = pathname.startsWith("/pipelines");

  return (
    <aside
      className={`relative flex flex-col gap-8 border-b border-slate-100/80 bg-white/90 px-6 py-8 transition-all duration-300 lg:min-h-full lg:border-b-0 lg:border-r ${isCollapsed ? "lg:w-20 px-4" : "lg:w-72"
        }`}
    >
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-9 hidden h-6 w-6 items-center justify-center rounded-full border border-slate-100 bg-white text-slate-400 shadow-sm transition hover:text-slate-600 lg:flex"
      >
        {isCollapsed ? (
          <ChevronRightIcon className="h-4 w-4" />
        ) : (
          <ChevronLeftIcon className="h-4 w-4" />
        )}
      </button>

      <div className={`flex items-center gap-3 text-slate-900 ${isCollapsed ? "justify-center" : ""}`}>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
          <CrossIcon className="h-6 w-6" />
        </div>
        {!isCollapsed && (
          <div className="whitespace-nowrap transition-opacity duration-200">
            <p className="font-display text-lg font-semibold">ETL Pulse</p>
            <p className="text-xs text-slate-500">DuckDB analytics</p>
          </div>
        )}
      </div>

      <nav className="flex flex-col gap-2 text-sm font-medium text-slate-600">
        <div
          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${isPipelinesActive
              ? "bg-slate-900 text-white shadow-sm"
              : "text-slate-600"
            } ${isCollapsed ? "justify-center px-2" : ""}`}
        >
          <ChartIcon className="h-5 w-5 shrink-0" />
          {!isCollapsed && <span>Pipelines</span>}
        </div>

        {!isCollapsed && (
          <>
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
          </>
        )}

        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="flex flex-col gap-1">
              <button
                type="button"
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-slate-100 ${isCollapsed ? "justify-center px-2" : ""
                  }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {!isCollapsed && <span>{item.label}</span>}
              </button>
              {!isCollapsed &&
                item.subItems?.map((subItem) => (
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
    </aside>
  );
}
