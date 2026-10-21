import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AppBar } from "@/components/AppBar";
import { PageTransition } from "@/components/PageTransition";
import { useLanguage } from "@/contexts/LanguageContext-new";
import { useIslamicCalendar } from "@/hooks/useIslamicCalendar";
import { useSettings } from "@/contexts/SettingsContext";
import { shouldShowMenstrualFeatures } from "@/lib/gender-settings";
import {
    Radio, Target, Heart, Calculator,
    Star, Trophy, Coins, Calendar, Library, Tv, Sparkles, HeartHandshake, BookOpen, BookText, Moon, Headphones,
    CheckCircle, AlertTriangle, Users, HeartPulse, Music, Search, X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
const SERVICE_CATEGORIES: Record<string, string> = {
    "/prayer-stats": "Worship",
    "/qaza": "Worship",
    "/quran-audio": "Audio",
    "/nasheeds": "Audio",
    "/live": "Live",
    "/hadith/collections": "Knowledge",
    "/seerah": "Knowledge",
    "/qisas": "Knowledge",
    "/quran-radio": "Audio",
    "/habit-tracker": "Worship",
    "/duas": "Worship",
    "/noor-cycle": "Wellness",
    "/islamic-remedies": "Wellness",
    "/tasbeeh": "Worship",
    "/names-of-allah": "Knowledge",
    "/quiz": "Knowledge",
    "/zakat": "Tools",
    "/calendar": "Tools",
    "/ebooks": "Knowledge",
    "/tafsir": "Knowledge",
    "/fitrana-calculator": "Tools",
    "/eid-checklist": "Worship",
};

export default function Services() {
    const { t } = useLanguage();
    const navigate = useNavigate();
    const { isEidAlFitr, isEidAlAdha, islamicInfo, isLoading } = useIslamicCalendar();
    const { animationEnabled } = useSettings();
    const [searchQuery, setSearchQuery] = useState("");

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
        { title: "Salah Tracker", subtitle: "30-day prayer analytics", path: "/prayer-stats", icon: CheckCircle },
        { title: "Qaza Tracker", subtitle: "Missed prayer makeup", path: "/qaza", icon: AlertTriangle },
        { title: "Quran Audio", subtitle: "289 reciters & HD audio", path: "/quran-audio", icon: Headphones },
        { title: "Nasheeds", subtitle: "400 vocals-only tracks", path: "/nasheeds", icon: Music },
        { title: "Live Mecca", subtitle: "24/7 Makkah & Madinah", path: "/live", icon: Tv },
        { title: "Hadith", subtitle: "16 authentic books", path: "/hadith/collections", icon: BookText },
        { title: t('seerah') || "Seerah", subtitle: "Prophetic biography", path: "/seerah", icon: BookOpen },
        { title: t('qisas') || "Prophets", subtitle: "25 Quranic stories", path: "/qisas", icon: Users },
        { title: "Radio", subtitle: "24/7 live stations", path: "/quran-radio", icon: Radio },
        { title: "Habits", subtitle: "Daily Sunnah deeds", path: "/habit-tracker", icon: Target },
        { title: "Duas", subtitle: "80 authentic duas", path: "/duas", icon: Heart },
        ...(showNoorCycle ? [{ title: "Noor Cycle", subtitle: "Menstrual & worship guidance", path: "/noor-cycle", icon: HeartPulse as React.ComponentType<any> }] : []),
        { title: "Remedies", subtitle: "Mood-based healing", path: "/islamic-remedies", icon: HeartHandshake },
        { title: t('tasbih') || "Tasbih", subtitle: "Tactile dhikr counter", path: "/tasbeeh", icon: Calculator },
        { title: "Names", subtitle: "99 Asma'ul Husna", path: "/names-of-allah", icon: Star },
        { title: "Quiz", subtitle: "Islamic knowledge quiz", path: "/quiz", icon: Trophy },
        { title: "Zakat", subtitle: "Nisab & wealth calc", path: "/zakat", icon: Coins },
        { title: "Calendar", subtitle: "Hijri dates & events", path: "/calendar", icon: Calendar },
        { title: "E-Books", subtitle: "Islamic book library", path: "/ebooks", icon: Library },
        { title: "Tafsir", subtitle: "Ayah commentary", path: "/tafsir", icon: BookOpen },
    ];

    const conditionalServices = [];
    if (shouldShowFitranaCalculator) {
        conditionalServices.push(
            { title: "Fitrana Calc", subtitle: "Ramadan charity calculation", path: "/fitrana-calculator", icon: Calculator }
        );
    }
    if (shouldShowEidChecklist) {
        conditionalServices.push(
            { title: "Eid Checklist", subtitle: "Sunnahs & preparation guide", path: "/eid-checklist", icon: Moon }
        );
    }

    const allServices = [
        ...baseServices.slice(0, 6),
        ...conditionalServices,
        ...baseServices.slice(6)
    ];

    const filteredServices = useMemo(() => {
        if (!searchQuery.trim()) return allServices;
        const q = searchQuery.toLowerCase().trim();
        return allServices.filter(s =>
            s.title.toLowerCase().includes(q) || s.subtitle.toLowerCase().includes(q)
        );
    }, [allServices, searchQuery]);

    const motionProps = (props: any) => animationEnabled ? props : {};

    return (
        <PageTransition>
            <div className="min-h-screen bg-[var(--bg-base)] pb-36 transition-colors duration-300">
                {/* No back button on root bottom-nav tab */}
                <AppBar title={t("services") || "Services"} showBack={false} />

                {/* Premium Featured Header Card */}
                <div className="px-4 sm:px-5 pt-4 mb-4">
                    <motion.div 
                        {...motionProps({
                            initial: { opacity: 0, scale: 0.96 },
                            animate: { opacity: 1, scale: 1 },
                            transition: { duration: 0.4 }
                        })}
                        className="relative overflow-hidden rounded-[26px] p-6 sm:p-7 shadow-xl"
                        style={{
                            background: 'linear-gradient(145deg, var(--surface), var(--surface-2))',
                            border: '1px solid var(--border)',
                            boxShadow: 'inset 0 1px 0 var(--card-sheen), 0 8px 32px rgba(0,0,0,0.25)'
                        }}
                    >
                        {/* Elegant Light Gradients */}
                        <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-[30px] pointer-events-none" style={{ background: 'var(--accent-soft)' }} />
                        <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full blur-[24px] pointer-events-none" style={{ background: 'var(--accent-glow)' }} />

                        {/* Geometric Watermark Pattern */}
                        <svg className="absolute -right-6 -bottom-6 w-44 h-44 opacity-[0.06] pointer-events-none" viewBox="0 0 100 100" fill="currentColor">
                            <polygon points="50 0, 61 35, 98 35, 68 57, 79 91, 50 70, 21 91, 32 57, 2 35, 39 35" />
                        </svg>
                        
                        <div className="relative z-10">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--surface-2)] backdrop-blur-md border border-[var(--border)] mb-3">
                                <Sparkles className="w-3.5 h-3.5 text-[var(--accent-text)]" />
                                <span className="text-[var(--accent-text)] text-[11px] font-bold uppercase tracking-[0.18em]">Islamic Hub</span>
                            </div>
                            <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] leading-tight tracking-tight mb-1.5 font-serif italic">
                                Discover Resources
                            </h2>
                            <p className="text-[var(--text-secondary)] text-xs sm:text-sm font-medium max-w-[90%] leading-relaxed">
                                Complete spiritual companion tools for prayer, knowledge, and daily Sunnah.
                            </p>
                        </div>
                    </motion.div>
                </div>

                {/* Quick-filter search bar */}
                <div className="px-4 sm:px-5 mb-5">
                    <div className="relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)] pointer-events-none" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search 17 Islamic tools..."
                            className="w-full h-11 pl-10 pr-9 rounded-xl text-xs sm:text-sm font-medium transition-all outline-none"
                            style={{
                                background: 'var(--surface)',
                                border: '1px solid var(--border)',
                                color: 'var(--text-primary)',
                                boxShadow: 'inset 0 1px 0 var(--card-sheen)'
                            }}
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery("")}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Premium Categorized Bento Grid */}
                <div className="px-4 sm:px-5 relative">
                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                        <AnimatePresence mode="popLayout">
                            {filteredServices.map((item, idx) => {
                                const category = SERVICE_CATEGORIES[item.path] || "Tools";
                                return (
                                    <motion.button
                                        key={item.path}
                                        {...motionProps({
                                            initial: { opacity: 0, y: 16 },
                                            animate: { opacity: 1, y: 0 },
                                            exit: { opacity: 0, scale: 0.95 },
                                            transition: { delay: Math.min(idx * 0.03, 0.3), duration: 0.3 },
                                            whileTap: { scale: 0.96 }
                                        })}
                                        onClick={() => navigate(item.path, { replace: true })}
                                        className="group relative text-left transition-all cursor-pointer"
                                        style={{
                                            width: '100%',
                                            minWidth: 0,
                                            boxSizing: 'border-box',
                                            overflow: 'hidden',
                                            padding: '13px',
                                            borderRadius: '18px',
                                            background: 'linear-gradient(145deg, var(--surface), var(--surface-2))',
                                            border: '1px solid var(--border)',
                                            boxShadow: 'inset 0 1px 0 var(--card-sheen)',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'space-between',
                                            gap: '8px',
                                        }}
                                    >
                                        {/* Top Row: Jewel Icon Pod & Category Micro-Pill */}
                                        <div
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                gap: '6px',
                                                width: '100%',
                                            }}
                                        >
                                            <div
                                                className="shadow-sm transition-transform duration-200 group-hover:scale-105"
                                                style={{
                                                    background: 'var(--accent-soft)',
                                                    border: '1px solid var(--accent)',
                                                    borderRadius: '11px',
                                                    color: 'var(--accent-text)',
                                                    flexShrink: 0,
                                                    width: '38px',
                                                    height: '38px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                }}
                                            >
                                                <item.icon className="w-5 h-5" strokeWidth={2} />
                                            </div>

                                            <span
                                                style={{
                                                    fontSize: '0.58rem',
                                                    fontWeight: 700,
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.04em',
                                                    padding: '2px 6px',
                                                    borderRadius: '999px',
                                                    background: 'var(--bg-base)',
                                                    border: '1px solid var(--border)',
                                                    color: 'var(--accent-text)',
                                                    whiteSpace: 'nowrap',
                                                }}
                                            >
                                                {category}
                                            </span>
                                        </div>

                                        {/* Middle: Bold Tool Title & Subtitle */}
                                        <div style={{ width: '100%', minWidth: 0, overflow: 'hidden' }}>
                                            <h3
                                                style={{
                                                    fontSize: '0.92rem',
                                                    fontWeight: 700,
                                                    color: 'var(--text-primary)',
                                                    whiteSpace: 'nowrap',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    width: '100%',
                                                    lineHeight: 1.25,
                                                }}
                                            >
                                                {item.title}
                                            </h3>
                                            <p
                                                style={{
                                                    fontSize: '0.70rem',
                                                    color: 'var(--text-secondary)',
                                                    whiteSpace: 'normal',
                                                    display: '-webkit-box',
                                                    WebkitLineClamp: 2,
                                                    WebkitBoxOrient: 'vertical',
                                                    overflow: 'hidden',
                                                    width: '100%',
                                                    marginTop: '2px',
                                                    lineHeight: 1.3,
                                                }}
                                            >
                                                {item.subtitle}
                                            </p>
                                        </div>

                                        {/* Bottom Row: Explore → Micro-Link */}
                                        <div
                                            style={{
                                                fontSize: '0.66rem',
                                                fontWeight: 600,
                                                color: 'var(--accent-text)',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '3px',
                                                marginTop: '2px',
                                            }}
                                        >
                                            <span>Explore</span>
                                            <span style={{ transition: 'transform 0.15s ease' }} className="group-hover:translate-x-0.5">→</span>
                                        </div>

                                        {/* Subtle Ambient Sheen */}
                                        <div
                                            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-[18px]"
                                            style={{
                                                background: 'radial-gradient(circle at top left, var(--accent-soft) 0%, transparent 70%)'
                                            }}
                                        />
                                    </motion.button>
                                );
                            })}
                        </AnimatePresence>
                    </div>

                    {filteredServices.length === 0 && (
                        <div className="text-center py-12 text-sm text-[var(--text-secondary)]">
                            No tools match "{searchQuery}". Try a different keyword.
                        </div>
                    )}
                </div>

                <div className="px-8 mt-12 text-center opacity-40 pb-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                        Noor Connect • 17 Spiritual Tools
                    </p>
                </div>
            </div>
        </PageTransition>
    );
}
