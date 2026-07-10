import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Sparkles, History, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext-new";
import { useI18n } from "@/hooks/useI18n";
import { PageTransition } from "@/components/PageTransition";
import { motion, AnimatePresence } from "framer-motion";
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
      <div className="min-h-screen bg-background pb-32">
        <AppBar title={t('quran')} showBack />

        <div className="max-w-lg mx-auto px-5 py-4 space-y-6">

          {/* Premium Hero Section */}
          <div className="relative overflow-hidden rounded-[24px] bg-[#1A1A1A] shadow-xl border border-[#333333]" style={{ background: 'linear-gradient(145deg, #1A1A1A, #141414)' }}>
            {/* Decorative Patterns */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#C9860A]/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#C9860A]/5 rounded-full blur-[60px] translate-y-1/2 -translate-x-1/2 pointer-events-none" />

            {/* Glassmorphism Overlay */}
            <div className="absolute inset-0 bg-white/[0.02] backdrop-blur-sm pointer-events-none" />

            <div className="relative z-10 p-8 flex flex-col items-center text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-6 backdrop-blur-md">
                <Sparkles className="w-3.5 h-3.5 text-[#C9860A]" />
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#C9860A]">
                  {ti18n('alQuranAlKareem')}
                </span>
              </div>

              <h1 className="text-4xl sm:text-5xl font-arabic font-bold text-white mb-4 drop-shadow-lg tracking-wide">
                {ti18n('theNobleQuran')}
              </h1>
              <p className="text-white/50 text-xs font-medium max-w-[240px] leading-relaxed mb-8">
                {ti18n('readListenContemplate')}
              </p>

              {/* Quick Stats Grid with Glassmorphism */}
              <div className="grid grid-cols-3 gap-3 w-full max-w-sm">
                {[
                  { label: ti18n('surahs'), value: '114' },
                  { label: ti18n('ayahs'), value: '6,236' },
                  { label: ti18n('juz'), value: '30' }
                ].map((stat, idx) => (
                  <div key={idx} className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/5 transition-colors">
                    <p className="text-[#C9860A] text-lg font-bold font-serif italic tracking-tighter">{stat.value}</p>
                    <p className="text-white/40 text-[9px] uppercase font-bold tracking-widest mt-1">{stat.label}</p>
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
            className="relative overflow-hidden rounded-[24px] cursor-pointer transition-transform bg-card border border-border shadow-md group"
            onClick={() => navigate('/quran')}
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#C9860A]/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none group-hover:bg-[#C9860A]/10 transition-colors duration-700" />
            
            <div className="relative z-10 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-4 h-4 text-[#C9860A]" />
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#C9860A]">
                  {dailyAyah?.title || 'Verse of the Day'}
                </span>
              </div>

              <div className="bg-muted/30 rounded-2xl p-5 border border-border/50 mb-4 shadow-sm">
                <p className="text-foreground text-sm font-medium leading-relaxed mb-4">
                  {dailyAyah?.content || 'Loading...'}
                </p>
                <div className="flex items-center gap-2">
                  <Badge className="bg-background text-foreground border-border text-[10px] tracking-wider uppercase font-bold px-2 py-1">
                    {dailyAyah?.subtitle || 'Al-Baqarah 2:45'}
                  </Badge>
                  <span className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest">{dailyAyah?.reference || ''}</span>
                </div>
              </div>

              <p className="text-muted-foreground text-xs italic font-serif">
                {dailyAyah?.reflection || ''}
              </p>
            </div>
          </motion.div>

          {/* Last Read Card */}
          {lastRead && (
            <motion.button
              {...motionProps({ whileTap: { scale: 0.98 } })}
              onClick={() => navigate(`/quran/surah-${lastRead.number}`)}
              className="w-full flex items-center p-4 bg-card border border-border rounded-[20px] gap-4 hover:bg-muted/20 transition-all group shadow-sm"
            >
              <div className="w-12 h-12 bg-[#C9860A]/10 border border-[#C9860A]/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <History className="w-5 h-5 text-[#C9860A]" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mb-1">{ti18n('continueReading')}</p>
                <h3 className="text-base font-bold text-foreground">{lastRead.name}</h3>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground opacity-50" />
            </motion.button>
          )}

          {/* Search Header */}
          <div className="sticky top-[4.5rem] z-30 bg-background/90 backdrop-blur-xl py-2 -mx-5 px-5">
            <div className="relative group">
              <div className="absolute start-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-[#C9860A] transition-colors">
                <Search className="w-4 h-4" />
              </div>
              <Input
                placeholder={ti18n('searchBySurahNameOrNumber')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="ps-11 h-12 bg-card border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:border-[#C9860A]/50 focus:ring-1 focus:ring-[#C9860A]/50 transition-all shadow-sm"
              />
            </div>
          </div>

          {/* List Content */}
          <div className="space-y-3 pb-8">
            {loading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="h-20 bg-card animate-pulse rounded-2xl border border-border" />
              ))
            ) : (
              <AnimatePresence>
                {filteredSurahs.map((surah) => (
                  <motion.div
                    key={surah.number}
                    {...motionProps({
                      initial: { opacity: 0, y: 10 },
                      animate: { opacity: 1, y: 0 },
                      transition: { duration: 0.2 },
                    })}
                  >
                    <button
                      onClick={() => navigate(`/quran/surah-${surah.number}`)}
                      className="w-full flex items-center p-4 bg-card border border-border rounded-2xl hover:bg-muted/20 transition-all duration-300 group active:scale-[0.98] text-left shadow-sm"
                    >
                      {/* Number Plate - Premium Style */}
                      <div className="relative w-10 h-10 flex items-center justify-center shrink-0">
                        <div className="absolute inset-0 bg-[#C9860A]/10 rotate-45 rounded-lg group-hover:rotate-[135deg] transition-transform duration-700" />
                        <div className="absolute inset-1 bg-[#C9860A]/15 rotate-12 rounded-md" />
                        <span className="relative z-10 font-bold text-[#C9860A] text-[10px] tracking-tighter">{surah.number}</span>
                      </div>

                      <div className="ms-4 flex-1">
                        <div className="flex items-center justify-between gap-4">
                          <div className="space-y-1">
                            <h3 className="font-bold text-sm tracking-tight text-foreground">{surah.englishName}</h3>
                            <div className="flex items-center gap-2">
                              <span className="px-1.5 py-0.5 rounded-full bg-muted text-[8px] font-bold uppercase tracking-widest text-muted-foreground">
                                {surah.revelationType}
                              </span>
                              <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-[0.2em]">
                                {surah.numberOfAyahs} Ayahs
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-arabic text-xl text-[#C9860A] drop-shadow-sm leading-none group-hover:scale-105 transition-transform duration-500">{surah.name}</p>
                            <p className="text-[8px] text-muted-foreground font-bold uppercase tracking-wider mt-1">{surah.englishNameTranslation}</p>
                          </div>
                        </div>
                      </div>
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>

          {!loading && filteredSurahs.length === 0 && (
            <div className="text-center py-20">
              <div className="w-16 h-16 bg-card rounded-full flex items-center justify-center mx-auto mb-4 border border-border">
                <Search className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <p className="text-muted-foreground font-medium">{ti18n('noSurahsFound')}</p>
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
};

export default Quran;
