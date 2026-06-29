import { useEffect, useState, useMemo } from "react";
import { m, AnimatePresence } from "framer-motion";
import { Smartphone } from "lucide-react";

interface NavigatorWithStandalone extends Navigator {
    standalone?: boolean;
}

const isStandaloneMode = (): boolean => {
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
        Array.from({ length: 10 }, (_, i) => ({
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
                <m.div
                    key={star.id}
                    initial={{ opacity: 0.2, scale: 0.8 }}
                    animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.2, 0.8] }}
                    transition={{
                        duration: 3,
                        repeat: Infinity,
                        delay: star.delay,
                        ease: "easeInOut"
                    }}
                    className="absolute rounded-full bg-white/60"
                    style={{
                        left: `${star.x}%`,
                        top: `${star.y}%`,
                        width: star.size,
                        height: star.size,
                    }}
                />
            ))}
        </div>
    );
}

// App Icon Component
function AppIcon({ animationsEnabled }: { animationsEnabled: boolean }) {
    return (
        <m.div
            initial={animationsEnabled ? { scale: 0.8, opacity: 0, rotate: -180 } : false}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={animationsEnabled ? { duration: 1, ease: "easeOut" } : { duration: 0 }}
            className="relative"
        >
            {/* Icon Container with Premium Styling */}
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[#1a4a4a] via-[#2c6e6e] to-[#b38b5d] p-1 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                <div className="w-full h-full rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
                    {/* App Icon Image - Fixed sizing and proper display */}
                    <img
                        src="/icon-192x192.png"
                        alt="Noor Connect App Icon"
                        className="w-[72px] h-[72px] rounded-xl object-contain"
                        style={{ imageRendering: 'auto' }}
                        onError={(e) => {
                            // Fallback to SVG if image fails to load
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const fallback = target.nextElementSibling as HTMLElement;
                            if (fallback) fallback.style.display = 'block';
                        }}
                    />
                    {/* Fallback Crescent Moon Icon */}
                    <svg
                        width="56"
                        height="56"
                        viewBox="0 0 120 120"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        style={{ display: 'none' }}
                    >
                        <defs>
                            <linearGradient id="iconGoldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#FFD700" />
                                <stop offset="50%" stopColor="#D4AF37" />
                                <stop offset="100%" stopColor="#B8860B" />
                            </linearGradient>
                        </defs>
                        <path
                            d="M 60 10 A 40 40 0 1 0 60 110 A 32 32 0 1 1 60 10 Z"
                            fill="url(#iconGoldGradient)"
                        />
                    </svg>
                </div>
            </div>

            {/* Glow Effect */}
            <m.div
                className="absolute inset-0 rounded-2xl"
                initial={animationsEnabled ? { opacity: 0 } : { opacity: 0.35 }}
                animate={{ opacity: animationsEnabled ? 0.6 : 0.35 }}
                transition={animationsEnabled ? { delay: 0.5, duration: 1 } : { duration: 0 }}
                style={{
                    background: "radial-gradient(circle, rgba(212, 175, 55, 0.4) 0%, transparent 70%)",
                    filter: "blur(20px)",
                    transform: "scale(1.2)",
                }}
            />
        </m.div>
    );
}

interface SplashScreenProps {
    animationsEnabled: boolean;
    showGreeting: boolean;
    onComplete: () => void;
}

export function SplashScreen({ animationsEnabled, showGreeting, onComplete }: SplashScreenProps) {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        // Adaptive timing based on device performance
        const measurePerformance = () => {
            const start = performance.now();
            // Run a simple operation to measure performance
            for (let i = 0; i < 1000000; i++) {
                Math.sqrt(i);
            }
            const end = performance.now();
            return end - start;
        };

        const performanceScore = measurePerformance();
        
        // Calculate adaptive duration based on performance
        // Fast device (< 10ms): shorter duration
        // Medium device (10-30ms): medium duration
        // Slow device (> 30ms): longer duration
        let baseDuration: number;
        if (performanceScore < 10) {
            baseDuration = 800; // Fast device
        } else if (performanceScore < 30) {
            baseDuration = 1200; // Medium device
        } else {
            baseDuration = 1800; // Slow device
        }

        // Apply animation multiplier
        const duration = animationsEnabled ? baseDuration * 1.5 : baseDuration * 0.8;
        const exitDuration = animationsEnabled ? 400 : 0;

        const timer = setTimeout(() => {
            setIsVisible(false);
            setTimeout(onComplete, exitDuration);
        }, duration);

        return () => clearTimeout(timer);
    }, [animationsEnabled, onComplete]);

    return (
        <AnimatePresence>
            {isVisible && (
                <m.div
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={animationsEnabled ? { duration: 0.4, ease: "easeInOut" } : { duration: 0.08 }}
                    className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#0a1128] overflow-hidden"
                    style={{
                        background: "linear-gradient(135deg, #0a1128 0%, #1a237e 50%, #0d1b2a 100%)",
                    }}
                >
                    {/* Stars Background */}
                    <FloatingStars enabled={animationsEnabled} />

                    {/* Main Content */}
                    <div className="relative z-10 flex flex-col items-center justify-center space-y-6 px-4">
                        {/* App Icon */}
                        <AppIcon animationsEnabled={animationsEnabled} />

                        {/* App Title with Premium Glass Card */}
                        <div className="glass-card px-8 py-4">
                            <h1
                                className="text-4xl md:text-5xl font-bold text-center tracking-tight"
                                style={{
                                    background: "linear-gradient(135deg, #FFD700 0%, #D4AF37 50%, #B8860B 100%)",
                                    WebkitBackgroundClip: "text",
                                    WebkitTextFillColor: "transparent",
                                    backgroundClip: "text",
                                    fontFamily: "ui-serif, Georgia, Cambria, 'Times New Roman', Times, serif"
                                }}
                            >
                                Noor Connect
                            </h1>
                        </div>

                        {showGreeting && (
                            <p className="text-sm text-[#D4AF37]/80 uppercase tracking-[0.3em] font-semibold">
                                Islamic Companion
                            </p>
                        )}

                        {/* Reserve vertical space to prevent CLS when switching splash content */}
                        <div className="w-full max-w-sm min-h-[50px] flex items-center justify-center mt-8">
                            <m.div className="flex space-x-2">
                                {[0, 1, 2].map((i) => (
                                    <m.div
                                        key={i}
                                        className="w-2 h-2 rounded-full bg-[#D4AF37]"
                                        animate={animationsEnabled ? { y: [0, -6, 0] } : { y: 0 }}
                                        transition={animationsEnabled ? {
                                            duration: 0.6,
                                            repeat: Infinity,
                                            delay: i * 0.15,
                                            ease: "easeInOut"
                                        } : { duration: 0 }}
                                        style={{
                                            boxShadow: "0 0 8px rgba(212, 175, 55, 0.6)",
                                        }}
                                    />
                                ))}
                            </m.div>
                        </div>
                    </div>

                    {/* Bottom Golden Haze */}
                    <div
                        className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
                        style={{
                            background: "linear-gradient(to top, rgba(212, 175, 55, 0.1), transparent)",
                        }}
                    />

                    {/* APK Indicator */}
                    {isStandaloneMode() && (
                        <div className="absolute top-4 right-4 flex items-center gap-1 px-2 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/20">
                            <Smartphone className="w-3 h-3 text-white/60" />
                            <span className="text-xs text-white/60">App Mode</span>
                        </div>
                    )}
                </m.div>
            )}
        </AnimatePresence>
    );
}
