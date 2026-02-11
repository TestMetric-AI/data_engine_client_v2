import Link from "next/link";
import DepositsTrxLogUpload from "@/components/pipelines/DepositsTrxLogUpload";

export default function DepositsTrxLogPage() {
    return (
        <div className="mx-auto max-w-full">
            <div className="flex flex-col gap-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="font-display text-3xl font-semibold text-text-primary">
                            Deposits Transaction Log
                        </h1>
                        <p className="mt-2 text-sm text-text-secondary">
                            Upload CSV transaction log, validate schema and load data into database.
                        </p>
                    </div>
                </div>
            </div>

            <div className="mt-6">
                <DepositsTrxLogUpload />
            </div>
        </div>
    );
}
