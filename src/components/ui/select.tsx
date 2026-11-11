import * as React from "react";
import { cn } from "@/utils/cn";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={cn(
          "flex h-10 w-full rounded-xl border border-zinc-800 bg-[#09090B] px-3 py-2 text-sm text-white transition-colors focus-visible:outline-none focus-visible:border-[#A78BFA] focus-visible:ring-1 focus-visible:ring-[#A78BFA] disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      >
        {children}
      </select>
    );
  },
);
Select.displayName = "Select";

export { Select };

