import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import hapticService from "@/lib/haptic-service";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_2px_8px_hsl(var(--primary)/0.3)] hover:shadow-[0_4px_12px_hsl(var(--primary)/0.4)]",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-[0_2px_8px_hsl(var(--destructive)/0.3)]",
        outline: "border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] hover:border-[var(--accent)] hover:text-[var(--accent-text)] hover:bg-[var(--surface-2)] shadow-xs",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-sm",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        premium: "bg-gradient-to-r from-primary via-primary-glow to-primary text-primary-foreground hover:brightness-110 shadow-[0_4px_16px_hsl(var(--primary)/0.4)] hover:shadow-[0_6px_24px_hsl(var(--primary)/0.5)] border border-primary/20",
        glass: "glass-card text-foreground hover:bg-white/80 dark:hover:bg-black/60",
      },
      size: {
        default: "h-11 px-5 py-2.5",
        sm: "h-9 rounded-lg px-3 text-xs",
        lg: "h-12 rounded-xl px-8 text-base",
        icon: "h-11 w-11",
        fab: "h-14 w-14 rounded-full shadow-lg",
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
  ({ className, variant, size, asChild = false, onClick, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      // Trigger haptic feedback on button press
      hapticService.trigger('light').catch(() => {
        // Silently fail if haptics not available
      });
      
      // Call original onClick handler
      if (onClick) {
        onClick(e);
      }
    };
    
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} onClick={handleClick} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
