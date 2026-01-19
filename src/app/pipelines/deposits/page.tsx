import Link from "next/link";
import DepositsUpload from "@/components/pipelines/DepositsUpload";

export default function DepositsPage() {
  return (
    <div className="max-w-6xl">
      <div className="flex flex-col gap-3">
        <Link href="/pipelines" className="text-xs font-semibold text-slate-500">
          &larr; Volver a Pipelines
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-semibold text-slate-900">
              Registro de Depositos
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Sube CSV de depositos, valida esquema y carga datos en DuckDB.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <DepositsUpload />
      </div>
    </div>
  );
}
