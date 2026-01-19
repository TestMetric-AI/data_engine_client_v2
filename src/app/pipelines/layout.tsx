import type { ReactNode } from "react";
import Sidebar from "@/components/dashboard/Sidebar";
import Topbar from "@/components/dashboard/Topbar";

type PipelinesLayoutProps = {
  children: ReactNode;
};

export default function PipelinesLayout({ children }: PipelinesLayoutProps) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#ffffff_0%,_#f5f6fb_45%,_#eef2ff_100%)]">
      <div className="flex min-h-screen flex-col lg:flex-row lg:items-stretch">
        <Sidebar />
        <div className="flex flex-1 flex-col">
          <Topbar />
          <main className="flex-1 px-6 py-8 sm:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
