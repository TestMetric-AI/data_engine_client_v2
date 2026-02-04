"use client";

import { useState } from "react";

interface RegisterUserFormProps {
    onSuccess?: () => void;
}

export default function RegisterUserForm({ onSuccess }: RegisterUserFormProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [generatedPassword, setGeneratedPassword] = useState("");

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);
        setError("");
        setSuccess("");
        setGeneratedPassword("");

        const form = e.currentTarget;
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);

        try {
            const res = await fetch("/api/admin/users", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            if (!res.ok) {
                const json = await res.json();
                throw new Error(json.error || "Failed to register user");
            }

            const json = await res.json();
            setSuccess("User registered successfully!");
            if (json.generatedPassword) {
                setGeneratedPassword(json.generatedPassword);
            }
            form.reset();

            // Wait a moment for the user to see the success message if needed, or just let them close manually.
            // But if we want auto-close behavior we could trigger it. 
            // For now, let's trigger onSuccess but keep the modal open so they can copy the password.
            if (onSuccess) {
                // We might NOT want to close immediately because the user needs to copy the password.
                // So we typically just trigger a refresh of the list but keep the modal open.
                onSuccess();
            }

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                        User Management
                    </p>
                    <h2 className="mt-1 font-display text-xl font-semibold text-text-primary">
                        Account Details
                    </h2>
                </div>
                <span className="rounded-full bg-surface px-3 py-1 text-xs font-semibold text-text-secondary">
                    Single Step
                </span>
            </div>

            <div className="space-y-6">
                <section className="rounded-2xl border border-border bg-surface/60 p-4">
                    <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-card text-xs font-semibold text-text-secondary shadow-sm">
                            1
                        </span>
                        <h3 className="text-sm font-semibold text-text-primary">
                            User Information
                        </h3>
                    </div>

                    <div className="mt-6 grid gap-6 sm:grid-cols-2">
                        <label className="flex flex-col gap-2 text-xs">
                            <span className="font-semibold text-text-secondary">Full Name</span>
                            <input
                                name="name"
                                type="text"
                                placeholder="John Doe"
                                required
                                className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-text-primary shadow-sm focus:border-primary focus:outline-none"
                            />
                        </label>
                        <label className="flex flex-col gap-2 text-xs">
                            <span className="font-semibold text-text-secondary">Email Address</span>
                            <input
                                name="email"
                                type="email"
                                placeholder="john@example.com"
                                required
                                className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-text-primary shadow-sm focus:border-primary focus:outline-none"
                            />
                        </label>
                    </div>
                </section>

                <section className="rounded-2xl border border-border bg-surface/60 p-4">
                    <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-card text-xs font-semibold text-text-secondary shadow-sm">
                            2
                        </span>
                        <h3 className="text-sm font-semibold text-text-primary">
                            Access Control
                        </h3>
                    </div>

                    <div className="mt-6 grid gap-6 sm:grid-cols-2">
                        <label className="flex flex-col gap-2 text-xs">
                            <span className="font-semibold text-text-secondary">Role</span>
                            <div className="relative">
                                <select
                                    name="role"
                                    id="role"
                                    className="w-full appearance-none rounded-xl border border-border bg-card px-3 py-2 text-sm text-text-primary shadow-sm focus:border-primary focus:outline-none"
                                >
                                    <option value="user">User</option>
                                    <option value="TESTER">Tester</option>
                                    <option value="ADMIN">Admin</option>
                                </select>
                                <div className="pointer-events-none absolute right-3 top-2.5 text-text-secondary">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                                    </svg>
                                </div>
                            </div>
                        </label>
                    </div>
                </section>
            </div>

            <div className="min-h-[24px]">
                {error && (
                    <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
                        {error}
                    </div>
                )}
                {success && (
                    <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                        <div>{success}</div>
                        {generatedPassword && (
                            <div className="mt-2 rounded-lg bg-emerald-100 p-3 text-emerald-900 border border-emerald-200">
                                <p className="font-bold text-xs uppercase tracking-wider mb-1">Generated Password</p>
                                <div className="flex items-center gap-2">
                                    <code className="bg-white px-2 py-1 rounded border border-emerald-200 text-lg font-mono select-all">
                                        {generatedPassword}
                                    </code>
                                    <span className="text-xs text-emerald-600">(Copy this now, it won't be shown again)</span>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="flex items-center justify-end">
                <button
                    type="submit"
                    disabled={loading}
                    className="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary/20 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-surface disabled:text-text-secondary disabled:shadow-none"
                >
                    {loading ? "Registering..." : "Register User"}
                </button>
            </div>
        </form>
    );
}
