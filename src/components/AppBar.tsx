import { ArrowLeft, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";
import { goBackOrFallback } from "@/lib/navigation";

interface AppBarProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  actions?: React.ReactNode;
  transparent?: boolean;
  className?: string;
}

export function AppBar({
  title,
  showBack = false,
  onBack,
  actions,
  transparent = false,
  className
}: AppBarProps) {
  const navigate = useNavigate();

  return (
    <header className={cn("sticky top-0 z-40 transition-all duration-300", className)}
      style={{ background: transparent ? 'transparent' : 'hsl(var(--background) / 0.92)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(201,134,10,0.15)' }}
    >
      <div className="relative flex items-center h-[56px] px-4 max-w-lg mx-auto">
        {showBack && (
          <button
            onClick={() => { if (onBack) { onBack(); } else { goBackOrFallback(navigate, "/dashboard"); } }}
            className="w-9 h-9 flex items-center justify-center rounded-full transition-all duration-200 active:scale-90 border border-[#C9860A]/20 bg-card mr-3 hover:border-[#C9860A]/40"
          >
            <ArrowLeft className="w-4 h-4 text-foreground" />
          </button>
        )}

        <div className="flex-1">
          <h1 className="text-base font-bold font-serif italic text-foreground tracking-tight">{title}</h1>
        </div>

        {actions && (
          <div className="ml-auto">{actions}</div>
        )}
      </div>
    </header>
  );
}
