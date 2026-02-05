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
  LayerIcon,
  ShieldCheckIcon,
  UserGroupIcon,
} from "./icons";

const navSections = [
  {
    category: "Overview",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayerIcon },
    ],
  },
  {
    category: "Pipelines",
    items: [
      { label: "Deposits", href: "/pipelines/deposits", icon: ChartIcon },
      { label: "Client Exonerated", href: "/pipelines/client_exonerated", icon: ChartIcon },
    ],
  },
  {
    category: "Data Catalog",
    items: [
      {
        label: "Datasets",
        icon: FolderIcon,
        subItems: [
          { label: "Deposits DP10", href: "/datasets/deposits_dp_10" },
          { label: "Deposits Query", href: "/datasets/deposits_query" },
          { label: "Client Exonerated", href: "/datasets/client_exonerated" },
        ],
      },
      { label: "Lineage", href: "/lineage", icon: MapPinIcon },
    ],
  },
  {
    category: "Management",
    items: [
      { label: "Resources", href: "/management/resources", icon: UserGroupIcon },
      { label: "Resource Roles", href: "/management/resource-roles", icon: ShieldCheckIcon },
      { label: "Projects", href: "/management/projects", icon: FolderIcon },
      { label: "Access", href: "/access", icon: ShieldIcon },
      { label: "Team", href: "/team", icon: UsersIcon },
      { label: "History", href: "/history", icon: CalendarIcon },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isCollapsed, setIsCollapsed] = useState(false);

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

      <nav className="flex flex-col gap-6 overflow-y-auto no-scrollbar">
        {navSections.map((section) => (
          <div key={section.category} className="flex flex-col gap-2">
            {!isCollapsed && (
              <p className="px-3 text-xs font-bold uppercase tracking-wider text-text-secondary/70">
                {section.category}
              </p>
            )}
            <div className="flex flex-col gap-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = item.href ? pathname === item.href : false;

                // Handle items with subitems (like Datasets)
                if (item.subItems) {
                  return (
                    <div key={item.label} className="flex flex-col gap-1">
                      <button
                        type="button"
                        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-surface text-text-secondary ${isCollapsed ? "justify-center px-2" : ""
                          }`}
                      >
                        <Icon className="h-5 w-5 shrink-0" />
                        {!isCollapsed && <span>{item.label}</span>}
                      </button>
                      {!isCollapsed &&
                        item.subItems.map((subItem) => (
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
                }

                return (
                  <Link
                    key={item.label}
                    href={item.href || "#"}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-surface ${isActive
                      ? "bg-primary text-white shadow-sm"
                      : "text-text-secondary"
                      } ${isCollapsed ? "justify-center px-2" : ""}`}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    {!isCollapsed && <span>{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

        {/* Admin Section */}
        {session?.user?.roles?.includes("ADMIN") && (
          <div className="flex flex-col gap-2">
            {!isCollapsed && (
              <p className="px-3 text-xs font-bold uppercase tracking-wider text-text-secondary/70">
                Admin
              </p>
            )}
            <div className="flex flex-col gap-1">
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
              <Link
                href="/admin/permissions"
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-surface ${pathname === "/admin/permissions"
                  ? "bg-surface text-text-primary"
                  : "text-text-secondary"
                  } ${isCollapsed ? "justify-center px-2" : ""}`}
              >
                <ShieldCheckIcon className="h-5 w-5 shrink-0" />
                {!isCollapsed && <span>Permissions</span>}
              </Link>
            </div>
          </div>
        )}
      </nav>
    </aside>
  );
}
