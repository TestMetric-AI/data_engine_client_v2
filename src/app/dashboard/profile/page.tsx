"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import Sidebar from "@/components/dashboard/Sidebar";
import Topbar from "@/components/dashboard/Topbar";

export default function ProfilePage() {
    const { data: session } = useSession();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);
        setError("");
        setSuccess("");

        const formData = new FormData(e.currentTarget);
        const data = Object.fromEntries(formData);

        try {
            const res = await fetch("/api/user/profile", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            if (!res.ok) {
                const json = await res.json();
                throw new Error(json.error || "Failed to update profile");
            }

            setSuccess("Profile updated successfully");
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    if (!session) {
        return null;
    }

    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,_var(--color-background)_0%,_var(--color-surface)_45%,_#eef2ff_100%)]">
            <div className="flex min-h-screen flex-col lg:flex-row">
                <Sidebar />
                <div className="flex flex-1 flex-col">
                    <Topbar />
                    <main className="flex-1 px-6 py-8 sm:px-8">
                        <div className="mx-auto max-w-7xl">
                            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                                <div>
                                    <p className="text-sm font-semibold text-text-secondary">Account</p>
                                    <h1 className="mt-2 font-display text-3xl font-semibold text-text-primary">
                                        Your Profile
                                    </h1>
                                    <p className="mt-2 text-sm text-text-secondary">
                                        Manage your account settings and preferences.
                                    </p>
                                </div>
                            </div>

                            <div className="mt-6">
                                <form
                                    onSubmit={handleSubmit}
                                    className="rounded-2xl border border-border bg-card p-6 shadow-sm shadow-border/40"
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                                                Personal Details
                                            </p>
                                            <h2 className="mt-1 font-display text-xl font-semibold text-text-primary">
                                                Basic Information
                                            </h2>
                                        </div>
                                        <span className="rounded-full bg-surface px-3 py-1 text-xs font-semibold text-text-secondary">
                                            {session.user.roles?.join(", ") || "User"}
                                        </span>
                                    </div>

                                    <div className="mt-6 space-y-6">
                                        <section className="rounded-2xl border border-border bg-surface/60 p-4">
                                            <div className="flex items-center gap-2">
                                                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-card text-xs font-semibold text-text-secondary shadow-sm">
                                                    1
                                                </span>
                                                <h3 className="text-sm font-semibold text-text-primary">
                                                    Identity
                                                </h3>
                                            </div>

                                            <div className="mt-6 grid gap-6 sm:grid-cols-2">
                                                <label className="flex flex-col gap-2 text-xs">
                                                    <span className="font-semibold text-text-secondary">Full Name</span>
                                                    <input
                                                        name="name"
                                                        type="text"
                                                        defaultValue={session.user.name || ""}
                                                        required
                                                        className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-text-primary shadow-sm focus:border-primary focus:outline-none"
                                                    />
                                                </label>
                                                <label className="flex flex-col gap-2 text-xs">
                                                    <span className="font-semibold text-text-secondary">Email Address</span>
                                                    <input
                                                        name="email"
                                                        type="email"
                                                        defaultValue={session.user.email || ""}
                                                        disabled
                                                        className="cursor-not-allowed rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-secondary shadow-sm focus:outline-none"
                                                    />
                                                    <span className="text-[10px] text-text-secondary">Email cannot be changed.</span>
                                                </label>
                                            </div>
                                        </section>

                                        <section className="rounded-2xl border border-border bg-surface/60 p-4">
                                            <div className="flex items-center gap-2">
                                                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-card text-xs font-semibold text-text-secondary shadow-sm">
                                                    2
                                                </span>
                                                <h3 className="text-sm font-semibold text-text-primary">
                                                    Security
                                                </h3>
                                            </div>

                                            <div className="mt-6 grid gap-6 sm:grid-cols-2">
                                                <label className="flex flex-col gap-2 text-xs">
                                                    <span className="font-semibold text-text-secondary">New Password</span>
                                                    <input
                                                        name="password"
                                                        type="password"
                                                        placeholder="Leave blank to keep current"
                                                        minLength={6}
                                                        className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-text-primary shadow-sm focus:border-primary focus:outline-none"
                                                    />
                                                </label>
                                            </div>
                                        </section>
                                    </div>

                                    <div className="mt-4 min-h-[24px]">
                                        {error && (
                                            <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
                                                {error}
                                            </div>
                                        )}
                                        {success && (
                                            <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                                                {success}
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-6 flex items-center justify-end">
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary/20 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-surface disabled:text-text-secondary disabled:shadow-none"
                                        >
                                            {loading ? "Saving..." : "Save Changes"}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
}
