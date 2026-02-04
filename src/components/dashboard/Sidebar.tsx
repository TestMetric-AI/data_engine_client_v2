"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useSession } from "next-auth/react";
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
  UserPlusIcon,
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
  const { data: session } = useSession();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const isPipelinesActive = pathname.startsWith("/pipelines");

  return (
    <aside
      className={`relative flex flex-col gap-8 border-b border-border bg-card px-6 py-8 transition-all duration-300 lg:min-h-full lg:border-b-0 lg:border-r ${isCollapsed ? "lg:w-20 px-4" : "lg:w-72"
        }`}
    >
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-9 hidden h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-text-secondary shadow-sm transition hover:text-text-primary lg:flex"
      >
        {isCollapsed ? (
          <ChevronRightIcon className="h-4 w-4" />
        ) : (
          <ChevronLeftIcon className="h-4 w-4" />
        )}
      </button>

      <div className={`flex items-center gap-3 text-text-primary ${isCollapsed ? "justify-center" : ""}`}>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white">
          <CrossIcon className="h-6 w-6" />
        </div>
        {!isCollapsed && (
          <div className="whitespace-nowrap transition-opacity duration-200">
            <p className="font-display text-lg font-semibold">Data Engine</p>
            <p className="text-xs text-text-secondary">Analitica</p>
          </div>
        )}
      </div>

      <nav className="flex flex-col gap-2 text-sm font-medium text-text-secondary">
        <div
          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${isPipelinesActive
            ? "bg-primary text-white shadow-sm"
            : "text-text-secondary"
            } ${isCollapsed ? "justify-center px-2" : ""}`}
        >
          <ChartIcon className="h-5 w-5 shrink-0" />
          {!isCollapsed && <span>Pipelines</span>}
        </div>

        {!isCollapsed && (
          <>
            <Link
              href="/pipelines/deposits"
              className={`ml-8 rounded-xl px-3 py-2 text-xs font-semibold transition hover:bg-surface ${pathname === "/pipelines/deposits"
                ? "bg-surface text-text-primary"
                : "text-text-secondary"
                }`}
            >
              Deposits
            </Link>
            <Link
              href="/pipelines/client_exonerated"
              className={`ml-8 rounded-xl px-3 py-2 text-xs font-semibold transition hover:bg-surface ${pathname === "/pipelines/client_exonerated"
                ? "bg-surface text-text-primary"
                : "text-text-secondary"
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
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-surface ${isCollapsed ? "justify-center px-2" : ""
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
                    className={`ml-8 rounded-xl px-3 py-2 text-xs font-semibold transition hover:bg-surface ${pathname === subItem.href
                      ? "bg-surface text-text-primary"
                      : "text-text-secondary"
                      }`}
                  >
                    {subItem.label}
                  </Link>
                ))}
            </div>
          );
        })}
        {/* Admin Links */}
        {session?.user?.roles?.includes("ADMIN") && (
          <>
            <Link
              href="/admin/users/register"
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-surface ${pathname === "/admin/users/register"
                ? "bg-surface text-text-primary"
                : "text-text-secondary"
                } ${isCollapsed ? "justify-center px-2" : ""}`}
            >
              <UserPlusIcon className="h-5 w-5 shrink-0" />
              {!isCollapsed && <span>Register User</span>}
            </Link>

            <Link
              href="/admin/roles"
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-surface ${pathname === "/admin/roles"
                ? "bg-surface text-text-primary"
                : "text-text-secondary"
                } ${isCollapsed ? "justify-center px-2" : ""}`}
            >
              <ShieldIcon className="h-5 w-5 shrink-0" />
              {!isCollapsed && <span>Roles</span>}
            </Link>
          </>
        )}
      </nav>
    </aside >
  );
}
