"use client";

import { triggerLegalEnrichmentAction } from "./actions";
import Modal from "@/components/ui/Modal";

import { useEffect, useMemo, useState } from "react";

type Pagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

type DepositRow = {
  ID_CUSTOMER?: string;
  FECHA_EFECTIVA?: string;
  MONTO_DEPOSITO?: string | number;
  FECHA_VENCIMIENTO?: string;
  TIENE_SOLICITUD_EXONERACION?: string;
  LEGAL_ID?: string;
};

type DepositsResponse = {
  data: DepositRow[];
  pagination: Pagination;
};

const pageSizes = [10, 25, 50, 100, 200, 500];

export default function DepositsDatasetPage() {
  const [rows, setRows] = useState<DepositRow[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 50,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [exoneratedFilter, setExoneratedFilter] = useState<
    "ALL" | "SI" | "NO"
  >("ALL");

  const [triggering, setTriggering] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const performEnrichmentTrigger = async () => {
    setShowConfirmModal(false);
    setTriggering(true);
    try {
      const result = await triggerLegalEnrichmentAction();
      if (result.success) {
        alert("Pipeline triggered successfully!");
      } else {
        alert("Failed to trigger pipeline: " + result.message);
      }
    } catch (err) {
      alert("An error occurred.");
      console.error(err);
    } finally {
      setTriggering(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    async function loadRows() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          page: String(pagination.page),
          pageSize: String(pagination.pageSize),
        });
        const response = await fetch(`/api/deposits?${params.toString()}`);
        if (!response.ok) {
          throw new Error("No se pudo cargar el listado.");
        }
        const data = (await response.json()) as DepositsResponse;
        if (isMounted) {
          setRows(data.data ?? []);
          setPagination((prev) => ({
            ...prev,
            ...data.pagination,
          }));
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err instanceof Error ? err.message : "Error al cargar datos."
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }
    loadRows();
    return () => {
      isMounted = false;
    };
  }, [pagination.page, pagination.pageSize]);

  const filteredRows = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesSearch =
        normalized.length === 0 ||
        Object.values(row)
          .filter(Boolean)
          .some((value) =>
            String(value).toLowerCase().includes(normalized)
          );
      const matchesExonerated =
        exoneratedFilter === "ALL" ||
        (row.TIENE_SOLICITUD_EXONERACION ?? "").toUpperCase() ===
        exoneratedFilter;
      return matchesSearch && matchesExonerated;
    });
  }, [rows, search, exoneratedFilter]);

  const columns = useMemo(() => {
    const keys = new Set<string>();
    rows.forEach((row) => {
      Object.keys(row).forEach((key) => keys.add(key));
    });
    return Array.from(keys);
  }, [rows]);

  const canPrev = pagination.page > 1;
  const canNext = pagination.page < pagination.totalPages;
  const visiblePages = useMemo(() => {
    const pages: number[] = [];
    const total = pagination.totalPages;
    const start = Math.max(1, pagination.page - 2);
    const end = Math.min(total, pagination.page + 2);
    for (let i = start; i <= end; i += 1) {
      pages.push(i);
    }
    return pages;
  }, [pagination.page, pagination.totalPages]);

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-text-secondary">Datasets</p>
          <h1 className="mt-2 font-display text-3xl font-semibold text-text-primary">
            Deposits DP10
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            Listado paginado de la tabla deposits_dp10 en DuckDB.
          </p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center lg:w-auto">
          <button
            onClick={() => setShowConfirmModal(true)}
            disabled={triggering}
            className="rounded-2xl bg-primary px-4 py-2 text-xs font-semibold text-white shadow-sm disabled:opacity-50 hover:bg-primary/90 transition-colors"
          >
            {triggering ? "Triggering..." : "Trigger Legal Enrichment"}
          </button>
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-2 shadow-sm">
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-text-secondary">
              <path
                d="M11 4a7 7 0 105.2 11.6l3.1 3.1 1.4-1.4-3.1-3.1A7 7 0 0011 4zm0 2a5 5 0 110 10 5 5 0 010-10z"
                fill="currentColor"
              />
            </svg>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by id, date, amount..."
              className="w-full text-sm text-text-primary placeholder:text-text-secondary focus:outline-none bg-transparent"
              aria-label="Search deposits"
            />
          </div>
          <div className="flex items-center gap-2 rounded-2xl border border-border bg-card px-3 py-2 text-xs font-semibold text-text-secondary shadow-sm">
            <span>Exoneracion</span>
            <select
              value={exoneratedFilter}
              onChange={(event) =>
                setExoneratedFilter(event.target.value as "ALL" | "SI" | "NO")
              }
              className="bg-transparent text-xs font-semibold text-text-primary focus:outline-none"
            >
              <option value="ALL" className="bg-card text-text-primary">All</option>
              <option value="SI" className="bg-card text-text-primary">SI</option>
              <option value="NO" className="bg-card text-text-primary">NO</option>
            </select>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm shadow-border/40">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-text-secondary">
            Mostrando {filteredRows.length} de {pagination.total} registros.
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-text-secondary">
              <span>Page size</span>
              <select
                value={pagination.pageSize}
                onChange={(event) =>
                  setPagination((prev) => ({
                    ...prev,
                    page: 1,
                    pageSize: Number(event.target.value),
                  }))
                }
                className="rounded-lg border border-border bg-card px-2 py-1 text-xs text-text-primary"
              >
                {pageSizes.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 text-xs text-text-secondary">
              <span>
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                type="button"
                disabled={!canPrev}
                onClick={() =>
                  setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
                }
                className="rounded-lg border border-border bg-card px-2 py-1 text-xs font-semibold text-text-secondary disabled:opacity-50"
              >
                Prev
              </button>
              <div className="flex items-center gap-1">
                {visiblePages.map((page) => (
                  <button
                    key={page}
                    type="button"
                    onClick={() =>
                      setPagination((prev) => ({ ...prev, page }))
                    }
                    className={`rounded-lg px-2 py-1 text-xs font-semibold ${page === pagination.page
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
                onClick={() =>
                  setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
                }
                className="rounded-lg border border-border bg-card px-2 py-1 text-xs font-semibold text-text-secondary disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead className="border-b border-border text-xs uppercase text-text-secondary">
              <tr>
                {columns.map((column) => (
                  <th key={column} className="whitespace-nowrap px-3 py-3">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={Math.max(columns.length, 1)}
                    className="px-3 py-10 text-center text-sm text-text-secondary"
                  >
                    Cargando registros...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td
                    colSpan={Math.max(columns.length, 1)}
                    className="px-3 py-10 text-center text-sm text-rose-600"
                  >
                    {error}
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={Math.max(columns.length, 1)}
                    className="px-3 py-10 text-center text-sm text-text-secondary"
                  >
                    Sin resultados con los filtros actuales.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, index) => (
                  <tr
                    key={`${row.ID_CUSTOMER ?? "row"}-${index}`}
                    className="border-b border-border text-text-secondary"
                  >
                    {columns.map((column) => (
                      <td
                        key={`${column}-${index}`}
                        className="whitespace-nowrap px-3 py-3 text-text-secondary"
                      >
                        {row[column as keyof DepositRow] ?? "-"}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-text-secondary">
          <span>
            Page {pagination.page} of {pagination.totalPages} (total{" "}
            {pagination.total})
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!canPrev}
              onClick={() =>
                setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
              }
              className="rounded-lg border border-border bg-card px-3 py-1 text-xs font-semibold text-text-secondary disabled:opacity-50"
            >
              Prev
            </button>
            {visiblePages.map((page) => (
              <button
                key={`bottom-${page}`}
                type="button"
                onClick={() => setPagination((prev) => ({ ...prev, page }))}
                className={`rounded-lg px-2 py-1 text-xs font-semibold ${page === pagination.page
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
              onClick={() =>
                setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
              }
              className="rounded-lg border border-border bg-card px-3 py-1 text-xs font-semibold text-text-secondary disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="Confirm Trigger"
      >
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            Are you sure you want to trigger the legal enrichment pipeline? This process may take some time.
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setShowConfirmModal(false)}
              className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text-secondary hover:bg-surface"
            >
              Cancel
            </button>
            <button
              onClick={performEnrichmentTrigger}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90"
            >
              Confirm
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
