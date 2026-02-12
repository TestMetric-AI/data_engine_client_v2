import Link from "next/link";
import Sidebar from "@/components/dashboard/Sidebar";
import StatCard from "@/components/dashboard/StatCard";
import Topbar from "@/components/dashboard/Topbar";
import TestResultsCharts from "@/components/dashboard/TestResultsCharts";
import {
    ActivityIcon,
    UsersIcon,
    BanknotesIcon,
    LockClosedIcon,
} from "@/components/dashboard/icons";
import { getDashboardStats } from "@/lib/services/dashboard";
import { getTestResultsDashboardData } from "@/lib/services/test-results-dashboard";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
    const [dashboardStats, testResultsData] = await Promise.all([
        getDashboardStats(),
        getTestResultsDashboardData(),
    ]);

    const stats = [
        {
            title: "Active Projects",
            value: dashboardStats.activeProjects.toString(),
            delta: "Active",
            accent: "linear-gradient(135deg, #ede9fe, #ddd6fe)",
            icon: <FolderIcon className="h-6 w-6 text-violet-600" />,
        },
        {
            title: "Task Completion Rate",
            value: `${dashboardStats.taskCompletionRate}%`,
            delta: "Rate",
            accent: "linear-gradient(135deg, #ccfbf1, #99f6e4)",
            icon: <ActivityIcon className="h-6 w-6 text-teal-600" />,
        },
        {
            title: "Resource Utilization",
            value: `${dashboardStats.resourceUtilization}%`,
            delta: "Avg Allocation",
            accent: "linear-gradient(135deg, #ffedd5, #fed7aa)",
            icon: <UsersIcon className="h-6 w-6 text-orange-500" />,
        },
        {
            title: "Upcoming Deadlines",
            value: dashboardStats.upcomingDeadlines.length.toString(),
            delta: "Next 7 Days",
            accent: "linear-gradient(135deg, #fee2e2, #fecaca)",
            icon: <CalendarIcon className="h-6 w-6 text-rose-500" />,
        },
        {
            title: "Ingested Deposits",
            value: dashboardStats.totalDepositsCount.toLocaleString(),
            delta: "Total Rows",
            accent: "linear-gradient(135deg, #dbeafe, #bfdbfe)",
            icon: <BanknotesIcon className="h-6 w-6 text-blue-600" />,
        },
        {
            title: "Active Blockades",
            value: dashboardStats.totalLockedCount.toLocaleString(),
            delta: "Locked Rows",
            accent: "linear-gradient(135deg, #fce7f3, #fbcfe8)",
            icon: <LockClosedIcon className="h-6 w-6 text-pink-600" />,
        },
    ];

    return (
        <div className="min-h-screen bg-background">
            <div className="flex min-h-screen flex-col lg:flex-row">
                <Sidebar />
                <div className="flex flex-1 flex-col">
                    <Topbar />
                    <main className="flex-1 px-6 py-8 sm:px-8">
                        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                            {stats.map((stat) => (
                                <StatCard key={stat.title} {...stat} />
                            ))}
                        </div>

                        {/* Deadlines Section */}
                        {dashboardStats.upcomingDeadlines.length > 0 && (
                            <div className="mt-8">
                                <h3 className="mb-4 text-lg font-semibold text-text-primary">Upcoming Deadlines</h3>
                                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                    {dashboardStats.upcomingDeadlines.map((task) => (
                                        <div key={task.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <h4 className="font-semibold text-text-primary">{task.title}</h4>
                                                    <p className="mt-1 text-sm text-text-secondary">
                                                        Due: {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "No date"}
                                                    </p>
                                                </div>
                                                <span className={`rounded-full px-2 py-1 text-xs font-semibold ${task.priority === 'high' ? 'bg-rose-100 text-rose-700' :
                                                    task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                                        'bg-green-100 text-green-700'
                                                    }`}>
                                                    {task.priority || 'Normal'}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Test Results Section */}
                        <TestResultsCharts data={testResultsData} />
                    </main>
                </div>
            </div>
        </div>
    );
}

// Icons needed for the updated stat cards
function FolderIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
        </svg>
    );
}

function CalendarIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
        </svg>
    );
}
