"use client";

import { useEffect, useMemo, useState } from "react";

type Pagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

type ClientExoneratedRow = Record<string, string | number | null>;

type ClientExoneratedResponse = {
  data: ClientExoneratedRow[];
  pagination: Pagination;
};

const pageSizes = [10, 25, 50, 100, 200, 500];

export default function ClientExoneratedPage() {
  const [rows, setRows] = useState<ClientExoneratedRow[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 100,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

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
        const response = await fetch(
          `/api/client-exonerated?${params.toString()}`
        );
        if (!response.ok) {
          throw new Error("No se pudo cargar el listado.");
        }
        const data = (await response.json()) as ClientExoneratedResponse;
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
      if (normalized.length === 0) return true;
      return Object.values(row)
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized));
    });
  }, [rows, search]);

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
          <p className="text-sm font-semibold text-slate-500">Datasets</p>
          <h1 className="mt-2 font-display text-3xl font-semibold text-slate-900">
            Client Exonerated
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Listado paginado de la tabla client_exonerated en DuckDB.
          </p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center lg:w-auto">
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-2 shadow-sm">
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-slate-400">
              <path
                d="M11 4a7 7 0 105.2 11.6l3.1 3.1 1.4-1.4-3.1-3.1A7 7 0 0011 4zm0 2a5 5 0 110 10 5 5 0 010-10z"
                fill="currentColor"
              />
            </svg>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name, id, or ref..."
              className="w-full text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
              aria-label="Search client exonerated"
            />
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-100/80 bg-white/90 p-6 shadow-sm shadow-slate-200/40">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-slate-500">
            Mostrando {filteredRows.length} de {pagination.total} registros.
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-500">
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
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700"
              >
                {pageSizes.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                type="button"
                disabled={!canPrev}
                onClick={() =>
                  setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
                }
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600 disabled:opacity-50"
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
                      ? "bg-slate-900 text-white"
                      : "border border-slate-200 bg-white text-slate-600"
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
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead className="border-b border-slate-100 text-xs uppercase text-slate-400">
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
                    className="px-3 py-10 text-center text-sm text-slate-500"
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
                    className="px-3 py-10 text-center text-sm text-slate-500"
                  >
                    Sin resultados con los filtros actuales.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, index) => (
                  <tr
                    key={`row-${index}`}
                    className="border-b border-slate-50 text-slate-600"
                  >
                    {columns.map((column) => (
                      <td
                        key={`${column}-${index}`}
                        className="whitespace-nowrap px-3 py-3 text-slate-600"
                      >
                        {row[column] ?? "-"}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
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
              className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 disabled:opacity-50"
            >
              Prev
            </button>
            {visiblePages.map((page) => (
              <button
                key={`bottom-${page}`}
                type="button"
                onClick={() => setPagination((prev) => ({ ...prev, page }))}
                className={`rounded-lg px-2 py-1 text-xs font-semibold ${page === pagination.page
                  ? "bg-slate-900 text-white"
                  : "border border-slate-200 bg-white text-slate-600"
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
              className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
