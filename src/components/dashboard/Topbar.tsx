"use client";

import { useSession, signOut } from "next-auth/react";
import { useState, useRef, useEffect } from "react";
import { BellIcon, SearchIcon, LogOutIcon } from "./icons";
import Link from "next/link";

export default function Topbar() {
  const { data: session } = useSession();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="sticky top-0 z-30 flex flex-col gap-4 border-b border-border bg-card/80 px-6 py-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-8">
      <div className="relative flex w-full max-w-md items-center gap-3 rounded-2xl bg-surface/70 px-4 py-2 text-text-secondary">
        <SearchIcon className="h-5 w-5" />
        <input
          aria-label="Search"
          className="w-full bg-transparent text-sm text-text-primary placeholder:text-text-secondary focus:outline-none"
          placeholder="Search datasets, pipelines..."
        />
      </div>
      <div className="flex items-center gap-4">
        <button
          type="button"
          className="relative flex h-10 w-10 items-center justify-center rounded-full bg-surface text-text-secondary"
        >
          <BellIcon className="h-5 w-5" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-emerald-400" />
        </button>

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-3 rounded-full bg-surface pl-2 pr-4 py-1.5 ring-1 ring-border transition hover:bg-surface hover:ring-border"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-medium text-white ring-2 ring-white">
              {session?.user?.name
                ? session.user.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2)
                : "U"}
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-text-primary">
                {session?.user?.name || "User"}
              </p>
            </div>
          </button>

          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 origin-top-right rounded-xl bg-card py-1 shadow-xl ring-1 ring-black/5 focus:outline-none z-50">
              <div className="p-1">
                <Link
                  href="/dashboard/profile"
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-text-secondary transition hover:bg-surface hover:text-text-primary"
                  onClick={() => setIsDropdownOpen(false)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                  </svg>
                  Profile
                </Link>
                <div className="my-1 h-px bg-surface" />
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-text-secondary transition hover:bg-red-50 hover:text-red-600"
                >
                  <LogOutIcon className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
