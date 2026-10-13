import { useEffect, useState, useMemo, useRef } from "react";
import { Smartphone } from "lucide-react";
import logoMark from "@/assets/logo-mark.svg";
import { getAnimationTier } from "@/lib/device-performance";

interface NavigatorWithStandalone extends Navigator {
    standalone?: boolean;
}

const isStandaloneMode = (): boolean => {
    if (typeof window === 'undefined') return false;
    const navigatorWithStandalone = window.navigator as NavigatorWithStandalone;
    return (
        window.matchMedia('(display-mode: standalone)').matches ||
        Boolean(navigatorWithStandalone.standalone) ||
        document.referrer.includes('android-app://')
    );
};

// Star component purely for visual flair
function FloatingStars({ enabled }: { enabled: boolean }) {
    const stars = useMemo(() =>
        Array.from({ length: 12 }, (_, i) => ({
            id: i,
            x: Math.random() * 100,
            y: Math.random() * 100,
            size: Math.random() * 2 + 1,
            delay: Math.random() * 2,
        })), []
    );

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {!enabled ? null : stars.map((star) => (
                <div
                    key={star.id}
                    className="absolute rounded-full bg-amber-200/50 animate-[pulse_3s_ease-in-out_infinite]"
                    style={{
                        left: `${star.x}%`,
                        top: `${star.y}%`,
                        width: star.size,
                        height: star.size,
                        animationDelay: `${star.delay}s`,
                    }}
                />
            ))}
        </div>
    );
}

// Safe helper to release scroll lock and physically remove static splash node
export function forceReleaseSplashScrollLock(): void {
    try {
        document.documentElement.classList.remove("splash-active");
        document.body.classList.remove("splash-active");
        document.documentElement.style.overflow = "";
        document.body.style.overflow = "";
        document.documentElement.style.touchAction = "";
        document.body.style.touchAction = "";
        document.documentElement.style.overscrollBehavior = "";
        document.body.style.overscrollBehavior = "";
        const el = document.getElementById("static-splash");
        if (el) {
            el.remove();
        }
    } catch {
        // Safe fallback: ensure scroll unlock never throws
    }
}

interface SplashScreenProps {
    animationsEnabled: boolean;
    showGreeting: boolean;
    onComplete: () => void;
}

export function SplashScreen({ animationsEnabled, showGreeting, onComplete }: SplashScreenProps) {
    const [isFading, setIsFading] = useState(false);
    const [isMounted, setIsMounted] = useState(true);
    const hasTriggeredCompletionRef = useRef(false);

    const prefersReducedMotion = useMemo(() => {
        if (typeof window === 'undefined') return false;
        try {
            return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        } catch {
            return false;
        }
    }, []);

    const tier = useMemo(() => {
        try {
            return getAnimationTier();
        } catch {
            return { shouldReduceAnimations: false };
        }
    }, []);

    const shouldAnimate = animationsEnabled && !prefersReducedMotion && !tier.shouldReduceAnimations;

    useEffect(() => {
        // Physically remove the pre-React static splash element from DOM so no duplicate or touch-blocking layer remains
        const staticSplash = document.getElementById("static-splash");
        if (staticSplash) {
            staticSplash.remove();
        }

        // Lock scroll while splash is active
        document.documentElement.classList.add("splash-active");
        document.body.classList.add("splash-active");

        const triggerComplete = () => {
            if (hasTriggeredCompletionRef.current) return;
            hasTriggeredCompletionRef.current = true;
            setIsMounted(false);
            forceReleaseSplashScrollLock();
            try {
                onComplete();
            } catch (e) {
                console.warn('Splash onComplete callback error', e);
            }
        };

        // Snappy splash duration allowing ambient glow pulse and loading dots
        const baseDuration = shouldAnimate ? 1100 : 100;

        const fadeTimer = setTimeout(() => {
            setIsFading(true);
            setTimeout(() => {
                triggerComplete();
            }, 200);
        }, baseDuration);

        return () => {
            clearTimeout(fadeTimer);
            forceReleaseSplashScrollLock();
        };
    }, [shouldAnimate, onComplete]);

    if (!isMounted) return null;

    return (
        <div
            className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#0E0B1E] overflow-hidden transition-opacity duration-300 ${isFading ? 'opacity-0' : 'opacity-100'}`}
            style={{
                background: "radial-gradient(ellipse at center, #181335 0%, #0E0B1E 60%, #080612 100%)",
                willChange: "opacity",
                transform: "translateZ(0)",
            }}
        >
            {/* Stars Background */}
            <FloatingStars enabled={shouldAnimate} />

            {/* Main Content: Logo + Staggered Wordmark */}
            <div className="relative z-10 flex flex-col items-center justify-center space-y-5 px-6">
                
                {/* 1. Logo Emblem */}
                <div className="relative">
                    {/* Subtle ambient gold glow behind logo */}
                    <div
                        className={`absolute inset-0 rounded-3xl pointer-events-none ${
                            shouldAnimate ? 'animate-pulse opacity-50' : 'opacity-30'
                        }`}
                        style={{
                            background: "radial-gradient(circle, rgba(245, 197, 66, 0.4) 0%, transparent 70%)",
                            filter: "blur(24px)",
                            transform: "scale(1.3)",
                        }}
                    />

                    <img
                        src={logoMark}
                        alt="Noor Connect Logo"
                        className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 object-contain relative z-10 drop-shadow-[0_12px_32px_rgba(245,197,66,0.28)]"
                    />
                </div>

                {/* 2. Wordmark "Noor Connect" + Tagline */}
                <div className="relative flex flex-col items-center justify-center space-y-1.5">
                    {/* Subtle golden shimmer pulse glow */}
                    <div
                        className={`absolute -inset-3 rounded-full pointer-events-none ${
                            shouldAnimate ? 'animate-pulse opacity-40' : 'opacity-20'
                        }`}
                        style={{
                            background: "radial-gradient(circle, rgba(245, 197, 66, 0.25) 0%, transparent 75%)",
                            filter: "blur(16px)",
                        }}
                    />

                    <h1
                        className="text-2xl sm:text-3xl md:text-4xl font-extrabold uppercase tracking-[0.24em] text-center select-none relative z-10"
                        style={{
                            background: "linear-gradient(135deg, #FDE68A 0%, #F5C542 35%, #E8A317 70%, #D48F0E 100%)",
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                            backgroundClip: "text",
                            fontFamily: "system-ui, -apple-system, 'Montserrat', 'Poppins', 'Segoe UI', sans-serif",
                            letterSpacing: "0.22em",
                        }}
                    >
                        Noor Connect
                    </h1>

                    {showGreeting && (
                        <p
                            className="text-xs uppercase tracking-[0.32em] font-semibold text-[#D4AF37]/80 text-center select-none relative z-10"
                        >
                            Islamic Companion
                        </p>
                    )}
                </div>

                {/* Subtle golden loading pulse dots */}
                <div className="w-full max-w-sm min-h-[32px] flex items-center justify-center mt-4">
                    <div className="flex space-x-2">
                        {[0, 1, 2].map((i) => (
                            <div
                                key={i}
                                className={`w-2 h-2 rounded-full bg-[#F5C542] ${shouldAnimate ? 'animate-bounce' : ''}`}
                                style={{
                                    boxShadow: "0 0 10px rgba(245, 197, 66, 0.6)",
                                    animationDelay: `${i * 0.15}s`
                                }}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Bottom Golden Haze */}
            <div
                className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
                style={{
                    background: "linear-gradient(to top, rgba(245, 197, 66, 0.08), transparent)",
                }}
            />

            {/* APK Indicator */}
            {isStandaloneMode() && (
                <div className="absolute top-4 right-4 flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-amber-400/20">
                    <Smartphone className="w-3.5 h-3.5 text-amber-300/80" />
                    <span className="text-xs text-amber-200/80 font-medium">App Mode</span>
                </div>
            )}
        </div>
    );
}
