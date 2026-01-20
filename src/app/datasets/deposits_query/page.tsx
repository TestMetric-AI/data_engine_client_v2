"use client";

import { useMemo, useState } from "react";

type QueryForm = {
  NUMERO_CONTRATO: string;
  NUM_PRODUCTO: string;
  ID_PRODUCTO: string;
  ID_CUSTOMER: string;
  MONEDA: string;
  PLAZO: string;
  ESTADO_PRODUCTO: string;
  FECHA_NEGOCIACION_HASTA: string;
  FECHA_EFECTIVA_DESDE: string;
  FECHA_EFECTIVA_HASTA: string;
};

type QueryResponse = {
  data: Record<string, string | number | null>;
};

const initialForm: QueryForm = {
  NUMERO_CONTRATO: "",
  NUM_PRODUCTO: "",
  ID_PRODUCTO: "",
  ID_CUSTOMER: "",
  MONEDA: "",
  PLAZO: "",
  ESTADO_PRODUCTO: "",
  FECHA_NEGOCIACION_HASTA: "",
  FECHA_EFECTIVA_DESDE: "",
  FECHA_EFECTIVA_HASTA: "",
};

const defaultColumns = [
  "ID_CUSTOMER",
  "FECHA_EFECTIVA",
  "MONTO_DEPOSITO",
  "FECHA_VENCIMIENTO",
  "TIENE_SOLICITUD_EXONERACION",
  "LEGAL_ID",
];

export default function DepositsQueryPage() {
  const [form, setForm] = useState<QueryForm>(initialForm);
  const [status, setStatus] = useState<"idle" | "loading">("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<QueryResponse | null>(null);

  const baseUrl = useMemo(
    () => process.env.NEXT_PUBLIC_ETL_API_BASE_URL ?? "http://localhost:3000",
    []
  );

  const hasAnyFilter = Object.values(form).some((value) => value.trim() !== "");
  const hasEffectiveRange =
    form.FECHA_EFECTIVA_DESDE.trim() !== "" ||
    form.FECHA_EFECTIVA_HASTA.trim() !== "";
  const isEffectiveRangeValid =
    form.FECHA_EFECTIVA_DESDE.trim() !== "" &&
    form.FECHA_EFECTIVA_HASTA.trim() !== "";
  const resultColumns = useMemo(
    () => {
      if (result?.data) {
        const keys = Object.keys(result.data);
        return keys.length > 0 ? keys : defaultColumns;
      }
      return defaultColumns;
    },
    [result]
  );

  const filterFields: Array<{
    key: keyof QueryForm;
    label: string;
    type?: string;
  }> = [
    { key: "NUMERO_CONTRATO", label: "Numero contrato" },
    { key: "NUM_PRODUCTO", label: "Num producto" },
    { key: "ID_PRODUCTO", label: "ID producto" },
    { key: "ID_CUSTOMER", label: "ID customer" },
    { key: "MONEDA", label: "Moneda" },
    { key: "PLAZO", label: "Plazo" },
    { key: "ESTADO_PRODUCTO", label: "Estado producto" },
    {
      key: "FECHA_NEGOCIACION_HASTA",
      label: "Fecha negociacion hasta",
      type: "date",
    },
    {
      key: "FECHA_EFECTIVA_DESDE",
      label: "Fecha efectiva desde",
      type: "date",
    },
    {
      key: "FECHA_EFECTIVA_HASTA",
      label: "Fecha efectiva hasta",
      type: "date",
    },
  ];

  function handleChange(key: keyof QueryForm, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function buildQueryParams() {
    const params = new URLSearchParams();
    (Object.keys(form) as (keyof QueryForm)[]).forEach((key) => {
      const value = form[key].trim();
      if (value) {
        params.set(key, value);
      }
    });
    return params;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setResult(null);

    if (!hasAnyFilter) {
      setError("Ingresa al menos un parametro para buscar.");
      return;
    }

    if (hasEffectiveRange && !isEffectiveRangeValid) {
      setError(
        "FECHA_EFECTIVA requiere ambos extremos (DESDE y HASTA)."
      );
      return;
    }

    const params = buildQueryParams();
    try {
      setStatus("loading");
      const response = await fetch(
        `${baseUrl}/deposits/query?${params.toString()}`
      );

      if (response.status === 404) {
        setError("No se encontro ningun resultado.");
        return;
      }

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Error al consultar.");
      }

      const data = (await response.json()) as QueryResponse;
      setResult(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error inesperado."
      );
    } finally {
      setStatus("idle");
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-500">Datasets</p>
          <h1 className="mt-2 font-display text-3xl font-semibold text-slate-900">
            Deposits Query
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Consulta puntual sobre la tabla deposits_dp10 usando filtros
            exactos o rangos de fechas.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-6">
        <form
          onSubmit={handleSubmit}
          className="w-full min-w-0 rounded-2xl border border-slate-100/80 bg-white/90 p-6 shadow-sm shadow-slate-200/40"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Consulta
              </p>
              <h2 className="mt-1 font-display text-xl font-semibold text-slate-900">
                Parametros de busqueda
              </h2>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
              Single result
            </span>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filterFields.map(({ key, label, type }) => (
              <label key={key} className="flex flex-col gap-2 text-xs">
                <span className="font-semibold text-slate-600">{label}</span>
                <input
                  type={type ?? "text"}
                  value={form[key]}
                  onChange={(event) => handleChange(key, event.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-slate-300 focus:outline-none"
                />
              </label>
            ))}
          </div>

          <div className="mt-4 min-h-[44px]">
            {error ? (
              <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            ) : null}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={status === "loading"}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none"
            >
              {status === "loading" ? "Consultando..." : "Consultar"}
            </button>
            <button
              type="button"
              onClick={() => {
                setForm(initialForm);
                setError(null);
                setResult(null);
              }}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:border-slate-300"
            >
              Limpiar filtros
            </button>
          </div>
        </form>

        <section className="w-full min-w-0 rounded-2xl border border-slate-100/80 bg-white/90 p-6 shadow-sm shadow-slate-200/40">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-slate-900">
              Resultado
            </h2>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
              deposits/query
            </span>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="border-b border-slate-100 text-xs uppercase text-slate-400">
                <tr>
                  {resultColumns.map((key) => (
                    <th key={key} className="px-3 py-3">
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {status === "loading" ? (
                  <tr>
                    <td
                      colSpan={Math.max(resultColumns.length, 1)}
                      className="px-3 py-10 text-center text-sm text-slate-500"
                    >
                      <div className="flex items-center justify-center gap-3">
                        <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
                        Consultando...
                      </div>
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td
                      colSpan={Math.max(resultColumns.length, 1)}
                      className="px-3 py-10 text-center text-sm text-rose-600"
                    >
                      {error}
                    </td>
                  </tr>
                ) : result?.data ? (
                  <tr className="border-b border-slate-50 text-slate-600">
                    {resultColumns.map((key) => (
                      <td key={key} className="px-3 py-3 text-slate-600">
                        {result.data[key] ?? "-"}
                      </td>
                    ))}
                  </tr>
                ) : (
                  <tr>
                    <td
                      colSpan={Math.max(resultColumns.length, 1)}
                      className="px-3 py-10 text-center text-sm text-slate-500"
                    >
                      Ingresa parametros y ejecuta la consulta para ver
                      resultados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
