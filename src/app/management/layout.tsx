import Sidebar from "@/components/dashboard/Sidebar";
import Topbar from "@/components/dashboard/Topbar";
import { requireServer } from "@/lib/rbac";

export default async function ManagementLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // 1. Enforce "VIEW_MANAGEMENT" permission for this entire section
    await requireServer("VIEW_MANAGEMENT");

    return (
        <div className="min-h-screen bg-background">
            <div className="flex min-h-screen flex-col lg:flex-row">
                <Sidebar />
                <div className="flex flex-1 flex-col">
                    <Topbar />
                    <main className="flex-1 px-6 py-8 sm:px-8">
                        <div className="mx-auto max-w-7xl h-full flex flex-col">
                            {children}
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
}
