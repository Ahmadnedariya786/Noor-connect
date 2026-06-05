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
    <header className={cn("sticky top-0 z-40 transition-all duration-300", className)}>
      {/* Gradient Background with Glassmorphism */}
      <div className="relative overflow-hidden">
        {/* Premium Gradient Background */}
        {!transparent && (
          <div className="absolute inset-0 bg-gradient-to-r from-[#1a4a4a] via-[#2c6e6e] to-[#3a5a5a] opacity-95" />
        )}

        {/* Animated Glow Effect */}
        {!transparent && (
          <div className="absolute top-0 left-1/4 w-32 h-32 bg-[#e0c097] rounded-full blur-[60px] opacity-20 animate-pulse" />
        )}

        {/* Glassmorphism Overlay */}
        {!transparent && (
          <div className="absolute inset-0 bg-white/5 backdrop-blur-sm" />
        )}

        {/* Content */}
        <div className="relative z-10 flex items-center h-16 px-4 max-w-lg mx-auto">
          {showBack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (onBack) {
                  onBack();
                } else {
                  goBackOrFallback(navigate, "/dashboard");
                }
              }}
              className="ms-2 -me-2 text-white/90 hover:bg-white/10 hover:text-white transition-all duration-200 hover:scale-105 rounded-xl nav-back"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}

          {/* Premium Title with App Icon */}
          <div className="flex-1 flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-primary/40 to-primary/20 backdrop-blur-sm border border-white/10">
              <img
                src="/icon-192x192.png"
                alt="Noor Connect"
                className="w-5 h-5 rounded-lg"
                onError={(e) => {
                  // Fallback to Sparkles icon if image fails to load
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const fallback = target.nextElementSibling as HTMLElement;
                  if (fallback) fallback.style.display = 'block';
                }}
              />
              <Sparkles
                className="w-4 h-4 text-[#e0c097]"
                style={{ display: 'none' }}
              />
            </div>
            <h1 className="text-xl font-bold text-white tracking-wide">{title}</h1>
          </div>

          {/* Actions */}
          {actions && (
            <div className="ml-auto">
              {actions}
            </div>
          )}
        </div>

        {/* Bottom Accent Line */}
        {!transparent && (
          <div className="absolute bottom-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#e0c097]/60 to-transparent" />
        )}
      </div>
    </header>
  );
}
