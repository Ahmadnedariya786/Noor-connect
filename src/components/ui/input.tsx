import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-primary)] px-4 py-2 text-base placeholder:text-[var(--text-secondary)]/50 focus-visible:outline-none focus-visible:border-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm transition-all duration-200 shadow-sm",
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
