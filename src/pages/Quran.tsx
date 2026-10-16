import { useEffect, useState, useMemo, useTransition } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Sparkles, History, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext-new";
import { useI18n } from "@/hooks/useI18n";
import { PageTransition } from "@/components/PageTransition";
import { motion } from "framer-motion";
import { AppBar } from "@/components/AppBar";
import { getDailyAyah } from "@/lib/daily-content";
import { useSettings } from "@/contexts/SettingsContext";
import { quranService, type SurahInfo } from "@/lib/quran-service";

interface Surah {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  revelationType: string;
}

const Quran = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { t: ti18n } = useI18n();
  const { animationEnabled } = useSettings();
  const dailyAyah = useMemo(() => getDailyAyah(), []);
  
  const [surahs, setSurahs] = useState<Surah[]>(() => {
    try {
      const cached = localStorage.getItem('quran-surahs-cache');
      if (cached) return JSON.parse(cached);
    } catch (error) {
      console.warn("localStorage cache load failed:", error);
    }
    return [];
  });
  const [filteredSurahs, setFilteredSurahs] = useState<Surah[]>(surahs);
  const [loading, setLoading] = useState(surahs.length === 0);
  const [searchQuery, setSearchQuery] = useState("");
  const [lastRead, setLastRead] = useState<{ number: number; name: string } | null>(null);
  const [navigatingTo, setNavigatingTo] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const saved = localStorage.getItem('quran-last-read');
    if (saved) setLastRead(JSON.parse(saved));

    const loadSurahs = async () => {
      try {
        // Check cache first before fetching
        const cached = localStorage.getItem('quran-surahs-cache');
        if (cached) {
          const parsed = JSON.parse(cached);
          setSurahs(parsed);
          setFilteredSurahs(parsed);
          setLoading(false);
          return;
        }
        
        // Use local quranService data instead of external API
        const surahInfo: SurahInfo[] = quranService.getAllSurahs();
        
        // Map to Surah interface format
        const surahsData: Surah[] = surahInfo.map(info => ({
          number: info.number,
          name: info.name,
          englishName: info.englishName,
          englishNameTranslation: info.englishNameTranslation,
          numberOfAyahs: info.numberOfAyahs,
          revelationType: info.revelationType
        }));
        
        setSurahs(surahsData);
        setFilteredSurahs(surahsData);
        try { localStorage.setItem('quran-surahs-cache', JSON.stringify(surahsData)); } catch (error) { console.warn("localStorage cache save failed:", error); }
        setLoading(false);
      } catch (error) {
        console.error("Error:", error);
        setLoading(false);
      }
    };

    loadSurahs();
  }, []);

  useEffect(() => {
    const filtered = surahs.filter(
      (surah) =>
        surah.englishName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        surah.name.includes(searchQuery) ||
        surah.number.toString().includes(searchQuery)
    );
    setFilteredSurahs(filtered);
  }, [searchQuery, surahs]);

  const motionProps = (props: any) => animationEnabled ? props : {};

  return (
    <PageTransition>
      <div className="min-h-screen bg-[var(--bg-base)] pb-32">
        <AppBar title={t('quran')} showBack />

        <div className="max-w-lg mx-auto px-5 py-4 space-y-6">

          {/* Premium Hero Section */}
          <div className="relative overflow-hidden rounded-[24px] bg-[var(--surface)] shadow-xl border border-[var(--border)]">
            {/* Decorative Patterns */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--accent)]/10 rounded-full blur-[20px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-[var(--accent)]/5 rounded-full blur-[20px] translate-y-1/2 -translate-x-1/2 pointer-events-none" />

            {/* Glassmorphism Overlay */}
            <div className="absolute inset-0 bg-[var(--surface-2)]/10 backdrop-blur-sm pointer-events-none" />

            <div className="relative z-10 p-5 sm:p-8 flex flex-col items-center text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--surface-2)] border border-[var(--border)] mb-4 sm:mb-6 backdrop-blur-md">
                <Sparkles className="w-3.5 h-3.5 text-[var(--accent-text)]" />
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--accent-text)]">
                  {ti18n('alQuranAlKareem')}
                </span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-arabic font-bold text-[var(--text-primary)] mb-3 sm:mb-4 drop-shadow-lg tracking-wide">
                {ti18n('theNobleQuran')}
              </h1>
              <p className="text-[var(--text-secondary)] text-xs font-medium max-w-[240px] leading-relaxed mb-6 sm:mb-8">
                {ti18n('readListenContemplate')}
              </p>

              {/* Quick Stats Grid with Glassmorphism */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3 w-full max-w-sm">
                {[
                  { label: ti18n('surahs'), value: '114' },
                  { label: ti18n('ayahs'), value: '6,236' },
                  { label: ti18n('juz'), value: '30' }
                ].map((stat, idx) => (
                  <div key={idx} className="bg-[var(--surface-2)] backdrop-blur-md rounded-2xl p-2.5 sm:p-4 border border-[var(--border)] transition-colors">
                    <p className="text-[var(--accent-text)] text-base sm:text-lg font-bold font-serif italic tracking-tighter">{stat.value}</p>
                    <p className="text-[var(--text-secondary)] text-[10px] sm:text-xs uppercase font-bold tracking-wider mt-1 truncate">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <motion.div
            {...motionProps({
                initial: { opacity: 0, y: 20 },
                animate: { opacity: 1, y: 0 },
                transition: { duration: 0.5, delay: 0.1 },
                whileTap: { scale: 0.98 }
            })}
            className="relative overflow-hidden rounded-[24px] cursor-pointer transition-transform bg-[var(--surface)] border border-[var(--border)] shadow-md group"
            onClick={() => navigate('/quran')}
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--accent)]/5 rounded-full blur-[20px] -translate-y-1/2 translate-x-1/2 pointer-events-none group-hover:bg-[var(--accent)]/10 transition-colors duration-700" />
            
            <div className="relative z-10 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-4 h-4 text-[var(--accent-text)]" />
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--accent-text)]">
                  {dailyAyah?.title || 'Verse of the Day'}
                </span>
              </div>

              <div className="bg-[var(--surface-2)] rounded-2xl p-5 border border-[var(--border)] mb-4 shadow-sm">
                <p className="text-[var(--text-primary)] text-sm font-medium leading-relaxed mb-4">
                  {dailyAyah?.content || 'Loading...'}
                </p>
                <div className="flex items-center gap-2">
                  <Badge className="bg-[var(--surface)] text-[var(--text-primary)] border border-[var(--border)] text-xs tracking-wider uppercase font-bold px-2 py-1">
                    {dailyAyah?.subtitle || 'Al-Baqarah 2:45'}
                  </Badge>
                  <span className="text-[var(--text-secondary)] text-xs font-bold uppercase tracking-widest">{dailyAyah?.reference || ''}</span>
                </div>
              </div>

              <p className="text-[var(--text-secondary)] text-xs italic font-serif">
                {dailyAyah?.reflection || ''}
              </p>
            </div>
          </motion.div>

          {/* Last Read Card */}
          {lastRead && (
            <motion.button
              {...motionProps({ whileTap: { scale: 0.98 } })}
              onClick={() => navigate(`/quran/surah-${lastRead.number}`)}
              className="w-full flex items-center p-4 bg-[var(--surface)] border border-[var(--border)] rounded-[20px] gap-4 hover:bg-[var(--surface-2)] hover:border-[var(--accent)]/40 transition-all group shadow-sm"
            >
              <div className="w-12 h-12 bg-[var(--accent)]/10 border border-[var(--accent)]/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <History className="w-5 h-5 text-[var(--accent-text)]" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-xs font-bold text-[var(--accent-text)] uppercase tracking-[0.2em] mb-1">{ti18n('continueReading')}</p>
                <h3 className="text-base font-bold text-[var(--text-primary)]">{lastRead.name}</h3>
              </div>
              <ChevronRight className="w-5 h-5 text-[var(--text-secondary)] opacity-50" />
            </motion.button>
          )}

          {/* Search Header */}
          <div className="sticky top-[4.5rem] z-30 bg-[var(--bg-base)]/90 backdrop-blur-xl py-2 -mx-5 px-5 border-b border-[var(--border)]">
            <div className="relative group">
              <div className="absolute start-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] group-focus-within:text-[var(--accent)] transition-colors">
                <Search className="w-4 h-4" />
              </div>
              <Input
                placeholder={ti18n('searchBySurahNameOrNumber')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="ps-11 h-12 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/50 focus:border-[var(--accent)]/50 focus:ring-1 focus:ring-[var(--accent)]/50 transition-all shadow-sm"
              />
            </div>
          </div>

          {/* List Content */}
          <div className="space-y-3 pb-8">
            {loading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="h-20 bg-[var(--surface)] animate-pulse rounded-2xl border border-[var(--border)]" />
              ))
            ) : (
              <div className="space-y-3">
                {filteredSurahs.map((surah) => (
                  <div
                    key={surah.number}
                    className="animate-in fade-in slide-in-from-bottom-2 duration-300 fill-mode-both"
                    style={{ animationDelay: `${Math.min(surah.number * 20, 300)}ms` }}
                  >
                    <button
                      onClick={() => {
                        setNavigatingTo(surah.number);
                        // Force a small delay so the loading spinner paints immediately before the heavy transition
                        setTimeout(() => {
                          startTransition(() => {
                            navigate(`/quran/surah-${surah.number}`);
                          });
                        }, 50);
                      }}
                      disabled={navigatingTo !== null}
                      className="w-full flex items-center p-4 bg-[var(--surface)] border border-[var(--border)] rounded-2xl hover:bg-[var(--surface-2)] hover:border-[var(--accent)]/30 transition-all duration-300 group active:scale-[0.98] text-left shadow-sm relative overflow-hidden"
                    >
                      {/* Loading State Overlay */}
                      {navigatingTo === surah.number && (
                        <div className="absolute inset-0 bg-[var(--bg-base)]/70 backdrop-blur-sm z-20 flex flex-col items-center justify-center gap-2">
                          <div className="w-8 h-8 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin shadow-lg" />
                          <span className="text-xs font-bold text-[var(--accent-text)] tracking-widest uppercase animate-pulse">{ti18n('loading') || 'Loading...'}</span>
                        </div>
                      )}

                      {/* Number Plate - Premium Style */}
                      <div className="relative w-10 h-10 flex items-center justify-center shrink-0">
                        <div className="absolute inset-0 bg-[var(--accent)]/10 rotate-45 rounded-lg group-hover:rotate-[135deg] transition-transform duration-700" />
                        <div className="absolute inset-1 bg-[var(--accent)]/15 rotate-12 rounded-md" />
                        <span className="relative z-10 font-bold text-[var(--accent-text)] text-xs tracking-tighter">{surah.number}</span>
                      </div>

                      <div className="ms-4 flex-1 flex items-center justify-between gap-3 min-w-0">
                        {/* Start Side: English Name & Info */}
                        <div className="flex flex-col items-start gap-1 min-w-0 flex-1">
                          <h3 className="font-bold text-base tracking-tight text-[var(--text-primary)] truncate w-full text-left">
                            {surah.englishName}
                          </h3>
                          <p className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider truncate w-full text-left">
                            {surah.englishNameTranslation}
                          </p>
                          <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                            <span className="px-1.5 py-0.5 rounded-full bg-[var(--surface-2)] border border-[var(--border)] text-[9px] font-bold uppercase tracking-widest text-[var(--text-secondary)] shrink-0">
                              {surah.revelationType}
                            </span>
                            <span className="text-[9px] text-[var(--text-secondary)] font-bold uppercase tracking-[0.2em] shrink-0">
                              {surah.numberOfAyahs} Ayahs
                            </span>
                          </div>
                        </div>
                        
                        {/* End Side: Arabic Name */}
                        <div className="flex flex-col items-end text-right shrink-0 ms-2">
                          <p className="font-arabic text-3xl text-[var(--accent-text)] drop-shadow-sm leading-none group-hover:scale-105 transition-transform duration-500">
                            {surah.name}
                          </p>
                        </div>
                      </div>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {!loading && filteredSurahs.length === 0 && (
            <div className="text-center py-20">
              <div className="w-16 h-16 bg-[var(--surface)] rounded-full flex items-center justify-center mx-auto mb-4 border border-[var(--border)]">
                <Search className="w-8 h-8 text-[var(--text-secondary)]/50" />
              </div>
              <p className="text-[var(--text-secondary)] font-medium">{ti18n('noSurahsFound')}</p>
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
};

export default Quran;
