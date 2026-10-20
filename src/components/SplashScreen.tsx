import { useEffect, useState, useMemo, useRef } from "react";
import { Smartphone } from "lucide-react";
import { NoorLogoCrest } from "@/components/NoorLogoCrest";
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
            className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#150D2E] overflow-hidden transition-all duration-300 ${isFading ? 'opacity-0 scale-[1.02] pointer-events-none' : 'opacity-100 scale-100'}`}
            style={{
                background: "radial-gradient(ellipse at center, #24164c 0%, #150D2E 60%, #0a0618 100%)",
                willChange: "opacity, transform",
            }}
        >
            {/* Stars Background */}
            <FloatingStars enabled={shouldAnimate} />

            {/* Main Content: Exact Match with static-splash for 0 layout jump */}
            <div
                className="relative z-10 flex flex-col items-center justify-center text-center select-none"
                style={{ padding: '24px' }}
            >
                {/* 1. Celestial Rub el Hizb Medallion */}
                <NoorLogoCrest size="lg" animated={shouldAnimate} />

                {/* 2. Brand Title: NOOR CONNECT */}
                <h1
                    style={{
                        margin: '20px 0 0 0',
                        fontSize: '1.25rem',
                        fontWeight: 800,
                        letterSpacing: '0.22em',
                        background: 'linear-gradient(180deg, #FFF7E0 0%, #E5B85B 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        textAlign: 'center',
                        textTransform: 'uppercase',
                        fontFamily: 'system-ui, -apple-system, sans-serif',
                    }}
                >
                    NOOR CONNECT
                </h1>

                {/* 3. Subtitle: ISLAMIC COMPANION */}
                {showGreeting && (
                    <p
                        style={{
                            margin: '6px 0 0 0',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            letterSpacing: '0.30em',
                            color: 'rgba(235, 205, 140, 0.82)',
                            textAlign: 'center',
                            textTransform: 'uppercase',
                            fontFamily: 'system-ui, -apple-system, sans-serif',
                        }}
                    >
                        ISLAMIC COMPANION
                    </p>
                )}

                {/* 4. Sleek Gold Shimmer Loader Bar */}
                <div
                    style={{
                        width: '120px',
                        height: '3px',
                        background: 'rgba(255,255,255,0.08)',
                        borderRadius: '999px',
                        overflow: 'hidden',
                        marginTop: '22px',
                        position: 'relative',
                    }}
                >
                    <div
                        style={{
                            position: 'absolute',
                            inset: 0,
                            width: '100%',
                            height: '100%',
                            background: 'linear-gradient(90deg, transparent, #F5C35A, #FFF3D1, #F5C35A, transparent)',
                            animation: shouldAnimate ? 'shimmerComet 1.6s ease-in-out infinite' : undefined,
                        }}
                    />
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
