"use client";

import type { ReactNode } from "react";
import {
    PieChart,
    Pie,
    Cell,
    AreaChart,
    Area,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from "recharts";
import Card from "./Card";
import type {
    StatusDistribution,
    DailyTrend,
    SlowestTest,
    FlakyTest,
    ProjectBreakdown,
    TestResultsDashboardData,
} from "@/lib/services/test-results-dashboard";

// --- Color palette ---
const STATUS_COLORS: Record<string, string> = {
    passed: "#10b981",
    failed: "#ef4444",
    timedOut: "#f59e0b",
    skipped: "#6b7280",
    interrupted: "#8b5cf6",
};

function formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
}

function formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}/${d.getDate()}`;
}

function shortenPath(path: string, maxLen = 40): string {
    if (path.length <= maxLen) return path;
    const parts = path.split("/");
    if (parts.length <= 2) return path.slice(-maxLen);
    return `.../${parts.slice(-2).join("/")}`;
}

// --- Summary Stat Cards ---
function SummaryStats({
    totalTests,
    passRate,
    avgDuration,
    totalFailures,
}: Pick<TestResultsDashboardData, "totalTests" | "passRate" | "avgDuration" | "totalFailures">) {
    const stats = [
        {
            label: "Total Tests",
            value: totalTests.toLocaleString(),
            color: "text-primary",
            bg: "linear-gradient(135deg, #ede9fe, #ddd6fe)",
        },
        {
            label: "Pass Rate",
            value: `${passRate}%`,
            color: passRate >= 80 ? "text-emerald-600" : passRate >= 60 ? "text-amber-600" : "text-rose-600",
            bg:
                passRate >= 80
                    ? "linear-gradient(135deg, #d1fae5, #a7f3d0)"
                    : passRate >= 60
                      ? "linear-gradient(135deg, #fef3c7, #fde68a)"
                      : "linear-gradient(135deg, #fee2e2, #fecaca)",
        },
        {
            label: "Avg Duration",
            value: formatDuration(avgDuration),
            color: "text-blue-600",
            bg: "linear-gradient(135deg, #dbeafe, #bfdbfe)",
        },
        {
            label: "Failures",
            value: totalFailures.toLocaleString(),
            color: totalFailures === 0 ? "text-emerald-600" : "text-rose-600",
            bg: totalFailures === 0
                ? "linear-gradient(135deg, #d1fae5, #a7f3d0)"
                : "linear-gradient(135deg, #fee2e2, #fecaca)",
        },
    ];

    return (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((s) => (
                <Card key={s.label} className="flex items-center gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ background: s.bg }}>
                        <span className={`font-display text-lg font-bold ${s.color}`}>
                            {s.label === "Total Tests" ? "#" : s.label === "Pass Rate" ? "%" : s.label === "Avg Duration" ? "ms" : "!"}
                        </span>
                    </div>
                    <div>
                        <p className="text-sm text-text-secondary">{s.label}</p>
                        <p className={`font-display text-2xl font-semibold ${s.color}`}>{s.value}</p>
                    </div>
                </Card>
            ))}
        </div>
    );
}

// --- Status Donut ---
function StatusDonut({ data }: { data: StatusDistribution[] }) {
    const total = data.reduce((sum, d) => sum + d.count, 0);

    return (
        <Card>
            <p className="font-display text-lg font-semibold text-text-primary">Status Distribution</p>
            <p className="mb-4 text-sm text-text-secondary">Last 30 days</p>
            <div className="flex flex-col items-center gap-4 lg:flex-row lg:justify-around">
                <ResponsiveContainer width={200} height={200}>
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={85}
                            dataKey="count"
                            nameKey="status"
                            strokeWidth={2}
                            stroke="var(--card)"
                        >
                            {data.map((entry) => (
                                <Cell key={entry.status} fill={STATUS_COLORS[entry.status] ?? "#6b7280"} />
                            ))}
                        </Pie>
                        <Tooltip
                            formatter={(value: number | undefined, name: string | undefined) => [
                                `${value ?? 0} (${total > 0 ? Math.round(((value ?? 0) / total) * 100) : 0}%)`,
                                name ?? "",
                            ]}
                            contentStyle={{
                                background: "var(--card)",
                                border: "1px solid var(--border)",
                                borderRadius: "12px",
                                fontSize: "13px",
                            }}
                        />
                    </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-col gap-2">
                    {data.map((d) => (
                        <div key={d.status} className="flex items-center gap-2 text-sm">
                            <span
                                className="h-3 w-3 rounded-full"
                                style={{ background: STATUS_COLORS[d.status] ?? "#6b7280" }}
                            />
                            <span className="capitalize text-text-secondary">{d.status}</span>
                            <span className="ml-auto font-semibold text-text-primary">{d.count}</span>
                        </div>
                    ))}
                </div>
            </div>
        </Card>
    );
}

// --- Daily Trend Area Chart ---
function DailyTrendChart({ data }: { data: DailyTrend[] }) {
    return (
        <Card className="col-span-1 lg:col-span-2">
            <p className="font-display text-lg font-semibold text-text-primary">Test Results Trend</p>
            <p className="mb-4 text-sm text-text-secondary">Daily pass/fail over last 30 days</p>
            <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={data}>
                    <defs>
                        <linearGradient id="gradPassed" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gradFailed" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 12, fill: "var(--text-secondary)" }} />
                    <YAxis tick={{ fontSize: 12, fill: "var(--text-secondary)" }} />
                    <Tooltip
                        contentStyle={{
                            background: "var(--card)",
                            border: "1px solid var(--border)",
                            borderRadius: "12px",
                            fontSize: "13px",
                        }}
                        labelFormatter={(label: ReactNode) => `Date: ${label}`}
                    />
                    <Legend
                        iconType="circle"
                        wrapperStyle={{ fontSize: "13px" }}
                    />
                    <Area type="monotone" dataKey="passed" stroke="#10b981" fill="url(#gradPassed)" strokeWidth={2} />
                    <Area type="monotone" dataKey="failed" stroke="#ef4444" fill="url(#gradFailed)" strokeWidth={2} />
                    <Area type="monotone" dataKey="skipped" stroke="#6b7280" fill="transparent" strokeWidth={1} strokeDasharray="4 4" />
                </AreaChart>
            </ResponsiveContainer>
        </Card>
    );
}

// --- Slowest Tests Bar Chart ---
function SlowestTestsChart({ data }: { data: SlowestTest[] }) {
    const chartData = data.map((t) => ({
        name: t.testTitle.length > 30 ? t.testTitle.slice(0, 30) + "..." : t.testTitle,
        avgDuration: t.avgDuration,
        maxDuration: t.maxDuration,
        fullTitle: t.testTitle,
        file: t.testFile,
        runs: t.runCount,
    }));

    return (
        <Card className="col-span-1 lg:col-span-2">
            <p className="font-display text-lg font-semibold text-text-primary">Slowest Tests</p>
            <p className="mb-4 text-sm text-text-secondary">Top 10 by average duration</p>
            {chartData.length === 0 ? (
                <p className="py-8 text-center text-sm text-text-secondary">Not enough data (need at least 2 runs per test)</p>
            ) : (
                <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 36)}>
                    <BarChart data={chartData} layout="vertical" margin={{ left: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                        <XAxis
                            type="number"
                            tickFormatter={(v) => formatDuration(v)}
                            tick={{ fontSize: 12, fill: "var(--text-secondary)" }}
                        />
                        <YAxis
                            dataKey="name"
                            type="category"
                            width={180}
                            tick={{ fontSize: 11, fill: "var(--text-secondary)" }}
                        />
                        <Tooltip
                            contentStyle={{
                                background: "var(--card)",
                                border: "1px solid var(--border)",
                                borderRadius: "12px",
                                fontSize: "13px",
                            }}
                            formatter={(value: number | undefined, name: string | undefined) => [formatDuration(value ?? 0), name === "avgDuration" ? "Avg" : "Max"]}
                            labelFormatter={(_label: ReactNode, payload) => {
                                const item = payload?.[0]?.payload as { fullTitle?: string; file?: string; runs?: number } | undefined;
                                return item?.fullTitle ? `${item.fullTitle}\n${shortenPath(item.file ?? "")} (${item.runs ?? 0} runs)` : "";
                            }}
                        />
                        <Bar dataKey="avgDuration" fill="#6E1CE9" radius={[0, 6, 6, 0]} barSize={14} name="Avg" />
                        <Bar dataKey="maxDuration" fill="#C9C6F0" radius={[0, 6, 6, 0]} barSize={14} name="Max" />
                    </BarChart>
                </ResponsiveContainer>
            )}
        </Card>
    );
}

// --- Flaky Tests Table ---
function FlakyTestsTable({ data }: { data: FlakyTest[] }) {
    return (
        <Card>
            <p className="font-display text-lg font-semibold text-text-primary">Flaky Tests</p>
            <p className="mb-4 text-sm text-text-secondary">Tests with inconsistent results</p>
            {data.length === 0 ? (
                <p className="py-8 text-center text-sm text-text-secondary">No flaky tests detected</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b border-border text-text-secondary">
                                <th className="pb-2 pr-4 font-medium">Test</th>
                                <th className="pb-2 pr-4 font-medium text-right">Runs</th>
                                <th className="pb-2 pr-4 font-medium text-right">Fails</th>
                                <th className="pb-2 font-medium text-right">Flaky Rate</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((t, i) => (
                                <tr key={i} className="border-b border-border/50 last:border-0">
                                    <td className="py-2.5 pr-4">
                                        <p className="font-medium text-text-primary truncate max-w-[220px]" title={t.testTitle}>
                                            {t.testTitle}
                                        </p>
                                        <p className="text-xs text-text-secondary truncate max-w-[220px]" title={t.testFile}>
                                            {shortenPath(t.testFile)}
                                        </p>
                                    </td>
                                    <td className="py-2.5 pr-4 text-right text-text-primary">{t.totalRuns}</td>
                                    <td className="py-2.5 pr-4 text-right text-rose-600 font-medium">{t.failCount}</td>
                                    <td className="py-2.5 text-right">
                                        <span
                                            className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                                                t.flakyRate >= 50
                                                    ? "bg-rose-100 text-rose-700"
                                                    : t.flakyRate >= 25
                                                      ? "bg-amber-100 text-amber-700"
                                                      : "bg-yellow-50 text-yellow-700"
                                            }`}
                                        >
                                            {t.flakyRate}%
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </Card>
    );
}

// --- Project Breakdown Chart ---
function ProjectBreakdownChart({ data }: { data: ProjectBreakdown[] }) {
    return (
        <Card>
            <p className="font-display text-lg font-semibold text-text-primary">Results by Project</p>
            <p className="mb-4 text-sm text-text-secondary">Pass/fail per project</p>
            {data.length === 0 ? (
                <p className="py-8 text-center text-sm text-text-secondary">No project data</p>
            ) : (
                <div className="flex flex-col gap-3">
                    {data.map((p) => (
                        <div key={p.project}>
                            <div className="mb-1 flex items-center justify-between text-sm">
                                <span className="font-medium text-text-primary truncate max-w-[200px]" title={p.project}>
                                    {p.project}
                                </span>
                                <span className="text-text-secondary">
                                    {p.passRate}% <span className="text-xs">({p.total})</span>
                                </span>
                            </div>
                            <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface">
                                <div className="flex h-full">
                                    <div
                                        className="h-full rounded-l-full bg-emerald-500 transition-all"
                                        style={{ width: `${p.total > 0 ? (p.passed / p.total) * 100 : 0}%` }}
                                    />
                                    <div
                                        className="h-full bg-rose-500 transition-all"
                                        style={{ width: `${p.total > 0 ? (p.failed / p.total) * 100 : 0}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                    <div className="mt-1 flex items-center gap-4 text-xs text-text-secondary">
                        <span className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-emerald-500" /> Passed
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-rose-500" /> Failed
                        </span>
                    </div>
                </div>
            )}
        </Card>
    );
}

// --- Branch Health ---
function BranchHealth({ data }: { data: TestResultsDashboardData["recentBranches"] }) {
    const chartData = data.map((b) => ({
        branch: b.branch.length > 20 ? b.branch.slice(0, 20) + "..." : b.branch,
        fullBranch: b.branch,
        passed: b.passed,
        failed: b.failed,
    }));

    return (
        <Card className="col-span-1 lg:col-span-2">
            <p className="font-display text-lg font-semibold text-text-primary">Branch Health</p>
            <p className="mb-4 text-sm text-text-secondary">Recent branches by test outcomes</p>
            {chartData.length === 0 ? (
                <p className="py-8 text-center text-sm text-text-secondary">No branch data</p>
            ) : (
                <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                        <XAxis dataKey="branch" tick={{ fontSize: 11, fill: "var(--text-secondary)" }} />
                        <YAxis tick={{ fontSize: 12, fill: "var(--text-secondary)" }} />
                        <Tooltip
                            contentStyle={{
                                background: "var(--card)",
                                border: "1px solid var(--border)",
                                borderRadius: "12px",
                                fontSize: "13px",
                            }}
                            labelFormatter={(_label: ReactNode, payload) => {
                                const item = payload?.[0]?.payload as { fullBranch?: string } | undefined;
                                return item?.fullBranch ?? "";
                            }}
                        />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: "13px" }} />
                        <Bar dataKey="passed" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} name="Passed" />
                        <Bar dataKey="failed" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} name="Failed" />
                    </BarChart>
                </ResponsiveContainer>
            )}
        </Card>
    );
}

// --- Main Export ---
export default function TestResultsCharts({ data }: { data: TestResultsDashboardData }) {
    const hasData = data.totalTests > 0;

    if (!hasData) {
        return (
            <div className="mt-10">
                <h2 className="mb-4 font-display text-xl font-semibold text-text-primary">Test Results</h2>
                <Card>
                    <div className="flex flex-col items-center justify-center py-12">
                        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-7 w-7 text-text-secondary">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0 1 12 15a9.065 9.065 0 0 0-6.23.693L5 14.5m14.8.8 1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0 1 12 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
                            </svg>
                        </div>
                        <p className="text-lg font-semibold text-text-primary">No test results yet</p>
                        <p className="mt-1 text-sm text-text-secondary">
                            Send test results via POST /api/test-results to see analytics here
                        </p>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="mt-10">
            <h2 className="mb-6 font-display text-xl font-semibold text-text-primary">Test Results</h2>

            {/* Summary stats */}
            <SummaryStats
                totalTests={data.totalTests}
                passRate={data.passRate}
                avgDuration={data.avgDuration}
                totalFailures={data.totalFailures}
            />

            {/* Charts grid */}
            <div className="mt-6 grid gap-6 lg:grid-cols-3">
                {/* Status donut - 1 col */}
                <StatusDonut data={data.statusDistribution} />

                {/* Daily trend - 2 cols */}
                <DailyTrendChart data={data.dailyTrend} />
            </div>

            {/* Second row */}
            <div className="mt-6 grid gap-6 lg:grid-cols-3">
                {/* Project breakdown - 1 col */}
                <ProjectBreakdownChart data={data.projectBreakdown} />

                {/* Slowest tests - 2 cols */}
                <SlowestTestsChart data={data.slowestTests} />
            </div>

            {/* Third row */}
            <div className="mt-6 grid gap-6 lg:grid-cols-3">
                {/* Flaky tests - 1 col */}
                <FlakyTestsTable data={data.flakyTests} />

                {/* Branch health - 2 cols */}
                <BranchHealth data={data.recentBranches} />
            </div>
        </div>
    );
}
