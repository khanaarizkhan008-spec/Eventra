import type { ReactNode } from "react";
import { CalendarX2 } from "lucide-react";

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 bg-[#141419]/60 px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-zinc-800 bg-[#09090B] text-[#A78BFA]">
        {icon || <CalendarX2 className="h-6 w-6" />}
      </div>
      <h3 className="mt-4 text-lg font-semibold text-white">{title}</h3>
      <p className="mt-1.5 max-w-md text-sm text-[#A1A1AA]">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

