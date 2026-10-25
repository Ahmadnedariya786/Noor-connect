import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      duration={2600}
      toastOptions={{
        duration: 2600,
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background/95 group-[.toaster]:backdrop-blur-xl group-[.toaster]:text-foreground group-[.toaster]:border-border/50 group-[.toaster]:shadow-[var(--elevation-4)] group-[.toaster]:rounded-xl",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:rounded-lg",
          cancelButton: "group-[.toast]:bg-muted group-[.toaster]:text-muted-foreground group-[.toast]:rounded-lg",
          success: "group-[.toast]:border-[var(--success)]/30 group-[.toast]:bg-[var(--success)]/10",
          error: "group-[.toast]:border-red-500/30 group-[.toast]:bg-red-500/10",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
