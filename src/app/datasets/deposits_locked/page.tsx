"use client";

import { useEffect, useMemo, useState } from "react";

type QueryForm = {
    ID_BLOQUEO: string;
    ID_PRODUCTO: string;
    ID_CUSTOMER: string;
    ID_TIPO_BLOQUEO: string;
    ESTADO_BLOQUEO: string;
    FECHA_INICIO_DESDE: string;
    FECHA_INICIO_HASTA: string;
};

type Pagination = {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
};

type DepositsLockedRow = {
    ID_BLOQUEO?: string;
    ID_PRODUCTO?: string;
    ID_CUSTOMER?: string;
    ID_TIPO_BLOQUEO?: string;
    DESC_TIPO_BLOQUEO?: string;
    ESTADO_BLOQUEO?: string;
    MONTO_BLOQUEO?: string | number;
    FECHA_INICIO?: string;
    FECHA_FIN?: string;
    ID_PRODUCTO_GARANTIZADO?: string;
};

type DepositsLockedResponse = {
    data: DepositsLockedRow[];
    pagination: Pagination;
};

const pageSizes = [10, 25, 50, 100, 200, 500];

const initialForm: QueryForm = {
    ID_BLOQUEO: "",
    ID_PRODUCTO: "",
    ID_CUSTOMER: "",
    ID_TIPO_BLOQUEO: "",
    ESTADO_BLOQUEO: "",
    FECHA_INICIO_DESDE: "",
    FECHA_INICIO_HASTA: "",
};

export default function DepositsLockedDatasetPage() {
    const [rows, setRows] = useState<DepositsLockedRow[]>([]);
    const [pagination, setPagination] = useState<Pagination>({
        page: 1,
        pageSize: 10,
        total: 0,
        totalPages: 1,
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [draftForm, setDraftForm] = useState<QueryForm>(initialForm);
    const [appliedForm, setAppliedForm] = useState<QueryForm>(initialForm);
    const [showFilters, setShowFilters] = useState(false);

    const filterFields: Array<{
        key: keyof QueryForm;
        label: string;
        type?: string;
    }> = [
            { key: "ID_BLOQUEO", label: "ID Bloqueo" },
            { key: "ID_PRODUCTO", label: "ID Producto" },
            { key: "ID_CUSTOMER", label: "ID Customer" },
            { key: "ID_TIPO_BLOQUEO", label: "ID Tipo Bloqueo" },
            { key: "ESTADO_BLOQUEO", label: "Estado Bloqueo" },
            {
                key: "FECHA_INICIO_DESDE",
                label: "Fecha inicio desde",
                type: "date",
            },
            {
                key: "FECHA_INICIO_HASTA",
                label: "Fecha inicio hasta",
                type: "date",
            },
        ];

    function handleFilterChange(key: keyof QueryForm, value: string) {
        setDraftForm((prev) => ({ ...prev, [key]: value }));
    }

    function clearFilters() {
        setDraftForm(initialForm);
        setAppliedForm(initialForm);
        setPagination((prev) => ({ ...prev, page: 1 }));
    }

    const hasAnyFilter = Object.values(draftForm).some((value) => value.trim() !== "");
    const hasDateRange =
        draftForm.FECHA_INICIO_DESDE.trim() !== "" ||
        draftForm.FECHA_INICIO_HASTA.trim() !== "";
    const isDateRangeValid =
        draftForm.FECHA_INICIO_DESDE.trim() !== "" &&
        draftForm.FECHA_INICIO_HASTA.trim() !== "";

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

                // Add filter parameters if any are set
                (Object.keys(appliedForm) as (keyof QueryForm)[]).forEach((key) => {
                    const value = appliedForm[key].trim();
                    if (value) {
                        params.set(key, value);
                    }
                });

                const response = await fetch(`/api/deposits-locked?${params.toString()}`);
                if (!response.ok) {
                    throw new Error("No se pudo cargar el listado.");
                }
                const data = (await response.json()) as DepositsLockedResponse;
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
    }, [pagination.page, pagination.pageSize, appliedForm]);

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
            return matchesSearch;
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
                    <p className="text-sm font-semibold text-text-secondary">Datasets</p>
                    <h1 className="mt-2 font-display text-3xl font-semibold text-text-primary">
                        Deposits Locked
                    </h1>
                    <p className="mt-2 text-sm text-text-secondary">
                        Listado paginado de la tabla deposits_locked en DuckDB.
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
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search by id, customer, amount..."
                            className="w-full text-sm text-text-primary placeholder:text-text-secondary focus:outline-none bg-transparent"
                            aria-label="Search deposits locked"
                        />
                    </div>
                </div>
            </div>

            {/* Filter Section */}
            <div className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm shadow-border/40">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                            Filtros
                        </p>
                        <h2 className="mt-1 font-display text-xl font-semibold text-text-primary">
                            Parametros de busqueda
                        </h2>
                    </div>
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-text-secondary hover:border-primary transition-colors"
                    >
                        {showFilters ? "Ocultar filtros" : "Mostrar filtros"}
                    </button>
                </div>

                {showFilters && (
                    <>
                        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {filterFields.map(({ key, label, type }) => (
                                <label key={key} className="flex flex-col gap-2 text-xs">
                                    <span className="font-semibold text-text-secondary">{label}</span>
                                    <input
                                        type={type ?? "text"}
                                        value={draftForm[key]}
                                        onChange={(event) => handleFilterChange(key, event.target.value)}
                                        className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-text-primary shadow-sm focus:border-primary focus:outline-none"
                                    />
                                </label>
                            ))}
                        </div>

                        {hasDateRange && !isDateRangeValid && (
                            <div className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
                                FECHA_INICIO requiere ambos extremos (DESDE y HASTA).
                            </div>
                        )}

                        <div className="mt-6 flex flex-wrap items-center gap-3">
                            <button
                                onClick={() => {
                                    setPagination((prev) => ({ ...prev, page: 1 }));
                                    setAppliedForm(draftForm);
                                }}
                                disabled={!hasAnyFilter || (hasDateRange && !isDateRangeValid)}
                                className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-primary/20 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-surface disabled:text-text-secondary disabled:shadow-none"
                            >
                                Aplicar filtros
                            </button>
                            <button
                                type="button"
                                onClick={clearFilters}
                                className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-text-secondary hover:border-primary"
                            >
                                Limpiar filtros
                            </button>
                            {hasAnyFilter && (
                                <span className="text-xs text-text-secondary">
                                    {Object.values(appliedForm).filter(v => v.trim() !== "").length} filtro(s) activo(s)
                                </span>
                            )}
                        </div>
                    </>
                )}
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
                                        key={`${row.ID_BLOQUEO ?? "row"}-${index}`}
                                        className="border-b border-border text-text-secondary"
                                    >
                                        {columns.map((column) => (
                                            <td
                                                key={`${column}-${index}`}
                                                className="whitespace-nowrap px-3 py-3 text-text-secondary"
                                            >
                                                {row[column as keyof DepositsLockedRow] ?? "-"}
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
        </div>
    );
}
