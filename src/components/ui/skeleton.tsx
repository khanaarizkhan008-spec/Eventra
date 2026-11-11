import { cn } from "@/utils/cn";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "skeleton-shimmer rounded-xl border border-zinc-800/50 bg-[#141419]",
        className,
      )}
    />
  );
}

