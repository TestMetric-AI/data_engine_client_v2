"use client";

import { useState } from "react";
import { CheckIcon, ClipboardDocumentIcon } from "@heroicons/react/24/outline";

export default function ApiDocsPage() {
    return (
        <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-4xl bg-card p-8 rounded-2xl shadow-sm border border-border">
                <header className="mb-10 border-b border-border pb-6">
                    <h1 className="text-3xl font-display font-bold text-text-primary">API Documentation</h1>
                    <p className="mt-2 text-lg text-text-secondary">
                        Reference guide for integrating external services with the Data Engine.
                    </p>
                </header>

                <div className="space-y-12">
                    {/* Authentication Section */}
                    <section>
                        <h2 className="text-2xl font-semibold text-text-primary mb-4 flex items-center gap-2">
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                                    <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
                                </svg>
                            </span>
                            Authentication
                        </h2>
                        <div className="prose prose-slate max-w-none text-text-secondary">
                            <p>
                                All API endpoints are protected. You must include a valid API Token in the <code>Authorization</code> header of your requests.
                            </p>
                            <p className="mt-2 text-sm bg-amber-50 text-amber-800 p-3 rounded-lg border border-amber-100 font-medium">
                                ⚠️ Keep your API Tokens secure. Do not share them in public repositories.
                            </p>
                        </div>

                        <div className="mt-6">
                            <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wide mb-3">Authorization Header</h3>
                            <CodeBlock code="Authorization: Bearer <YOUR_TOKEN>" />
                        </div>
                    </section>

                    {/* Endpoints Section */}
                    <section className="space-y-8">
                        <div className="flex items-center justify-between border-b border-border pb-2">
                            <h2 className="text-2xl font-semibold text-text-primary">Endpoints</h2>
                        </div>

                        {/* Deposits */}
                        <Endpoint
                            method="GET"
                            path="/api/deposits"
                            title="List Deposits"
                            description="Retrieve a paginated list of deposits."
                            params={[
                                { name: "page", type: "number", required: false, desc: "Page number (default: 1)" },
                                { name: "pageSize", type: "number", required: false, desc: "Items per page (default: 100)" }
                            ]}
                            curl={`curl -X GET "${typeof window !== 'undefined' ? window.location.origin : 'https://api.example.com'}/api/deposits?page=1&pageSize=50" \\
  -H "Authorization: Bearer <TOKEN>"`}
                        />

                        <Endpoint
                            method="POST"
                            path="/api/deposits"
                            title="Upload Deposits (CSV)"
                            description="Upload a CSV file containing deposit data."
                            params={[
                                { name: "file", type: "file (csv)", required: true, desc: "CSV file to upload" },
                                { name: "overwrite", type: "boolean (query)", required: false, desc: "If true, replaces all existing data" }
                            ]}
                            curl={`curl -X POST "${typeof window !== 'undefined' ? window.location.origin : 'https://api.example.com'}/api/deposits?overwrite=false" \\
  -H "Authorization: Bearer <TOKEN>" \\
  -F "file=@/path/to/deposits.csv"`}
                        />

                        {/* Client Exonerated */}
                        <Endpoint
                            method="GET"
                            path="/api/client-exonerated"
                            title="List Client Exonerated"
                            description="Retrieve a paginated list of exonerated clients."
                            params={[
                                { name: "page", type: "number", required: false, desc: "Page number (default: 1)" },
                                { name: "pageSize", type: "number", required: false, desc: "Items per page (default: 100)" }
                            ]}
                            curl={`curl -X GET "${typeof window !== 'undefined' ? window.location.origin : 'https://api.example.com'}/api/client-exonerated?page=1&pageSize=50" \\
  -H "Authorization: Bearer <TOKEN>"`}
                        />

                        <Endpoint
                            method="POST"
                            path="/api/client-exonerated"
                            title="Upload Client Exonerated (XLSX)"
                            description="Upload an Excel file containing exonerated client data."
                            params={[
                                { name: "file", type: "file (xlsx)", required: true, desc: "Excel file to upload" },
                                { name: "overwrite", type: "boolean (query)", required: false, desc: "If true, replaces all existing data" }
                            ]}
                            curl={`curl -X POST "${typeof window !== 'undefined' ? window.location.origin : 'https://api.example.com'}/api/client-exonerated?overwrite=false" \\
  -H "Authorization: Bearer <TOKEN>" \\
  -F "file=@/path/to/clients.xlsx"`}
                        />

                        {/* Token Gen */}
                        <Endpoint
                            method="POST"
                            path="/api/admin/tokens"
                            title="Generate API Token"
                            description="Create a new long-lived API Token for Service Users. Requires credentials."
                            params={[
                                { name: "email", type: "string (body)", required: true, desc: "Service User Email" },
                                { name: "password", type: "string (body)", required: true, desc: "Service User Password" }
                            ]}
                            curl={`curl -X POST "${typeof window !== 'undefined' ? window.location.origin : 'https://api.example.com'}/api/admin/tokens" \\
  -H "Content-Type: application/json" \\
  -d '{"email": "service@example.com", "password": "password123"}'`}
                        />
                    </section>
                </div>
            </div>
        </div>
    );
}

function Endpoint({ method, path, title, description, params, curl }: any) {
    const methodColor = {
        GET: "bg-blue-100 text-blue-700",
        POST: "bg-emerald-100 text-emerald-700",
        PUT: "bg-amber-100 text-amber-700",
        DELETE: "bg-rose-100 text-rose-700",
        PATCH: "bg-purple-100 text-purple-700",
    }[method as string] || "bg-slate-100 text-slate-700";

    return (
        <div className="rounded-xl border border-border overflow-hidden">
            <div className="bg-surface/50 p-4 border-b border-border">
                <div className="flex items-center gap-3">
                    <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${methodColor}`}>
                        {method}
                    </span>
                    <code className="text-sm font-semibold text-text-primary">{path}</code>
                </div>
                <h3 className="mt-2 text-lg font-semibold text-text-primary">{title}</h3>
                <p className="text-sm text-text-secondary">{description}</p>
            </div>

            <div className="p-4 bg-card">
                {params && params.length > 0 && (
                    <div className="mb-6">
                        <h4 className="text-xs font-semibold uppercase text-text-secondary mb-3">Parameters</h4>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-text-secondary bg-surface uppercase">
                                    <tr>
                                        <th className="px-3 py-2 rounded-l-lg">Name</th>
                                        <th className="px-3 py-2">Type</th>
                                        <th className="px-3 py-2">Required</th>
                                        <th className="px-3 py-2 rounded-r-lg">Description</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {params.map((p: any, i: number) => (
                                        <tr key={i}>
                                            <td className="px-3 py-2 font-mono text-text-secondary">{p.name}</td>
                                            <td className="px-3 py-2 text-text-secondary">{p.type}</td>
                                            <td className="px-3 py-2">
                                                {p.required ? (
                                                    <span className="text-rose-600 font-medium text-xs">Yes</span>
                                                ) : (
                                                    <span className="text-slate-400 text-xs">No</span>
                                                )}
                                            </td>
                                            <td className="px-3 py-2 text-text-secondary">{p.desc}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                <div>
                    <h4 className="text-xs font-semibold uppercase text-text-secondary mb-2">Example Request</h4>
                    <CodeBlock code={curl} />
                </div>
            </div>
        </div>
    );
}

function CodeBlock({ code }: { code: string }) {
    const [copied, setCopied] = useState(false);

    const copy = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="relative group rounded-lg bg-slate-900 p-4">
            <pre className="text-sm text-slate-50 overflow-x-auto whitespace-pre-wrap font-mono">
                {code}
            </pre>
            <button
                onClick={copy}
                className="absolute top-2 right-2 p-2 rounded-md bg-slate-800 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-700 hover:text-white"
                title="Copy to clipboard"
            >
                {copied ? (
                    <CheckIcon className="h-4 w-4 text-emerald-500" />
                ) : (
                    <ClipboardDocumentIcon className="h-4 w-4" />
                )}
            </button>
        </div>
    );
}
