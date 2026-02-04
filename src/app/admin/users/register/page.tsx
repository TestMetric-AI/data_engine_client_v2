"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import Sidebar from "@/components/dashboard/Sidebar";
import Topbar from "@/components/dashboard/Topbar";
import UsersTable from "./UsersTable";
import Modal from "@/components/ui/Modal";
import RegisterUserForm from "./RegisterUserForm";

export default function RegisterUserPage() {
    const { data: session, status } = useSession();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    if (status === "loading") {
        return <div className="p-8">Loading...</div>;
    }

    if (!session?.user?.roles?.includes("ADMIN")) {
        if (status === "authenticated") {
            return <div className="p-8 text-red-600">Access Denied: You do not have permission to view this page.</div>;
        }
        return <div className="p-8">Please log in.</div>;
    }

    const handleUserRegistered = () => {
        setRefreshTrigger(prev => prev + 1);
    };

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
                                    <p className="text-sm font-semibold text-slate-500">Admin</p>
                                    <h1 className="mt-2 font-display text-3xl font-semibold text-slate-900">
                                        User Management
                                    </h1>
                                    <p className="mt-2 text-sm text-slate-500">
                                        Manage system access and roles.
                                    </p>
                                </div>
                                <div>
                                    <button
                                        onClick={() => setIsModalOpen(true)}
                                        className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition hover:-translate-y-0.5 hover:bg-slate-800"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                        </svg>
                                        Add New User
                                    </button>
                                </div>
                            </div>

                            <div className="mt-8">
                                <UsersTable refreshTrigger={refreshTrigger} />
                            </div>
                        </div>
                    </main>
                </div>
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Register New User"
            >
                <RegisterUserForm onSuccess={handleUserRegistered} />
            </Modal>
        </div>
    );
}
