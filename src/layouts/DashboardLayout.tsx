import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { PublicLayout } from "./PublicLayout";
import { cn } from "@/utils/cn";

export interface DashboardTabItem {
  label: string;
  to: string;
  end?: boolean;
}

export function DashboardLayout({
  title,
  subtitle,
  tabs,
  actions,
  children,
}: {
  title: string;
  subtitle: string;
  tabs?: DashboardTabItem[];
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <PublicLayout>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-4 border-b border-zinc-800/80 pb-6 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              {title}
            </h1>
            <p className="mt-1 text-sm text-[#A1A1AA]">{subtitle}</p>
          </div>
          {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
        </div>

        {tabs && tabs.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.end}
                className={({ isActive }) =>
                  cn(
                    "rounded-xl border px-4 py-2 text-xs font-semibold transition-all",
                    isActive
                      ? "border-[#A78BFA]/40 bg-[#A78BFA]/15 text-[#A78BFA]"
                      : "border-zinc-800 bg-[#141419] text-[#A1A1AA] hover:border-zinc-700 hover:text-white",
                  )
                }
              >
                {tab.label}
              </NavLink>
            ))}
          </div>
        )}

        <div className="mt-8">{children}</div>
      </div>
    </PublicLayout>
  );
}

