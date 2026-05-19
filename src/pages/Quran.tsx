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
      <div className="min-h-screen bg-[#0D0D0D] pb-32">
        <AppBar title={t('quran')} showBack />

        <div className="max-w-lg mx-auto px-5 py-4 space-y-6">

          {/* Premium Hero Section */}
          <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#0F3630] via-[#0A2622] to-[#1A1A1A] border border-white/5 shadow-2xl">
            {/* Decorative Patterns */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#10B981]/15 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#D4AF37]/15 rounded-full blur-[60px] translate-y-1/2 -translate-x-1/2 pointer-events-none" />

            {/* Glassmorphism Overlay */}
            <div className="absolute inset-0 bg-white/[0.02] backdrop-blur-sm pointer-events-none" />

            <div className="relative z-10 p-8 flex flex-col items-center text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-6 backdrop-blur-md">
                <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/90">
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
                  <div key={idx} className="bg-[#141414]/60 backdrop-blur-md rounded-2xl p-4 border border-white/5 transition-colors">
                    <p className="text-[#10B981] text-lg font-black tracking-tighter">{stat.value}</p>
                    <p className="text-white/40 text-[9px] uppercase font-black tracking-widest mt-1">{stat.label}</p>
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
            className="relative overflow-hidden rounded-[32px] cursor-pointer transition-transform bg-[#141414] border border-white/5 shadow-2xl group"
            onClick={() => navigate('/quran-reader')}
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#10B981]/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none group-hover:bg-[#10B981]/20 transition-colors duration-700" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#D4AF37]/10 rounded-full blur-[60px] translate-y-1/2 -translate-x-1/2 pointer-events-none group-hover:bg-[#D4AF37]/20 transition-colors duration-700" />

            <div className="relative z-10 p-8">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/90">
                  {dailyAyah?.title || 'Verse of the Day'}
                </span>
              </div>

              <div className="bg-[#0a0a0a]/50 backdrop-blur-md rounded-2xl p-6 border border-white/5 mb-4 shadow-inner">
                <p className="text-white/90 text-base font-medium leading-relaxed mb-4">
                  {dailyAyah?.content || 'Loading...'}
                </p>
                <div className="flex items-center gap-2">
                  <Badge className="bg-white/5 text-white/80 border-white/10 text-xs px-2 py-1">
                    {dailyAyah?.subtitle || 'Al-Baqarah 2:45'}
                  </Badge>
                  <span className="text-white/50 text-xs font-medium">{dailyAyah?.reference || ''}</span>
                </div>
              </div>

              <p className="text-white/50 text-sm italic font-serif">
                {dailyAyah?.reflection || ''}
              </p>
            </div>
          </motion.div>

          {/* Last Read Card */}
          {lastRead && (
            <motion.button
              {...motionProps({ whileTap: { scale: 0.98 } })}
              onClick={() => navigate(`/quran-reader/${lastRead.number}`)}
              className="w-full flex items-center p-4 bg-[#10B981]/10 border border-[#10B981]/20 rounded-[24px] gap-4 hover:bg-[#10B981]/15 transition-all group backdrop-blur-sm"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-[#10B981] to-[#059669] rounded-xl flex items-center justify-center shadow-lg shadow-[#10B981]/20 group-hover:scale-110 transition-transform">
                <History className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-[10px] font-bold text-[#10B981] uppercase tracking-widest mb-1">{ti18n('continueReading')}</p>
                <h3 className="text-lg font-black text-white">{lastRead.name}</h3>
              </div>
              <ChevronRight className="w-5 h-5 text-[#10B981] opacity-50" />
            </motion.button>
          )}

          {/* Search Header */}
          <div className="sticky top-[4.5rem] z-30 bg-[#0D0D0D]/90 backdrop-blur-xl py-2 -mx-5 px-5">
            <div className="relative group">
              <div className="absolute start-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-[#10B981] transition-colors">
                <Search className="w-4 h-4" />
              </div>
              <Input
                placeholder={ti18n('searchBySurahNameOrNumber')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="ps-11 h-12 bg-[#141414] border-white/10 rounded-2xl text-white placeholder:text-white/30 focus:border-[#10B981]/50 focus:ring-1 focus:ring-[#10B981]/50 transition-all"
              />
            </div>
          </div>

          {/* List Content */}
          <div className="space-y-3 pb-8">
            {loading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="h-20 bg-[#141414] animate-pulse rounded-[24px] border border-white/5" />
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
                      onClick={() => navigate(`/quran-reader/${surah.number}`)}
                      className="w-full flex items-center p-5 bg-[#141414] border border-white/5 rounded-[24px] hover:bg-white/5 hover:border-white/10 transition-all duration-300 group active:scale-[0.98] text-left"
                    >
                      {/* Number Plate - Premium Octagonal Style */}
                      <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
                        <div className="absolute inset-0 bg-[#10B981]/10 rotate-45 rounded-xl group-hover:rotate-[135deg] transition-transform duration-700" />
                        <div className="absolute inset-1 bg-[#10B981]/20 rotate-12 rounded-lg" />
                        <span className="relative z-10 font-black text-[#10B981] text-xs tracking-tighter">{surah.number}</span>
                      </div>

                      <div className="ms-5 flex-1">
                        <div className="flex items-center justify-between gap-4">
                          <div className="space-y-1">
                            <h3 className="font-bold text-base tracking-tight text-white/90 group-hover:text-white transition-colors">{surah.englishName}</h3>
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded-full bg-white/5 text-[9px] font-bold uppercase tracking-widest text-white/50 border border-white/5">
                                {surah.revelationType}
                              </span>
                              <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest">
                                {surah.numberOfAyahs} Ayahs
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-arabic text-2xl text-[#10B981] drop-shadow-sm leading-none group-hover:scale-110 transition-transform duration-500">{surah.name}</p>
                            <p className="text-[9px] text-white/30 font-bold uppercase tracking-tighter mt-1">{surah.englishNameTranslation}</p>
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
              <div className="w-16 h-16 bg-[#141414] rounded-full flex items-center justify-center mx-auto mb-4 border border-white/5">
                <Search className="w-8 h-8 text-white/20" />
              </div>
              <p className="text-white/40 font-medium">{ti18n('noSurahsFound')}</p>
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
};

export default Quran;
