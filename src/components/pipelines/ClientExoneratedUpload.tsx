"use client";

import { useMemo, useState } from "react";

type UploadResult = {
  message?: string;
  inserted?: number;
};

type UploadStatus = "idle" | "uploading" | "done" | "error";

const fileNameRegex = /^clientes_exonerados\.xlsx$/;

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes)) return "-";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}

export default function ClientExoneratedUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<"append" | "overwrite">("append");
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const isFileNameValid = file ? fileNameRegex.test(file.name) : false;
  const canSubmit = Boolean(file && isFileNameValid && status !== "uploading");

  function handleFileSelection(selected: File | null) {
    setFile(selected);
    setError(null);
    setResult(null);
  }

  function handleDrop(event: React.DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    const dropped = event.dataTransfer.files?.[0] ?? null;
    setIsDragging(false);
    handleFileSelection(dropped);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setResult(null);

    if (!file) {
      setError("Selecciona un archivo XLSX valido.");
      return;
    }

    if (!isFileNameValid) {
      setError("El nombre debe ser clientes_exonerados.xlsx.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    const query = mode === "overwrite" ? "?overwrite=true" : "";
    const url = `/api/client-exonerated${query}`;

    try {
      setStatus("uploading");
      const response = await fetch(url, {
        method: "POST",
        body: formData,
      });

      console.log("Client exonerated upload response:", {
        status: response.status,
        ok: response.ok,
        url: response.url,
      });

      if (response.status !== 201) {
        const text = await response.text();
        throw new Error(text || "Error en la carga.");
      }

      const contentType = response.headers.get("content-type") ?? "";
      if (contentType.includes("application/json")) {
        const data = (await response.json()) as UploadResult;
        setResult(data);
      }
      setStatus("done");
      setFile(null);
      setMode("append");
      setIsDragging(false);
    } catch (err) {
      setStatus("error");
      setError(
        err instanceof Error ? err.message : "Error inesperado en la carga."
      );
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-slate-100/80 bg-white/90 p-6 shadow-sm shadow-slate-200/40"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Registro de Clientes Exonerados
          </p>
          <h2 className="mt-1 font-display text-xl font-semibold text-slate-900">
            Carga XLSX con validaciones
          </h2>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
          Step-based flow
        </span>
      </div>

      <div className="mt-6 space-y-6">
        <section className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-xs font-semibold text-slate-600 shadow-sm">
              1
            </span>
            <h3 className="text-sm font-semibold text-slate-800">
              Select XLSX file
            </h3>
          </div>
          <label
            className={`mt-4 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-6 text-center text-sm transition ${isDragging
              ? "border-violet-400 bg-violet-50 text-violet-700"
              : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
              }`}
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            <input
              type="file"
              accept=".xlsx"
              className="hidden"
              onChange={(event) =>
                handleFileSelection(event.target.files?.[0] ?? null)
              }
            />
            <span className="font-semibold text-slate-700">
              Drag & drop your file here
            </span>
            <span className="mt-1 text-xs text-slate-400">
              Or click to browse
            </span>
          </label>
          <div className="mt-3 rounded-xl bg-white px-3 py-2 text-xs text-slate-500 shadow-sm">
            {file ? (
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700">
                  {file.name}
                </span>
                <span>{formatBytes(file.size)}</span>
              </div>
            ) : (
              <span>No file selected</span>
            )}
          </div>
          {!isFileNameValid && file && (
            <p className="mt-2 text-xs font-semibold text-rose-600">
              El nombre debe ser clientes_exonerados.xlsx
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-xs font-semibold text-slate-600 shadow-sm">
              2
            </span>
            <h3 className="text-sm font-semibold text-slate-800">Load mode</h3>
          </div>
          <div className="mt-4 grid gap-3">
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-600">
              <input
                type="radio"
                name="load-mode"
                value="append"
                checked={mode === "append"}
                onChange={() => setMode("append")}
                className="mt-1 h-4 w-4 text-violet-600"
              />
              <div>
                <p className="font-semibold text-slate-700">
                  Append data (recommended)
                </p>
                <p className="text-xs text-slate-500">
                  Adds new rows and keeps existing records.
                </p>
              </div>
            </label>
            <label
              className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 text-sm ${mode === "overwrite"
                ? "border-rose-300 bg-rose-50 text-rose-700"
                : "border-slate-200 bg-white text-slate-600"
                }`}
            >
              <input
                type="radio"
                name="load-mode"
                value="overwrite"
                checked={mode === "overwrite"}
                onChange={() => setMode("overwrite")}
                className="mt-1 h-4 w-4 text-rose-600"
              />
              <div>
                <p className="font-semibold">
                  Overwrite existing data (danger)
                </p>
                <p className="text-xs">
                  Deletes current records before loading the new file.
                </p>
              </div>
            </label>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-100 bg-white p-4">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white shadow-sm">
              3
            </span>
            <h3 className="text-sm font-semibold text-slate-800">Upload</h3>
          </div>
          <button
            type="submit"
            disabled={!canSubmit}
            className="mt-4 flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none"
          >
            {status === "uploading" ? "Validating schema..." : "Upload & ingest"}
          </button>
        </section>

        {status === "done" && result && (
          <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {result.message ?? "Archivo cargado correctamente."}{" "}
            {typeof result.inserted === "number"
              ? `Insertados: ${result.inserted}.`
              : ""}
          </div>
        )}

        {status === "error" && error && (
          <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}
      </div>
    </form>
  );
}
