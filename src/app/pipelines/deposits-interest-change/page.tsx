import Link from "next/link";
import DepositsInterestChangeUpload from "@/components/pipelines/DepositsInterestChangeUpload";

export default function DepositsInterestChangePage() {
    return (
        <div className="mx-auto max-w-full">
            <div className="flex flex-col gap-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="font-display text-3xl font-semibold text-text-primary">
                            Registro de Cambios de Tasas de Interes
                        </h1>
                        <p className="mt-2 text-sm text-text-secondary">
                            Sube CSV de cambios de tasas, valida esquema y carga datos en DuckDB.
                        </p>
                    </div>
                </div>
            </div>

            <div className="mt-6">
                <DepositsInterestChangeUpload />
            </div>
        </div>
    );
}
