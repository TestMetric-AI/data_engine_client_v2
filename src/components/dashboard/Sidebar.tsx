"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useCan } from "@/hooks/useCan";
import { Permission } from "@/lib/rbac/permissions";
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
  ChevronDownIcon,
  UserPlusIcon,
  LayerIcon,
  ShieldCheckIcon,
  UserGroupIcon,
} from "./icons";

interface NavItem {
  label: string;
  icon: any;
  href?: string;
  subItems?: { label: string; href: string }[];
}

interface NavSection {
  category: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    category: "Overview",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayerIcon },
    ],
  },
  {
    category: "Pipelines",
    items: [
      {
        label: "Deposits",
        icon: ChartIcon,
        subItems: [
          { label: "General", href: "/pipelines/deposits" },
          { label: "Locked", href: "/pipelines/deposits-locked" },
          { label: "TrxLog", href: "/pipelines/deposits-trxlog" },
          { label: "Interest Change", href: "/pipelines/deposits-interest-change" },
          { label: "Activity", href: "/pipelines/deposit-activity" },
        ]
      },
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
          { label: "Deposits Locked", href: "/datasets/deposits_locked" },
          { label: "Deposits TrxLog", href: "/datasets/deposits_trxlog" },
          { label: "Interest Change", href: "/datasets/deposits_interest_change" },
          { label: "Deposit Activity", href: "/datasets/deposit_activity" },
          { label: "Deposits Query", href: "/datasets/deposits_query" },
          { label: "Client Exonerated", href: "/datasets/client_exonerated" },
        ],
      },
    ],
  },
  {
    category: "Management",
    items: [
      { label: "Resources", href: "/management/resources", icon: UserGroupIcon },
      { label: "Resource Roles", href: "/management/resource-roles", icon: ShieldCheckIcon },
      { label: "Projects", href: "/management/projects", icon: FolderIcon },
      { label: "Tasks", href: "/management/tasks", icon: CalendarIcon }
    ],
  },
];

const SidebarItem = ({ item, isCollapsed, pathname }: { item: NavItem, isCollapsed: boolean, pathname: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  const Icon = item.icon;
  const isActive = item.href ? pathname === item.href : false;
  const isParentActive = item.subItems?.some(sub => pathname === sub.href);

  // Initialize state based on active route
  useEffect(() => {
    if (isParentActive) {
      setIsOpen(true);
    }
  }, [isParentActive]);

  if (item.subItems) {
    return (
      <div className="flex flex-col gap-1">
        <button
          onClick={() => !isCollapsed && setIsOpen(!isOpen)}
          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-surface ${isParentActive ? "text-text-primary font-medium" : "text-text-secondary"
            } ${isCollapsed ? "justify-center px-2" : "justify-between"}`}
        >
          <div className="flex items-center gap-3">
            <Icon className={`h-5 w-5 shrink-0 ${isParentActive ? "text-primary" : ""}`} />
            {!isCollapsed && <span>{item.label}</span>}
          </div>
          {!isCollapsed && (
            isOpen ? <ChevronDownIcon className="h-4 w-4 text-text-secondary" /> : <ChevronRightIcon className="h-4 w-4 text-text-secondary" />
          )}
        </button>

        {/* Submenu */}
        <div className={`flex flex-col gap-1 overflow-hidden transition-all duration-300 ${isOpen && !isCollapsed ? "max-h-96 opacity-100" : "max-h-0 opacity-0"}`}>
          {item.subItems.map((subItem) => (
            <Link
              key={subItem.href}
              href={subItem.href}
              className={`ml-11 rounded-xl px-3 py-2 text-xs font-semibold transition hover:bg-surface ${pathname === subItem.href
                  ? "bg-surface text-text-primary"
                  : "text-text-secondary"
                }`}
            >
              {subItem.label}
            </Link>
          ))}
        </div>
      </div>
    );
  }

  return (
    <Link
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
};

export default function Sidebar() {
  const pathname = usePathname();
  const { can: userCan } = useCan();
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
              {section.items.map((item) => (
                <SidebarItem
                  key={item.label}
                  item={item}
                  isCollapsed={isCollapsed}
                  pathname={pathname}
                />
              ))}
            </div>
          </div>
        ))}

        {/* Admin Section */}
        {userCan(Permission.ADMIN_USERS) && (
          <div className="flex flex-col gap-2">
            {!isCollapsed && (
              <p className="px-3 text-xs font-bold uppercase tracking-wider text-text-secondary/70">
                Admin
              </p>
            )}
            <div className="flex flex-col gap-1">
              <SidebarItem
                item={{ label: "Register User", href: "/admin/users/register", icon: UserPlusIcon }}
                isCollapsed={isCollapsed}
                pathname={pathname}
              />
              <SidebarItem
                item={{ label: "Roles", href: "/admin/roles", icon: ShieldIcon }}
                isCollapsed={isCollapsed}
                pathname={pathname}
              />
            </div>
          </div>
        )}
      </nav>
    </aside>
  );
}
