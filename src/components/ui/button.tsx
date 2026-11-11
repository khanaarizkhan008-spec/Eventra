import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/utils/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A78BFA] focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090B] disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-[#8B5CF6] text-white hover:bg-[#7C3AED] shadow-sm shadow-[#8B5CF6]/20",
        accent:
          "bg-[#A78BFA] text-[#09090B] hover:bg-[#C4B5FD]",
        secondary:
          "bg-[#141419] text-white border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900",
        outline:
          "border border-zinc-800 bg-transparent text-white hover:bg-white/5 hover:border-zinc-700",
        ghost:
          "text-[#A1A1AA] hover:text-white hover:bg-white/5",
        destructive:
          "bg-rose-600/90 text-white hover:bg-rose-600",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-lg px-3 text-xs",
        lg: "h-11 rounded-xl px-6 text-sm",
        pill: "h-11 rounded-full px-6 text-sm",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };

