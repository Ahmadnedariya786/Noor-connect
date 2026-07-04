import { useNavigate } from "react-router-dom";
import { AppBar } from "@/components/AppBar";
import { PageTransition } from "@/components/PageTransition";
import { useLanguage } from "@/contexts/LanguageContext-new";
import { useIslamicCalendar } from "@/hooks/useIslamicCalendar";
import { useSettings } from "@/contexts/SettingsContext";
import { shouldShowMenstrualFeatures } from "@/lib/gender-settings";
import {
    MessageCircle, Radio, Target, Heart, Calculator,
    Star, Trophy, Coins, Calendar, Library, Tv, Sparkles, HeartHandshake, BookOpen, BookText, Moon, Headphones,
    CheckCircle, AlertTriangle, RotateCcw, Users, HeartPulse
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Services() {
    const { t } = useLanguage();
    const navigate = useNavigate();
    const { isEidAlFitr, isEidAlAdha, islamicInfo, isLoading } = useIslamicCalendar();
    const { animationEnabled } = useSettings();

    const shouldShowFitranaCalculator = (() => {
        if (isLoading || !islamicInfo) return false;
        const hijriMonth = islamicInfo.hijriMonth;
        const hijriDay = islamicInfo.hijriDay;
        if (hijriMonth === 9 && hijriDay >= 23) return true;
        return false;
    })();

    const shouldShowEidChecklist = (() => {
        if (isLoading || !islamicInfo) return false;
        const hijriMonth = islamicInfo.hijriMonth;
        const hijriDay = islamicInfo.hijriDay;
        if (hijriMonth === 9 && hijriDay >= 23) return true;
        if (isEidAlFitr && hijriMonth === 10 && hijriDay <= 3) return true;
        if (hijriMonth === 10 && hijriDay >= 4 && hijriDay <= 10) return true;
        if (hijriMonth === 12 && hijriDay >= 3 && hijriDay <= 9) return true;
        if (isEidAlAdha && hijriMonth === 12 && hijriDay >= 10 && hijriDay <= 12) return true;
        if (hijriMonth === 12 && hijriDay >= 13 && hijriDay <= 19) return true;
        return false;
    })();

    const showNoorCycle = shouldShowMenstrualFeatures();

    const baseServices = [
        { title: "Salah Tracker", path: "/prayer-stats", icon: CheckCircle, gradient: 'from-[#10B981] to-[#059669]' },
        { title: "Qaza Tracker", path: "/qaza", icon: AlertTriangle, gradient: 'from-[#D4AF37] to-[#B8962E]' },
        { title: "Quran Audio", path: "/quran-audio", icon: Headphones, gradient: 'from-[#0ea5e9] to-[#0369a1]' },
        { title: "Live Mecca", path: "/live", icon: Tv, gradient: 'from-[#f43f5e] to-[#be123c]' },
        { title: "Hadith", path: "/hadith/collections", icon: BookText, gradient: 'from-[#8b5cf6] to-[#6d28d9]' },
        { title: t('seerah'), path: "/seerah", icon: BookOpen, gradient: 'from-[#D4AF37] to-[#8B6914]' },
        { title: t('qisas'), path: "/qisas", icon: Users, gradient: 'from-[#10B981] to-[#047857]' },
        { title: "Radio", path: "/quran-radio", icon: Radio, gradient: 'from-[#14b8a6] to-[#0f766e]' },
        { title: "Habits", path: "/habit-tracker", icon: Target, gradient: 'from-[#ec4899] to-[#be185d]' },
        { title: "Duas", path: "/duas", icon: Heart, gradient: 'from-[#f97316] to-[#c2410c]' },
        ...(showNoorCycle ? [{ title: "Noor Cycle", path: "/noor-cycle", icon: HeartPulse as React.ComponentType<any>, gradient: 'from-[#e11d48] to-[#be123c]' as const }] : []),
        { title: "Remedies", path: "/islamic-remedies", icon: HeartHandshake, gradient: 'from-[#a855f7] to-[#7e22ce]' },
        { title: t('tasbih') || "Tasbih", path: "/tasbeeh", icon: Calculator, gradient: 'from-[#10B981] to-[#047857]' },
        { title: "Names", path: "/names-of-allah", icon: Star, gradient: 'from-[#D4AF37] to-[#eab308]' },
        { title: "Quiz", path: "/quiz", icon: Trophy, gradient: 'from-[#06b6d4] to-[#0e7490]' },
        { title: "Zakat", path: "/zakat", icon: Coins, gradient: 'from-[#f59e0b] to-[#b45309]' },
        { title: "Calendar", path: "/calendar", icon: Calendar, gradient: 'from-[#3b82f6] to-[#1d4ed8]' },
        { title: "E-Books", path: "/ebooks", icon: Library, gradient: 'from-[#6366f1] to-[#4338ca]' },
        { title: "Tafsir", path: "/tafsir", icon: BookOpen, gradient: 'from-[#22c55e] to-[#15803d]' },
    ];

    const conditionalServices = [];
    if (shouldShowFitranaCalculator) {
        conditionalServices.push(
            { title: "Fitrana Calc", path: "/fitrana-calculator", icon: Calculator, gradient: 'from-[#10b981] to-[#047857]' }
        );
    }
    if (shouldShowEidChecklist) {
        conditionalServices.push(
            { title: "Eid Checklist", path: "/eid-checklist", icon: Moon, gradient: 'from-[#D4AF37] to-[#b45309]' }
        );
    }

    const services = [
        ...baseServices.slice(0, 6),
        ...conditionalServices,
        ...baseServices.slice(6)
    ];

    const motionProps = (props: any) => animationEnabled ? props : {};

    return (
        <PageTransition>
            <div className="min-h-screen bg-background pb-32 transition-colors duration-300">
                <AppBar title="Services" showBack={true} />

                {/* Premium Featured Header Card */}
                <div className="px-5 pt-4 mb-8">
                    <motion.div 
                        {...motionProps({
                            initial: { opacity: 0, scale: 0.95 },
                            animate: { opacity: 1, scale: 1 },
                            transition: { duration: 0.5 }
                        })}
                        className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#0F3630] via-[#0A2622] to-[#1A1A1A] p-8 border border-white/5 shadow-2xl"
                    >
                        {/* Elegant Light Gradients */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-[#10B981]/20 rounded-full blur-[80px] pointer-events-none" />
                        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-[#D4AF37]/20 rounded-full blur-[60px] pointer-events-none" />
                        
                        <div className="relative z-10">
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-4">
                                <Sparkles className="w-4 h-4 text-emerald-400" />
                                <span className="text-white/90 text-[10px] font-black uppercase tracking-[0.2em]">Islamic Hub</span>
                            </div>
                            <h2 className="text-4xl font-black text-white leading-tight tracking-tight mb-2">
                                Discover<br/>Resources
                            </h2>
                            <p className="text-white/70 text-sm font-medium max-w-[85%] leading-relaxed">
                                Essential tools for your spiritual journey.
                            </p>
                        </div>
                    </motion.div>
                </div>

                {/* Premium Services Grid */}
                <div className="px-5 relative">
                    <div className="grid grid-cols-2 gap-4">
                        <AnimatePresence>
                            {services.map((item, idx) => (
                                <motion.button
                                    key={idx}
                                    {...motionProps({
                                        initial: { opacity: 0, y: 20 },
                                        animate: { opacity: 1, y: 0 },
                                        transition: { delay: idx * 0.05, duration: 0.4 },
                                        whileTap: { scale: 0.95 }
                                    })}
                                    onClick={() => navigate(item.path)}
                                    className="group relative flex flex-col items-start p-5 bg-card backdrop-blur-xl border border-border/40 rounded-[28px] overflow-hidden text-left shadow-sm"
                                >
                                    {/* Icon Box with Vibrant Gradient */}
                                    <div className={`flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br ${item.gradient} shadow-lg mb-4`}>
                                        <item.icon className="w-5 h-5 text-white" strokeWidth={2.5} />
                                    </div>

                                    {/* Title Container */}
                                    <h3 className="font-bold text-sm text-foreground leading-tight">
                                        {item.title}
                                    </h3>
                                    
                                    {/* Dynamic Glow Effect */}
                                    <div className={`absolute -inset-0 opacity-0 group-hover:opacity-10 bg-gradient-to-br ${item.gradient} transition-opacity duration-500 pointer-events-none`} />
                                </motion.button>
                            ))}
                        </AnimatePresence>
                    </div>
                </div>

                <div className="px-8 mt-12 text-center opacity-30 pb-8">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground">
                        Noor Connect
                    </p>
                </div>
            </div>
        </PageTransition>
    );
}
