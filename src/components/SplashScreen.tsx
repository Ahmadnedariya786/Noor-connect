import { useEffect, useState, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { NoorLogoCrest } from "@/components/NoorLogoCrest";
import { getAnimationTier } from "@/lib/device-performance";

const FIXED_STARS = [
    { id: 1, x: 18, y: 22, size: 2, delay: 0 },
    { id: 2, x: 82, y: 19, size: 2.5, delay: 0.5 },
    { id: 3, x: 25, y: 75, size: 1.5, delay: 1.0 },
    { id: 4, x: 78, y: 72, size: 2, delay: 1.5 },
    { id: 5, x: 12, y: 48, size: 2, delay: 0.8 },
    { id: 6, x: 88, y: 52, size: 1.5, delay: 1.2 },
    { id: 7, x: 35, y: 15, size: 2.2, delay: 0.3 },
    { id: 8, x: 65, y: 84, size: 1.8, delay: 1.7 },
];

function CelestialStars({ enabled }: { enabled: boolean }) {
    if (!enabled) return null;
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
            {FIXED_STARS.map((star) => (
                <div
                    key={star.id}
                    className="absolute rounded-full animate-[pulseStar_3s_ease-in-out_infinite]"
                    style={{
                        left: `${star.x}%`,
                        top: `${star.y}%`,
                        width: star.size,
                        height: star.size,
                        backgroundColor: 'var(--accent-text)',
                        opacity: 0.45,
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
        const elInitial = document.getElementById("initial-splash");
        if (elInitial) {
            elInitial.remove();
        }
        const elStatic = document.getElementById("static-splash");
        if (elStatic) {
            elStatic.remove();
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
    const [progress, setProgress] = useState(15);
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

    const triggerComplete = useRef(() => {
        if (hasTriggeredCompletionRef.current) return;
        hasTriggeredCompletionRef.current = true;
        setIsMounted(false);
        forceReleaseSplashScrollLock();
        try {
            onComplete();
        } catch (e) {
            console.warn('Splash onComplete callback error', e);
        }
    }).current;

    useEffect(() => {
        // Lock scroll while splash is active
        document.documentElement.classList.add("splash-active");
        document.body.classList.add("splash-active");

        // Keep <SplashScreen /> mounted at opacity: 1 (100% solid opaque) BEFORE removing #initial-splash.
        // Remove #initial-splash inside requestAnimationFrame right after <SplashScreen /> paints at opacity: 1.
        const rafId = requestAnimationFrame(() => {
            const elInitial = document.getElementById("initial-splash");
            if (elInitial) elInitial.remove();
            const elStatic = document.getElementById("static-splash");
            if (elStatic) elStatic.remove();
        });

        if (!shouldAnimate) {
            const timer = setTimeout(() => {
                triggerComplete();
            }, 80);
            return () => {
                cancelAnimationFrame(rafId);
                clearTimeout(timer);
                forceReleaseSplashScrollLock();
            };
        }

        // Animate progress smoothly from 15% to 100% over ~850ms
        const startTime = performance.now();
        const duration = 850;
        let animFrameId: number;

        const updateProgress = (now: number) => {
            const elapsed = now - startTime;
            const factor = Math.min(1, elapsed / duration);
            // Smooth ease-out cubic curve from 15 to 100
            const eased = 1 - Math.pow(1 - factor, 3);
            const currentProgress = Math.round(15 + eased * 85);
            setProgress(currentProgress);

            if (factor < 1) {
                animFrameId = requestAnimationFrame(updateProgress);
            } else {
                setProgress(100);
                // Pause 50ms at 100%, then trigger fast 160ms exit transition
                setTimeout(() => {
                    setIsFading(true);
                    setTimeout(() => {
                        triggerComplete();
                    }, 160);
                }, 50);
            }
        };

        animFrameId = requestAnimationFrame(updateProgress);

        return () => {
            cancelAnimationFrame(rafId);
            cancelAnimationFrame(animFrameId);
            forceReleaseSplashScrollLock();
        };
    }, [shouldAnimate, triggerComplete]);

    if (!isMounted) return null;

    const splashContent = (
        <div
            id="react-splash-screen"
            className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden"
            style={{
                position: 'fixed',
                inset: 0,
                width: '100vw',
                height: '100dvh',
                zIndex: 2147483647,
                backgroundColor: 'var(--bg-base)',
                backgroundImage: 'radial-gradient(circle at 50% 38%, var(--accent-soft) 0%, var(--bg-elev) 45%, var(--bg-base) 100%)',
                color: 'var(--text-primary)',
                opacity: isFading ? 0 : 1,
                transition: 'opacity 160ms ease-out',
                pointerEvents: isFading ? 'none' : 'all',
                willChange: 'opacity',
            }}
        >
            {/* Stars Background */}
            <CelestialStars enabled={shouldAnimate} />

            {/* Main Content: 100% Pixel-Identical Match with index.html initial-splash */}
            <div
                className="relative z-10 flex flex-col items-center justify-center text-center select-none"
                style={{ padding: '24px' }}
            >
                {/* 1. Celestial Rub el Hizb Medallion (170x170 center, 88x88 squircle, 56px SVG) */}
                <NoorLogoCrest size="lg" animated={shouldAnimate} />

                {/* 2. Brand Title: NOOR CONNECT */}
                <h1
                    style={{
                        margin: '20px 0 0 0',
                        fontSize: '1.25rem',
                        fontWeight: 800,
                        letterSpacing: '0.22em',
                        color: 'var(--accent-text)',
                        textShadow: '0 0 18px var(--accent-glow)',
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
                            color: 'var(--text-secondary)',
                            textAlign: 'center',
                            textTransform: 'uppercase',
                            fontFamily: 'system-ui, -apple-system, sans-serif',
                        }}
                    >
                        ISLAMIC COMPANION
                    </p>
                )}

                {/* 4. Sleek Unified Single-Hue Progress Beam (140px track, no split colors) */}
                <div
                    style={{
                        width: '140px',
                        height: '3px',
                        background: 'var(--surface-2)',
                        borderRadius: '999px',
                        overflow: 'hidden',
                        marginTop: '22px',
                        position: 'relative',
                    }}
                >
                    <div
                        style={{
                            height: '100%',
                            width: `${progress}%`,
                            borderRadius: '999px',
                            background: 'linear-gradient(90deg, color-mix(in srgb, var(--accent) 55%, transparent), var(--accent), var(--accent-text))',
                            boxShadow: '0 0 10px var(--accent)',
                            transition: shouldAnimate ? 'width 60ms linear' : 'none',
                        }}
                    />
                </div>
            </div>

            {/* Bottom Theme Haze */}
            <div
                className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
                style={{
                    background: 'linear-gradient(to top, var(--accent-soft), transparent)',
                }}
            />
        </div>
    );

    if (typeof document !== 'undefined') {
        return createPortal(splashContent, document.body);
    }
    return splashContent;
}
