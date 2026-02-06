import Link from "next/link";
import DepositsLockedUpload from "@/components/pipelines/DepositsLockedUpload";

export default function DepositsLockedPage() {
    return (
        <div className="mx-auto max-w-full">
            <div className="flex flex-col gap-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="font-display text-3xl font-semibold text-text-primary">
                            Registro de Bloqueos de Depositos
                        </h1>
                        <p className="mt-2 text-sm text-text-secondary">
                            Sube CSV de bloqueos, valida esquema y carga datos en DuckDB.
                        </p>
                    </div>
                </div>
            </div>

            <div className="mt-6">
                <DepositsLockedUpload />
            </div>
        </div>
    );
}
