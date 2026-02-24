"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { TEST_STATUS_OPTIONS, PAGE_SIZE } from "./types";
import type { TestResultRow } from "./types";

const PAGE_SIZES = [10, 25, 50, 100, 200];

interface TestResultsTableProps {
  rows: TestResultRow[];
  total: number;
  totalPages: number;
  currentPage: number;
  currentPageSize: number;
  projects: string[];
  branches: string[];
  environments: string[];
}

const STATUS_COLORS: Record<string, string> = {
  passed: "bg-emerald-100 text-emerald-700",
  failed: "bg-rose-100 text-rose-700",
  timedOut: "bg-amber-100 text-amber-700",
  skipped: "bg-gray-100 text-gray-600",
  interrupted: "bg-orange-100 text-orange-700",
};

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export default function TestResultsTable({
  rows,
  total,
  totalPages,
  currentPage,
  currentPageSize,
  projects,
  branches,
  environments,
}: TestResultsTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [showFilters, setShowFilters] = useState(false);

  // Filter form state
  const [status, setStatus] = useState(searchParams.get("status") || "");
  const [project, setProject] = useState(searchParams.get("project") || "");
  const [branch, setBranch] = useState(searchParams.get("branch") || "");
  const [environment, setEnvironment] = useState(searchParams.get("environment") || "");
  const [dateFrom, setDateFrom] = useState(searchParams.get("dateFrom") || "");
  const [dateTo, setDateTo] = useState(searchParams.get("dateTo") || "");

  function updateURL(updates: Record<string, string>, resetPage = true) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });
    if (resetPage) {
      params.delete("page");
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  function goToPage(page: number) {
    updateURL({ page: String(page) }, false);
  }

  function changePageSize(size: number) {
    updateURL({ pageSize: String(size), page: "1" }, false);
  }

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      updateURL({ search });
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  function applyFilters() {
    updateURL({ status, project, branch, environment, dateFrom, dateTo });
  }

  function clearFilters() {
    setSearch("");
    setStatus("");
    setProject("");
    setBranch("");
    setEnvironment("");
    setDateFrom("");
    setDateTo("");
    router.push(pathname);
  }

  const hasAnyFilter = status || project || branch || environment || dateFrom || dateTo;
  const filterCount = [status, project, branch, environment, dateFrom, dateTo].filter(Boolean).length;

  const canPrev = currentPage > 1;
  const canNext = currentPage < totalPages;

  const visiblePages = useMemo(() => {
    const pages: number[] = [];
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, currentPage + 2);
    for (let i = start; i <= end; i += 1) {
      pages.push(i);
    }
    return pages;
  }, [currentPage, totalPages]);

  const filterFields: Array<{
    key: string;
    label: string;
    type: string;
    value: string;
    onChange: (v: string) => void;
    options?: { value: string; label: string }[];
  }> = [
    {
      key: "status",
      label: "Status",
      type: "select",
      value: status,
      onChange: setStatus,
      options: [{ value: "", label: "All" }, ...TEST_STATUS_OPTIONS.map((s) => ({ value: s.value, label: s.label }))],
    },
    {
      key: "project",
      label: "Project",
      type: "select",
      value: project,
      onChange: setProject,
      options: [{ value: "", label: "All" }, ...projects.map((p) => ({ value: p, label: p }))],
    },
    {
      key: "branch",
      label: "Branch",
      type: "select",
      value: branch,
      onChange: setBranch,
      options: [{ value: "", label: "All" }, ...branches.map((b) => ({ value: b, label: b }))],
    },
    {
      key: "environment",
      label: "Environment",
      type: "select",
      value: environment,
      onChange: setEnvironment,
      options: [{ value: "", label: "All" }, ...environments.map((e) => ({ value: e, label: e }))],
    },
    {
      key: "dateFrom",
      label: "Date from",
      type: "date",
      value: dateFrom,
      onChange: setDateFrom,
    },
    {
      key: "dateTo",
      label: "Date to",
      type: "date",
      value: dateTo,
      onChange: setDateTo,
    },
  ];

  const PaginationControls = ({ prefix }: { prefix: string }) => (
    <div className="flex items-center gap-2 text-xs text-text-secondary">
      <span>
        Page {currentPage} of {totalPages}
      </span>
      <button
        type="button"
        disabled={!canPrev}
        onClick={() => goToPage(currentPage - 1)}
        className="rounded-lg border border-border bg-card px-2 py-1 text-xs font-semibold text-text-secondary disabled:opacity-50"
      >
        Prev
      </button>
      <div className="flex items-center gap-1">
        {visiblePages.map((page) => (
          <button
            key={`${prefix}-${page}`}
            type="button"
            onClick={() => goToPage(page)}
            className={`rounded-lg px-2 py-1 text-xs font-semibold ${
              page === currentPage
                ? "bg-primary text-white"
                : "border border-border bg-card text-text-secondary"
            }`}
          >
            {page}
          </button>
        ))}
      </div>
      <button
        type="button"
        disabled={!canNext}
        onClick={() => goToPage(currentPage + 1)}
        className="rounded-lg border border-border bg-card px-2 py-1 text-xs font-semibold text-text-secondary disabled:opacity-50"
      >
        Next
      </button>
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl">
      {/* Page Header */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-text-secondary">Test Information</p>
          <h1 className="mt-2 font-display text-3xl font-semibold text-text-primary">
            Test Results
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            Browse and filter individual test results from CI/CD pipelines.
          </p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center lg:w-auto">
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-2 shadow-sm">
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-text-secondary">
              <path
                d="M11 4a7 7 0 105.2 11.6l3.1 3.1 1.4-1.4-3.1-3.1A7 7 0 0011 4zm0 2a5 5 0 110 10 5 5 0 010-10z"
                fill="currentColor"
              />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title or file..."
              className="w-full text-sm text-text-primary placeholder:text-text-secondary focus:outline-none bg-transparent"
              aria-label="Search test results"
            />
          </div>
        </div>
      </div>

      {/* Filter Section */}
      <div className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm shadow-border/40">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
              Filters
            </p>
            <h2 className="mt-1 font-display text-xl font-semibold text-text-primary">
              Search parameters
            </h2>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-text-secondary hover:border-primary transition-colors"
          >
            {showFilters ? "Hide filters" : "Show filters"}
          </button>
        </div>

        {showFilters && (
          <>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filterFields.map(({ key, label, type, value, onChange, options }) => (
                <label key={key} className="flex flex-col gap-2 text-xs">
                  <span className="font-semibold text-text-secondary">{label}</span>
                  {type === "select" && options ? (
                    <select
                      value={value}
                      onChange={(e) => onChange(e.target.value)}
                      className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-text-primary shadow-sm focus:border-primary focus:outline-none"
                    >
                      {options.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={type}
                      value={value}
                      onChange={(e) => onChange(e.target.value)}
                      className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-text-primary shadow-sm focus:border-primary focus:outline-none"
                    />
                  )}
                </label>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                onClick={applyFilters}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-primary/20 transition hover:-translate-y-0.5"
              >
                Apply filters
              </button>
              <button
                type="button"
                onClick={clearFilters}
                className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-text-secondary hover:border-primary"
              >
                Clear filters
              </button>
              {hasAnyFilter && (
                <span className="text-xs text-text-secondary">
                  {filterCount} filter(s) active
                </span>
              )}
            </div>
          </>
        )}
      </div>

      {/* Data Table Card */}
      <div className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm shadow-border/40">
        {/* Top pagination */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-text-secondary">
            Showing {rows.length} of {total} results.
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-text-secondary">
              <span>Page size</span>
              <select
                value={currentPageSize}
                onChange={(e) => changePageSize(Number(e.target.value))}
                className="rounded-lg border border-border bg-card px-2 py-1 text-xs text-text-primary"
              >
                {PAGE_SIZES.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>
            <PaginationControls prefix="top" />
          </div>
        </div>

        {/* Table */}
        <div className="mt-4 max-h-[65vh] overflow-auto rounded-xl border border-border">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead className="sticky top-0 z-10 border-b border-border bg-card text-xs uppercase text-text-secondary">
              <tr>
                <th className="whitespace-nowrap px-3 py-3">Test Title</th>
                <th className="whitespace-nowrap px-3 py-3">Status</th>
                <th className="whitespace-nowrap px-3 py-3">Duration</th>
                <th className="whitespace-nowrap px-3 py-3">Project</th>
                <th className="whitespace-nowrap px-3 py-3">Branch</th>
                <th className="whitespace-nowrap px-3 py-3">File</th>
                <th className="whitespace-nowrap px-3 py-3">Retries</th>
                <th className="whitespace-nowrap px-3 py-3">Environment</th>
                <th className="whitespace-nowrap px-3 py-3">Tags</th>
                <th className="whitespace-nowrap px-3 py-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="px-3 py-10 text-center text-sm text-text-secondary"
                  >
                    No test results found.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-border text-text-secondary"
                  >
                    <td className="whitespace-nowrap px-3 py-3 font-medium text-text-primary max-w-xs truncate" title={row.testTitle}>
                      {row.testTitle}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[row.testStatus] || "bg-gray-100 text-gray-600"}`}
                      >
                        {row.testStatus}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      {formatDuration(row.duration)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      {row.testProject || "-"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 max-w-[150px] truncate" title={row.branch || undefined}>
                      {row.branch || "-"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 max-w-[200px] truncate" title={row.testFile}>
                      {row.testFile}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      {row.retries}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      {row.environment || "-"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      {row.tags.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {row.tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex rounded-full bg-indigo-50 px-2 py-0.5 text-xs text-indigo-600"
                            >
                              {tag}
                            </span>
                          ))}
                          {row.tags.length > 3 && (
                            <span className="text-xs text-text-secondary">+{row.tags.length - 3}</span>
                          )}
                        </div>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      {new Date(row.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Bottom pagination */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-text-secondary">
          <span>
            Page {currentPage} of {totalPages} (total {total})
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!canPrev}
              onClick={() => goToPage(currentPage - 1)}
              className="rounded-lg border border-border bg-card px-3 py-1 text-xs font-semibold text-text-secondary disabled:opacity-50"
            >
              Prev
            </button>
            {visiblePages.map((page) => (
              <button
                key={`bottom-${page}`}
                type="button"
                onClick={() => goToPage(page)}
                className={`rounded-lg px-2 py-1 text-xs font-semibold ${
                  page === currentPage
                    ? "bg-primary text-white"
                    : "border border-border bg-card text-text-secondary"
                }`}
              >
                {page}
              </button>
            ))}
            <button
              type="button"
              disabled={!canNext}
              onClick={() => goToPage(currentPage + 1)}
              className="rounded-lg border border-border bg-card px-3 py-1 text-xs font-semibold text-text-secondary disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

