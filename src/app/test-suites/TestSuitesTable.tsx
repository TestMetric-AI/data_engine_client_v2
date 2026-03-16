"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { PencilSquareIcon, TrashIcon } from "@heroicons/react/24/outline";
import type { TestSuiteRow } from "./types";
import Modal from "@/components/ui/Modal";
import { useCan } from "@/hooks/useCan";
import { Permission } from "@/lib/rbac/permissions";

const PAGE_SIZES = [10, 25, 50, 100, 200];

interface TestSuitesTableProps {
  rows: TestSuiteRow[];
  total: number;
  totalPages: number;
  currentPage: number;
  currentPageSize: number;
  testSuiteIds: string[];
  specFiles: string[];
  testIds: string[];
}

type CreateMode = "single" | "bulk";

type TestSuiteCreateInput = {
  specFile: string;
  testId: string;
  testCaseName: string;
  testCaseTags?: string[];
};

type TestSuiteUpdateInput = {
  specFile: string;
  testId: string;
  testCaseName: string;
  testCaseTags: string[];
};

function parseTagsCsv(value: string): string[] {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function normalizeCreateInput(item: TestSuiteCreateInput): TestSuiteCreateInput {
  return {
    specFile: item.specFile.trim(),
    testId: item.testId.trim(),
    testCaseName: item.testCaseName.trim(),
    testCaseTags: (item.testCaseTags ?? []).map((tag) => tag.trim()).filter(Boolean),
  };
}

function getValidationError(item: TestSuiteCreateInput): string | null {
  if (!item.specFile.trim()) return "Spec file is required.";
  if (!item.testId.trim()) return "Test ID is required.";
  if (!item.testCaseName.trim()) return "Case name is required.";
  return null;
}

function parseBulkPayload(raw: string): { payload: TestSuiteCreateInput[]; error?: string } {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    return { payload: [], error: "Bulk JSON is invalid. Please provide a valid JSON object or array." };
  }

  const items = Array.isArray(parsed) ? parsed : [parsed];
  if (items.length === 0) {
    return { payload: [], error: "Bulk JSON must include at least one record." };
  }

  const normalized: TestSuiteCreateInput[] = [];

  for (const item of items) {
    if (!item || typeof item !== "object") {
      return { payload: [], error: "Each bulk record must be an object." };
    }

    const record = item as Partial<TestSuiteCreateInput>;
    if (
      typeof record.specFile !== "string" ||
      typeof record.testId !== "string" ||
      typeof record.testCaseName !== "string"
    ) {
      return {
        payload: [],
        error: "Each record must include string values for specFile, testId, and testCaseName.",
      };
    }

    if (
      record.testCaseTags !== undefined &&
      (!Array.isArray(record.testCaseTags) || record.testCaseTags.some((tag) => typeof tag !== "string"))
    ) {
      return { payload: [], error: "testCaseTags must be an array of strings when provided." };
    }

    const normalizedRecord = normalizeCreateInput({
      specFile: record.specFile,
      testId: record.testId,
      testCaseName: record.testCaseName,
      testCaseTags: record.testCaseTags,
    });

    const validationError = getValidationError(normalizedRecord);
    if (validationError) {
      return { payload: [], error: validationError };
    }

    normalized.push(normalizedRecord);
  }

  return { payload: normalized };
}

function buildApiErrorMessage(body: unknown, fallback: string): string {
  if (body && typeof body === "object" && "message" in body && typeof body.message === "string") {
    return body.message;
  }

  return fallback;
}

export default function TestSuitesTable({
  rows,
  total,
  totalPages,
  currentPage,
  currentPageSize,
  testSuiteIds,
  specFiles,
  testIds,
}: TestSuitesTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { can: userCan, loading: permissionLoading } = useCan();

  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [showFilters, setShowFilters] = useState(false);

  const [testSuiteId, setTestSuiteId] = useState(searchParams.get("testSuiteId") || "");
  const [specFile, setSpecFile] = useState(searchParams.get("specFile") || "");
  const [testId, setTestId] = useState(searchParams.get("testId") || "");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createMode, setCreateMode] = useState<CreateMode>("single");
  const [singleForm, setSingleForm] = useState({
    specFile: "",
    testId: "",
    testCaseName: "",
    tagsCsv: "",
  });
  const [bulkJson, setBulkJson] = useState("[");
  const [createError, setCreateError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createResultMessage, setCreateResultMessage] = useState<string | null>(null);

  const [actionResultMessage, setActionResultMessage] = useState<string | null>(null);
  const [editingRow, setEditingRow] = useState<TestSuiteRow | null>(null);
  const [editForm, setEditForm] = useState<TestSuiteUpdateInput>({
    specFile: "",
    testId: "",
    testCaseName: "",
    testCaseTags: [],
  });
  const [editError, setEditError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const [deletingRow, setDeletingRow] = useState<TestSuiteRow | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const canManageTestSuites = !permissionLoading && userCan(Permission.TEST_SUITES_MANAGE);

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

  useEffect(() => {
    const timer = setTimeout(() => {
      updateURL({ search });
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  function applyFilters() {
    updateURL({ testSuiteId, specFile, testId });
  }

  function clearFilters() {
    setSearch("");
    setTestSuiteId("");
    setSpecFile("");
    setTestId("");
    router.push(pathname);
  }

  function resetCreateForm() {
    setCreateMode("single");
    setSingleForm({
      specFile: "",
      testId: "",
      testCaseName: "",
      tagsCsv: "",
    });
    setBulkJson("[");
    setCreateError(null);
    setIsSubmitting(false);
  }

  function openCreateModal() {
    resetCreateForm();
    setActionResultMessage(null);
    setIsCreateModalOpen(true);
  }

  function closeCreateModal() {
    setIsCreateModalOpen(false);
    setCreateError(null);
    setIsSubmitting(false);
  }

  async function submitCreate() {
    setCreateError(null);
    setCreateResultMessage(null);
    setActionResultMessage(null);

    let payload: TestSuiteCreateInput | TestSuiteCreateInput[];

    if (createMode === "single") {
      const normalized = normalizeCreateInput({
        specFile: singleForm.specFile,
        testId: singleForm.testId,
        testCaseName: singleForm.testCaseName,
        testCaseTags: parseTagsCsv(singleForm.tagsCsv),
      });

      const validationError = getValidationError(normalized);
      if (validationError) {
        setCreateError(validationError);
        return;
      }

      payload = normalized;
    } else {
      const parsed = parseBulkPayload(bulkJson);
      if (parsed.error) {
        setCreateError(parsed.error);
        return;
      }

      payload = parsed.payload;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/test-suites", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      const body = await response.json().catch(() => null);

      if (!response.ok) {
        setCreateError(
          buildApiErrorMessage(body, "Unable to save test suites. Please review your input and try again.")
        );
        return;
      }

      const count = typeof body?.count === "number" ? body.count : 0;
      const skipped = typeof body?.skipped === "number" ? body.skipped : 0;
      setCreateResultMessage(`Saved ${count} record(s). Skipped ${skipped} duplicate(s).`);
      closeCreateModal();
      resetCreateForm();
      router.refresh();
    } catch {
      setCreateError("Unable to save test suites. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function openEditModal(row: TestSuiteRow) {
    setActionResultMessage(null);
    setEditError(null);
    setEditForm({
      specFile: row.specFile,
      testId: row.testId,
      testCaseName: row.testCaseName,
      testCaseTags: row.testCaseTags,
    });
    setEditingRow(row);
  }

  function closeEditModal() {
    setEditingRow(null);
    setEditError(null);
    setIsUpdating(false);
  }

  async function submitEdit() {
    if (!editingRow) return;

    const normalizedPayload: TestSuiteUpdateInput = {
      specFile: editForm.specFile.trim(),
      testId: editForm.testId.trim(),
      testCaseName: editForm.testCaseName.trim(),
      testCaseTags: editForm.testCaseTags.map((tag) => tag.trim()).filter(Boolean),
    };
    const validationError = getValidationError(normalizedPayload);
    if (validationError) {
      setEditError(validationError);
      return;
    }

    setEditError(null);
    setIsUpdating(true);

    try {
      const response = await fetch(`/api/test-suites/${editingRow.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(normalizedPayload),
      });

      const body = await response.json().catch(() => null);

      if (!response.ok) {
        setEditError(buildApiErrorMessage(body, "Unable to update record. Please review your input and try again."));
        return;
      }

      closeEditModal();
      setActionResultMessage("Record updated successfully.");
      router.refresh();
    } catch {
      setEditError("Unable to update record. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  }

  function openDeleteModal(row: TestSuiteRow) {
    setActionResultMessage(null);
    setDeleteError(null);
    setDeletingRow(row);
  }

  function closeDeleteModal() {
    setDeletingRow(null);
    setDeleteError(null);
    setIsDeleting(false);
  }

  async function submitDelete() {
    if (!deletingRow) return;

    setDeleteError(null);
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/test-suites/${deletingRow.id}`, {
        method: "DELETE",
      });

      const body = await response.json().catch(() => null);

      if (!response.ok) {
        setDeleteError(buildApiErrorMessage(body, "Unable to delete record. Please try again."));
        return;
      }

      closeDeleteModal();
      setActionResultMessage("Record deleted successfully.");
      router.refresh();
    } catch {
      setDeleteError("Unable to delete record. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  }

  const hasAnyFilter = testSuiteId || specFile || testId;
  const filterCount = [testSuiteId, specFile, testId].filter(Boolean).length;

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

  const activeFilterChips = [
    testSuiteId ? `Suite: ${testSuiteId}` : null,
    specFile ? `Spec file: ${specFile}` : null,
    testId ? `Test ID: ${testId}` : null,
  ].filter(Boolean) as string[];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {createResultMessage ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {createResultMessage}
        </div>
      ) : null}

      {actionResultMessage ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {actionResultMessage}
        </div>
      ) : null}

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm shadow-border/40">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Filters</p>
            <h2 className="mt-1 font-display text-xl font-semibold text-text-primary">Search parameters</h2>
            <p className="mt-1 text-xs text-text-secondary">
              Narrow down records by suite id, spec file, and test id.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <div className="flex w-full items-center gap-2 rounded-xl border border-border bg-surface/40 px-3 py-2 sm:w-[340px]">
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-text-secondary">
                <path
                  d="M11 4a7 7 0 105.2 11.6l3.1 3.1 1.4-1.4-3.1-3.1A7 7 0 0011 4zm0 2a5 5 0 110 10 5 5 0 010-10z"
                  fill="currentColor"
                />
              </svg>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by case name, spec file, or test id..."
                className="w-full bg-transparent text-sm text-text-primary placeholder:text-text-secondary focus:outline-none"
                aria-label="Search test suites"
              />
              {search ? (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="rounded-md border border-border px-2 py-1 text-[11px] font-semibold text-text-secondary hover:border-primary hover:text-text-primary"
                >
                  Clear
                </button>
              ) : null}
            </div>
            {filterCount > 0 ? (
              <span className="rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-semibold text-text-secondary">
                {filterCount} active
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-text-secondary transition-colors hover:border-primary"
            >
              {showFilters ? "Hide filters" : "Show filters"}
            </button>
            {canManageTestSuites ? (
              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-3.5 py-2 text-xs font-semibold text-white shadow-lg shadow-primary/20 transition hover:-translate-y-0.5"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 4v16m8-8H4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Add records
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {activeFilterChips.length > 0 ? (
            activeFilterChips.map((chip) => (
              <span
                key={chip}
                className="inline-flex rounded-full border border-border bg-surface px-2.5 py-1 text-xs text-text-secondary"
              >
                {chip}
              </span>
            ))
          ) : (
            <span className="text-xs text-text-secondary">No active filters.</span>
          )}
        </div>

        {showFilters && (
          <>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <label className="flex flex-col gap-2 text-xs">
                <span className="font-semibold text-text-secondary">Suite ID</span>
                <select
                  aria-label="Suite ID"
                  value={testSuiteId}
                  onChange={(e) => setTestSuiteId(e.target.value)}
                  className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-text-primary shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">All</option>
                  {testSuiteIds.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-2 text-xs">
                <span className="font-semibold text-text-secondary">Spec file</span>
                <select
                  aria-label="Spec file"
                  value={specFile}
                  onChange={(e) => setSpecFile(e.target.value)}
                  className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-text-primary shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">All</option>
                  {specFiles.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-2 text-xs">
                <span className="font-semibold text-text-secondary">Test ID</span>
                <select
                  aria-label="Test ID"
                  value={testId}
                  onChange={(e) => setTestId(e.target.value)}
                  className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-text-primary shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">All</option>
                  {testIds.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
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
                Reset all
              </button>
              {hasAnyFilter || search ? (
                <span className="text-xs text-text-secondary">{filterCount} filter(s) active</span>
              ) : null}
            </div>
          </>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm shadow-border/40">
        <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface/40 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-text-secondary">Showing {rows.length} of {total} results.</div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-text-secondary">
              <span>Page size</span>
              <select
                value={currentPageSize}
                onChange={(e) => changePageSize(Number(e.target.value))}
                className="rounded-lg border border-border bg-card px-2 py-1 text-xs text-text-primary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                {PAGE_SIZES.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 text-xs text-text-secondary">
              <span>
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                disabled={!canPrev}
                onClick={() => goToPage(currentPage - 1)}
                className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-text-secondary disabled:cursor-not-allowed disabled:opacity-45"
              >
                Prev
              </button>
              <div className="flex items-center gap-1">
                {visiblePages.map((page) => (
                  <button
                    key={`top-${page}`}
                    type="button"
                    onClick={() => goToPage(page)}
                    className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold ${
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
                className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-text-secondary disabled:cursor-not-allowed disabled:opacity-45"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        <div className="relative mt-4">
          <div className="pointer-events-none absolute bottom-0 left-0 top-0 z-10 w-4 bg-gradient-to-r from-card to-transparent" />
          <div className="pointer-events-none absolute bottom-0 right-0 top-0 z-10 w-4 bg-gradient-to-l from-card to-transparent" />
          <div className="max-h-[65vh] overflow-auto rounded-xl border border-border">
            <table className="w-full min-w-[1000px] border-collapse text-left text-sm">
              <thead className="sticky top-0 z-20 border-b border-border bg-card text-xs uppercase text-text-secondary">
                <tr>
                  <th className="whitespace-nowrap px-4 py-3.5">Suite ID</th>
                  <th className="whitespace-nowrap px-4 py-3.5">Test ID</th>
                  <th className="whitespace-nowrap px-4 py-3.5">Case name</th>
                  <th className="whitespace-nowrap px-4 py-3.5">Spec file</th>
                  <th className="whitespace-nowrap px-4 py-3.5">Tags</th>
                  <th className="whitespace-nowrap px-4 py-3.5 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12">
                      <div className="flex flex-col items-center justify-center gap-3 text-center">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-text-secondary">
                          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                            <path d="M10 4a6 6 0 104.472 9.999l3.764 3.765 1.414-1.414-3.765-3.764A6 6 0 0010 4zm0 2a4 4 0 110 8 4 4 0 010-8z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-text-primary">No test suites found.</p>
                          <p className="mt-1 text-xs text-text-secondary">Try adjusting filters or search terms.</p>
                        </div>
                        {hasAnyFilter || search ? (
                          <button
                            type="button"
                            onClick={clearFilters}
                            className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-text-secondary hover:border-primary"
                          >
                            Reset all filters
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ) : (
                  rows.map((row, index) => (
                    <tr
                      key={row.id}
                      className={`border-b border-border text-text-secondary transition-colors hover:bg-surface/50 ${
                        index % 2 === 0 ? "bg-card" : "bg-surface/20"
                      }`}
                    >
                      <td className="whitespace-nowrap px-4 py-3.5 font-medium text-text-primary">{row.testSuiteId}</td>
                      <td className="whitespace-nowrap px-4 py-3.5">{row.testId}</td>
                      <td className="max-w-[350px] truncate whitespace-nowrap px-4 py-3.5" title={row.testCaseName}>
                        {row.testCaseName}
                      </td>
                      <td className="max-w-[300px] truncate whitespace-nowrap px-4 py-3.5" title={row.specFile}>
                        {row.specFile}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5">
                        {row.testCaseTags.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {row.testCaseTags.slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                className="inline-flex rounded-full border border-border bg-surface px-2 py-0.5 text-xs text-text-secondary"
                              >
                                {tag}
                              </span>
                            ))}
                            {row.testCaseTags.length > 3 ? (
                              <span className="text-xs text-text-secondary">+{row.testCaseTags.length - 3}</span>
                            ) : null}
                          </div>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-right">
                        {canManageTestSuites ? (
                          <div className="flex justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => openEditModal(row)}
                              title="Edit record"
                              aria-label={`Edit ${row.testCaseName}`}
                              className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-surface hover:text-primary"
                            >
                              <PencilSquareIcon className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => openDeleteModal(row)}
                              title="Delete record"
                              aria-label={`Delete ${row.testCaseName}`}
                              className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-rose-50 hover:text-rose-600"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-text-secondary">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3 text-xs text-text-secondary">
          <span>Total {total} results</span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={!canPrev}
              onClick={() => goToPage(currentPage - 1)}
              className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-text-secondary disabled:cursor-not-allowed disabled:opacity-45"
            >
              Prev
            </button>
            {visiblePages.map((page) => (
              <button
                key={`bottom-${page}`}
                type="button"
                onClick={() => goToPage(page)}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold ${
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
              className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-text-secondary disabled:cursor-not-allowed disabled:opacity-45"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <Modal isOpen={isCreateModalOpen} onClose={closeCreateModal} title="Add Test Suite Records">
        <div className="space-y-4">
          <div className="inline-flex rounded-xl border border-border bg-surface p-1">
            <button
              type="button"
              onClick={() => {
                setCreateMode("single");
                setCreateError(null);
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                createMode === "single" ? "bg-card text-text-primary" : "text-text-secondary"
              }`}
            >
              Single row
            </button>
            <button
              type="button"
              onClick={() => {
                setCreateMode("bulk");
                setCreateError(null);
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                createMode === "bulk" ? "bg-card text-text-primary" : "text-text-secondary"
              }`}
            >
              Bulk JSON
            </button>
          </div>

          {createMode === "single" ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-xs text-text-secondary">
                <span className="font-semibold">Spec file</span>
                <input
                  value={singleForm.specFile}
                  onChange={(e) => setSingleForm((prev) => ({ ...prev, specFile: e.target.value }))}
                  className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-text-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="tests/a.spec.ts"
                  aria-label="Create Spec file"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-text-secondary">
                <span className="font-semibold">Test ID</span>
                <input
                  value={singleForm.testId}
                  onChange={(e) => setSingleForm((prev) => ({ ...prev, testId: e.target.value }))}
                  className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-text-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="test-id-001"
                  aria-label="Create Test ID"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-text-secondary sm:col-span-2">
                <span className="font-semibold">Case name</span>
                <input
                  value={singleForm.testCaseName}
                  onChange={(e) => setSingleForm((prev) => ({ ...prev, testCaseName: e.target.value }))}
                  className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-text-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="should return 200"
                  aria-label="Create Case name"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-text-secondary sm:col-span-2">
                <span className="font-semibold">Tags (CSV)</span>
                <input
                  value={singleForm.tagsCsv}
                  onChange={(e) => setSingleForm((prev) => ({ ...prev, tagsCsv: e.target.value }))}
                  className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-text-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="smoke,regression"
                  aria-label="Create Tags"
                />
              </label>
            </div>
          ) : (
            <label className="flex flex-col gap-1 text-xs text-text-secondary">
              <span className="font-semibold">Bulk payload (JSON)</span>
              <textarea
                value={bulkJson}
                onChange={(e) => setBulkJson(e.target.value)}
                className="min-h-56 rounded-xl border border-border bg-card px-3 py-2 font-mono text-xs text-text-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder='[{"specFile":"tests/a.spec.ts","testId":"t-1","testCaseName":"case 1","testCaseTags":["smoke"]}]'
                aria-label="Bulk JSON"
              />
            </label>
          )}

          {createError ? <p className="text-sm text-rose-600">{createError}</p> : null}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={closeCreateModal}
              className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-text-secondary hover:border-primary"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submitCreate}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : "Save records"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!editingRow} onClose={closeEditModal} title="Edit Test Suite Record">
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs text-text-secondary">
              <span className="font-semibold">Suite ID</span>
              <input
                value={editingRow?.testSuiteId ?? ""}
                readOnly
                disabled
                className="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-secondary outline-none disabled:cursor-not-allowed"
                aria-label="Suite ID"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-text-secondary">
              <span className="font-semibold">Spec file</span>
              <input
                value={editForm.specFile}
                onChange={(e) => setEditForm((prev) => ({ ...prev, specFile: e.target.value }))}
                className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-text-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                aria-label="Edit Spec file"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-text-secondary">
              <span className="font-semibold">Test ID</span>
              <input
                value={editForm.testId}
                onChange={(e) => setEditForm((prev) => ({ ...prev, testId: e.target.value }))}
                className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-text-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                aria-label="Edit Test ID"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-text-secondary sm:col-span-2">
              <span className="font-semibold">Case name</span>
              <input
                value={editForm.testCaseName}
                onChange={(e) => setEditForm((prev) => ({ ...prev, testCaseName: e.target.value }))}
                className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-text-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                aria-label="Edit Case name"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-text-secondary sm:col-span-2">
              <span className="font-semibold">Tags (CSV)</span>
              <input
                value={editForm.testCaseTags.join(",")}
                onChange={(e) => setEditForm((prev) => ({ ...prev, testCaseTags: parseTagsCsv(e.target.value) }))}
                className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-text-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                aria-label="Edit Tags"
              />
            </label>
          </div>

          {editError ? <p className="text-sm text-rose-600">{editError}</p> : null}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={closeEditModal}
              className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-text-secondary hover:border-primary"
              disabled={isUpdating}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submitEdit}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isUpdating}
            >
              {isUpdating ? "Saving..." : "Save changes"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!deletingRow} onClose={closeDeleteModal} title="Delete Test Suite Record">
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            Are you sure you want to delete <strong>{deletingRow?.testCaseName}</strong>? This action cannot be
            undone.
          </p>

          {deleteError ? <p className="text-sm text-rose-600">{deleteError}</p> : null}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={closeDeleteModal}
              className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-text-secondary hover:border-primary"
              disabled={isDeleting}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submitDelete}
              className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}









