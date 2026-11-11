import * as React from "react";
import { cn } from "@/utils/cn";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[96px] w-full rounded-xl border border-zinc-800 bg-[#09090B] px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-500 transition-colors focus-visible:outline-none focus-visible:border-[#A78BFA] focus-visible:ring-1 focus-visible:ring-[#A78BFA] disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };

