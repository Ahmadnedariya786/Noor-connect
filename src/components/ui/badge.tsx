import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 backdrop-blur-sm",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary/90 text-primary-foreground hover:bg-primary shadow-sm",
        secondary: "border-transparent bg-secondary/90 text-secondary-foreground hover:bg-secondary shadow-sm",
        destructive: "border-transparent bg-destructive/90 text-destructive-foreground hover:bg-destructive shadow-sm",
        outline: "border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-secondary)]",
        premium: "border-primary/30 bg-primary/10 text-primary backdrop-blur-md shadow-[0_2px_8px_rgba(var(--primary),0.15)]",
        glass: "border-[var(--border)] bg-[var(--surface)]/60 text-[var(--text-primary)] backdrop-blur-md shadow-sm",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
