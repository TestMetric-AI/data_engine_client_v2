"use client";

import { useState } from "react";

type UploadResult = {
    message?: string;
    recordsProcessed?: number;
    totalRecords?: number;
    mode?: string;
};

type UploadStatus = "idle" | "uploading" | "done" | "error";

function formatBytes(bytes: number) {
    if (!Number.isFinite(bytes)) return "-";
    if (bytes < 1024) return `${bytes} B`;
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(1)} MB`;
}

export default function DepositsTrxLogUpload() {
    const [file, setFile] = useState<File | null>(null);
    const [mode, setMode] = useState<"append" | "overwrite">("append");
    const [status, setStatus] = useState<UploadStatus>("idle");
    const [result, setResult] = useState<UploadResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    const canSubmit = Boolean(file && status !== "uploading");

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
            setError("Please select a CSV file.");
            return;
        }

        const formData = new FormData();
        formData.append("file", file);
        formData.append("mode", mode === "overwrite" ? "REPLACE" : "APPEND");

        try {
            setStatus("uploading");
            const response = await fetch("/api/deposits-trxlog", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || "Upload failed");
            }

            const data = (await response.json()) as UploadResult;
            setResult(data);
            setStatus("done");
            setFile(null);
            setMode("append");
        } catch (err) {
            setStatus("error");
            setError(
                err instanceof Error ? err.message : "Unexpected error during upload"
            );
        }
    }

    return (
        <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-border bg-card p-6 shadow-sm shadow-border/40"
        >
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                        Deposits Transaction Log
                    </p>
                    <h2 className="mt-1 font-display text-xl font-semibold text-text-primary">
                        CSV Upload with Validation
                    </h2>
                </div>
                <span className="rounded-full bg-surface px-3 py-1 text-xs font-semibold text-text-secondary">
                    Step-based flow
                </span>
            </div>

            <div className="mt-6 space-y-6">
                <section className="rounded-2xl border border-border bg-surface p-4">
                    <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-card text-xs font-semibold text-text-secondary shadow-sm">
                            1
                        </span>
                        <h3 className="text-sm font-semibold text-text-primary">
                            Select CSV file
                        </h3>
                    </div>
                    <label
                        className={`mt-4 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-6 text-center text-sm transition ${isDragging
                                ? "border-primary bg-primary/5 text-primary"
                                : "border-border bg-card text-text-secondary hover:border-text-secondary"
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
                            accept=".csv"
                            className="hidden"
                            onChange={(event) =>
                                handleFileSelection(event.target.files?.[0] ?? null)
                            }
                        />
                        <span className="font-semibold text-text-primary">
                            Drag & drop your file here
                        </span>
                        <span className="mt-1 text-xs text-text-secondary">
                            Or click to browse
                        </span>
                    </label>
                    <div className="mt-3 rounded-xl bg-card px-3 py-2 text-xs text-text-secondary shadow-sm">
                        {file ? (
                            <div className="flex items-center justify-between">
                                <span className="font-semibold text-text-primary">
                                    {file.name}
                                </span>
                                <span>{formatBytes(file.size)}</span>
                            </div>
                        ) : (
                            <span>No file selected</span>
                        )}
                    </div>
                </section>

                <section className="rounded-2xl border border-border bg-surface p-4">
                    <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-card text-xs font-semibold text-text-secondary shadow-sm">
                            2
                        </span>
                        <h3 className="text-sm font-semibold text-text-primary">Load mode</h3>
                    </div>
                    <div className="mt-4 grid gap-3">
                        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-card px-3 py-3 text-sm text-text-secondary">
                            <input
                                type="radio"
                                name="load-mode"
                                value="append"
                                checked={mode === "append"}
                                onChange={() => setMode("append")}
                                className="mt-1 h-4 w-4 text-primary"
                            />
                            <div>
                                <p className="font-semibold text-text-primary">
                                    Append data (recommended)
                                </p>
                                <p className="text-xs text-text-secondary">
                                    Adds new rows and keeps existing records.
                                </p>
                            </div>
                        </label>
                        <label
                            className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 text-sm ${mode === "overwrite"
                                    ? "border-rose-300 bg-rose-50 text-rose-700"
                                    : "border-border bg-card text-text-secondary"
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

                <section className="rounded-2xl border border-border bg-card p-4">
                    <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white shadow-sm">
                            3
                        </span>
                        <h3 className="text-sm font-semibold text-text-primary">Upload</h3>
                    </div>
                    <button
                        type="submit"
                        disabled={!canSubmit}
                        className="mt-4 flex w-full items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/20 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-surface disabled:text-text-secondary disabled:shadow-none"
                    >
                        {status === "uploading" ? "Validating schema..." : "Upload & ingest"}
                    </button>
                </section>

                <section className="rounded-2xl border border-border bg-surface p-4">
                    <h3 className="text-sm font-semibold text-text-primary">
                        Upload feedback
                    </h3>
                    <div className="mt-4 grid gap-3 text-sm text-text-secondary">
                        {status === "done" && result ? (
                            <>
                                <div className="flex items-center justify-between rounded-xl bg-card px-3 py-2 shadow-sm">
                                    <span>Detected rows</span>
                                    <span className="font-semibold text-text-primary">
                                        {result.recordsProcessed?.toLocaleString() ?? "-"}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between rounded-xl bg-card px-3 py-2 shadow-sm">
                                    <span>Validation</span>
                                    <span className="font-semibold text-emerald-600">Success</span>
                                </div>
                                <div className="rounded-xl bg-card px-3 py-2 text-xs text-text-secondary shadow-sm">
                                    {result.message || "Data passed schema checks."}
                                </div>
                                <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                                    <span>File uploaded successfully.</span>
                                    <span className="font-semibold">View dataset →</span>
                                </div>
                            </>
                        ) : status === "error" && error ? (
                            <div className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">
                                {error}
                            </div>
                        ) : (
                            <div className="rounded-xl bg-card px-3 py-2 text-xs text-text-secondary shadow-sm">
                                Upload a file to see validation results.
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </form>
    );
}
