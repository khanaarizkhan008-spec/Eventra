import * as React from "react";
import { cn } from "@/utils/cn";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-xl border border-zinc-800 bg-[#09090B] px-3.5 py-2 text-sm text-white placeholder:text-zinc-500 transition-colors focus-visible:outline-none focus-visible:border-[#A78BFA] focus-visible:ring-1 focus-visible:ring-[#A78BFA] disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };

