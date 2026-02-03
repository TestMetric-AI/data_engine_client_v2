import AdmissionsCard from "@/components/dashboard/AdmissionsCard";
import DistributionCard from "@/components/dashboard/DistributionCard";
import DivisionCard from "@/components/dashboard/DivisionCard";
import MonthlyCard from "@/components/dashboard/MonthlyCard";
import Sidebar from "@/components/dashboard/Sidebar";
import StatCard from "@/components/dashboard/StatCard";
import Topbar from "@/components/dashboard/Topbar";
import TrendCard from "@/components/dashboard/TrendCard";
import {
    ActivityIcon,
    DatabaseIcon,
    LayerIcon,
    UsersIcon,
} from "@/components/dashboard/icons";

export default function DashboardPage() {
    const stats = [
        {
            title: "Total records",
            value: "3,256",
            delta: "+12%",
            accent: "linear-gradient(135deg, #ede9fe, #ddd6fe)",
            icon: <DatabaseIcon className="h-6 w-6 text-violet-600" />,
        },
        {
            title: "Active pipelines",
            value: "394",
            delta: "+8%",
            accent: "linear-gradient(135deg, #ccfbf1, #99f6e4)",
            icon: <ActivityIcon className="h-6 w-6 text-teal-600" />,
        },
        {
            title: "API throughput",
            value: "2,536",
            delta: "+4%",
            accent: "linear-gradient(135deg, #ffedd5, #fed7aa)",
            icon: <UsersIcon className="h-6 w-6 text-orange-500" />,
        },
        {
            title: "Failed jobs",
            value: "38",
            delta: "-6%",
            accent: "linear-gradient(135deg, #fee2e2, #fecaca)",
            icon: <LayerIcon className="h-6 w-6 text-rose-500" />,
        },
    ];

    const trendData = [
        { month: "Oct", inbound: 3200, outbound: 1400 },
        { month: "Nov", inbound: 3600, outbound: 1800 },
        { month: "Dec", inbound: 4200, outbound: 1100 },
        { month: "Jan", inbound: 3100, outbound: 1600 },
        { month: "Feb", inbound: 3400, outbound: 1700 },
        { month: "Mar", inbound: 3900, outbound: 1300 },
    ];

    const admissions = [
        { label: "07 am", value: 60 },
        { label: "08 am", value: 113 },
        { label: "09 am", value: 80 },
        { label: "10 am", value: 120 },
        { label: "11 am", value: 95 },
        { label: "12 pm", value: 110 },
    ];

    const divisions = [
        { name: "Cardiology", value: 247 },
        { name: "Neurology", value: 164 },
        { name: "Surgery", value: 86 },
    ];

    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#ffffff_0%,_#f5f6fb_45%,_#eef2ff_100%)]">
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

                        <div className="mt-8 grid gap-6 lg:grid-cols-3">
                            <TrendCard data={trendData} />
                            <DistributionCard
                                title="Clients by Segment"
                                primaryLabel="Retail"
                                secondaryLabel="Enterprise"
                                primaryPercent={38}
                            />
                        </div>

                        <div className="mt-8 grid gap-6 lg:grid-cols-4">
                            <AdmissionsCard data={admissions} />
                            <DivisionCard divisions={divisions} />
                            <MonthlyCard />
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
}
