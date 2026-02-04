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
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#ffffff_0%,_#f5f6fb_45%,_#eef2ff_100%)]">
            <div className="flex min-h-screen flex-col lg:flex-row">
                <Sidebar />
                <div className="flex flex-1 flex-col">
                    <Topbar />
                    <main className="flex-1 px-6 py-8 sm:px-8">
                        <div className="mx-auto max-w-7xl">
                            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                                <div>
                                    <p className="text-sm font-semibold text-slate-500">Account</p>
                                    <h1 className="mt-2 font-display text-3xl font-semibold text-slate-900">
                                        Your Profile
                                    </h1>
                                    <p className="mt-2 text-sm text-slate-500">
                                        Manage your account settings and preferences.
                                    </p>
                                </div>
                            </div>

                            <div className="mt-6">
                                <form
                                    onSubmit={handleSubmit}
                                    className="rounded-2xl border border-slate-100/80 bg-white/90 p-6 shadow-sm shadow-slate-200/40"
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                                Personal Details
                                            </p>
                                            <h2 className="mt-1 font-display text-xl font-semibold text-slate-900">
                                                Basic Information
                                            </h2>
                                        </div>
                                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                                            {session.user.roles?.join(", ") || "User"}
                                        </span>
                                    </div>

                                    <div className="mt-6 space-y-6">
                                        <section className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                                            <div className="flex items-center gap-2">
                                                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-xs font-semibold text-slate-600 shadow-sm">
                                                    1
                                                </span>
                                                <h3 className="text-sm font-semibold text-slate-800">
                                                    Identity
                                                </h3>
                                            </div>

                                            <div className="mt-6 grid gap-6 sm:grid-cols-2">
                                                <label className="flex flex-col gap-2 text-xs">
                                                    <span className="font-semibold text-slate-600">Full Name</span>
                                                    <input
                                                        name="name"
                                                        type="text"
                                                        defaultValue={session.user.name || ""}
                                                        required
                                                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-slate-300 focus:outline-none"
                                                    />
                                                </label>
                                                <label className="flex flex-col gap-2 text-xs">
                                                    <span className="font-semibold text-slate-600">Email Address</span>
                                                    <input
                                                        name="email"
                                                        type="email"
                                                        defaultValue={session.user.email || ""}
                                                        disabled
                                                        className="cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-500 shadow-sm focus:outline-none"
                                                    />
                                                    <span className="text-[10px] text-slate-400">Email cannot be changed.</span>
                                                </label>
                                            </div>
                                        </section>

                                        <section className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                                            <div className="flex items-center gap-2">
                                                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-xs font-semibold text-slate-600 shadow-sm">
                                                    2
                                                </span>
                                                <h3 className="text-sm font-semibold text-slate-800">
                                                    Security
                                                </h3>
                                            </div>

                                            <div className="mt-6 grid gap-6 sm:grid-cols-2">
                                                <label className="flex flex-col gap-2 text-xs">
                                                    <span className="font-semibold text-slate-600">New Password</span>
                                                    <input
                                                        name="password"
                                                        type="password"
                                                        placeholder="Leave blank to keep current"
                                                        minLength={6}
                                                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-slate-300 focus:outline-none"
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
                                            className="rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none"
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
