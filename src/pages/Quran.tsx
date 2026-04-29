import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, BookOpen, Play, Search, Sparkles, BookMarked, History, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext-new";
import { useI18n } from "@/hooks/useI18n";
import { PageTransition } from "@/components/PageTransition";
import { motion, AnimatePresence } from "framer-motion";
import { AppBar } from "@/components/AppBar";
import { getDailyAyah } from "@/lib/daily-content";

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

    const fetchSurahs = async () => {
      try {
        const response = await fetch("https://api.alquran.cloud/v1/surah");
        const data = await response.json();
        setSurahs(data.data);
        setFilteredSurahs(prev => searchQuery ? prev : data.data);
        try { localStorage.setItem('quran-surahs-cache', JSON.stringify(data.data)); } catch (error) { console.warn("localStorage cache save failed:", error); }
        setLoading(false);
      } catch (error) {
        console.error("Error:", error);
        setLoading(false);
      }
    };

    fetchSurahs();
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

  return (
    <PageTransition>
      <div className="min-h-screen bg-background pb-20">
        <AppBar title={t('quran')} showBack />

        <div className="max-w-lg mx-auto px-5 py-4 space-y-6">

          {/* Premium Hero Section */}
          <div className="relative overflow-hidden rounded-[32px] shadow-2xl shadow-emerald-900/20 group">
            {/* Animated Mesh Gradient Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#1a4a4a] via-[#245a5a] to-[#2c6e6e]"></div>
            
            {/* Decorative Patterns */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-400/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 animate-pulse" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/10 rounded-full blur-[60px] translate-y-1/2 -translate-x-1/2" />

            {/* Glassmorphism Overlay */}
            <div className="absolute inset-0 bg-white/[0.02] backdrop-blur-[1px]" />

            <div className="relative z-10 p-8 flex flex-col items-center text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/10 mb-6">
                <Sparkles className="w-3.5 h-3.5 text-[#e0c097]" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/90">
                  {ti18n('alQuranAlKareem')}
                </span>
              </div>

              <h1 className="text-4xl sm:text-5xl font-arabic font-bold text-white mb-4 drop-shadow-lg">
                {ti18n('theNobleQuran')}
              </h1>
              <p className="text-white/60 text-xs font-medium max-w-[240px] leading-relaxed mb-8">
                {ti18n('readListenContemplate')}
              </p>

              {/* Quick Stats Grid with Glassmorphism */}
              <div className="grid grid-cols-3 gap-3 w-full max-w-sm">
                {[
                  { label: ti18n('surahs'), value: '114' },
                  { label: ti18n('ayahs'), value: '6,236' },
                  { label: ti18n('juz'), value: '30' }
                ].map((stat, idx) => (
                  <div key={idx} className="bg-black/20 backdrop-blur-md rounded-2xl p-4 border border-white/5 group-hover:bg-black/30 transition-colors">
                    <p className="text-primary text-lg font-black tracking-tighter">{stat.value}</p>
                    <p className="text-white/40 text-[9px] uppercase font-black tracking-widest mt-1">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Daily Ayah Card */}
          <div className="bg-emerald-600 text-white p-6 rounded-2xl mb-6">
            <h3 className="text-xl font-bold mb-2">Daily Ayah Test</h3>
            <p className="text-sm">{dailyAyah?.title || 'Verse of the Day'}</p>
            <p className="text-xs mt-2">{dailyAyah?.content || 'Loading...'}</p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="relative overflow-hidden rounded-[32px] shadow-2xl shadow-emerald-900/20 cursor-pointer active:scale-[0.98] transition-transform"
            onClick={() => navigate('/quran-reader')}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 to-emerald-800" />
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-400/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 animate-pulse" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/10 rounded-full blur-[60px] translate-y-1/2 -translate-x-1/2" />
            <div className="absolute inset-0 bg-white/[0.02] backdrop-blur-[1px]" />

            <div className="relative z-10 p-8">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-4 h-4 text-[#e0c097]" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/90">
                  {dailyAyah?.title || 'Verse of the Day'}
                </span>
              </div>

              <div className="bg-black/20 backdrop-blur-md rounded-2xl p-6 border border-white/5 mb-4">
                <p className="text-white/90 text-base font-medium leading-relaxed mb-4">
                  {dailyAyah?.content || 'Loading...'}
                </p>
                <div className="flex items-center gap-2">
                  <Badge className="bg-white/10 text-white/80 border-white/10 text-xs">
                    {dailyAyah?.subtitle || 'Al-Baqarah 2:45'}
                  </Badge>
                  <span className="text-white/50 text-xs font-medium">{dailyAyah?.reference || ''}</span>
                </div>
              </div>

              <p className="text-white/60 text-sm italic">
                {dailyAyah?.reflection || ''}
              </p>
            </div>
          </motion.div>

          {/* Last Read Card */}
          {lastRead && (
            <button
              onClick={() => navigate(`/quran-reader/${lastRead.number}`)}
              className="w-full flex items-center p-4 bg-primary/10 border border-primary/20 rounded-2xl gap-4 hover:bg-primary/15 transition-all group active:scale-[0.98]"
            >
              <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform">
                <History className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">{ti18n('continueReading')}</p>
                <h3 className="text-lg font-black">{lastRead.name}</h3>
              </div>
              <ChevronRight className="w-5 h-5 text-primary opacity-50" />
            </button>
          )}

          {/* Search Header */}
          <div className="sticky top-[4.5rem] z-30 bg-background/80 backdrop-blur-xl py-2 -mx-5 px-5">
            <div className="relative group">
              <div className="absolute start-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
                <Search className="w-4 h-4" />
              </div>
              <Input
                placeholder={ti18n('searchBySurahNameOrNumber')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="ps-11 h-12 bg-card/50 border-border/40 rounded-2xl focus:ring-primary/20"
              />
            </div>
          </div>

          {/* List Content */}
          <div className="space-y-3">
            {loading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="h-20 bg-muted/20 animate-pulse rounded-2xl" />
              ))
            ) : (
              <AnimatePresence>
                {filteredSurahs.map((surah) => (
                  <motion.div
                    key={surah.number}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <button
                      onClick={() => navigate(`/quran-reader/${surah.number}`)}
                      className="w-full flex items-center p-5 bg-card border border-border/40 rounded-[24px] hover:bg-primary/5 hover:border-primary/20 transition-all duration-300 group active:scale-[0.98] text-left shadow-sm hover:shadow-md"
                    >
                      {/* Number Plate - Premium Octagonal Style */}
                      <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
                        <div className="absolute inset-0 bg-primary/10 rotate-45 rounded-xl group-hover:rotate-[135deg] transition-transform duration-700" />
                        <div className="absolute inset-1 bg-primary/5 rotate-12 rounded-lg" />
                        <span className="relative z-10 font-black text-primary text-xs tracking-tighter">{surah.number}</span>
                      </div>

                      <div className="ms-5 flex-1">
                        <div className="flex items-center justify-between gap-4">
                          <div className="space-y-1">
                            <h3 className="font-black text-base tracking-tight group-hover:text-primary transition-colors">{surah.englishName}</h3>
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded-full bg-muted text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                                {surah.revelationType}
                              </span>
                              <span className="text-[10px] text-muted-foreground/60 font-bold uppercase tracking-widest">
                                {surah.numberOfAyahs} Ayahs
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-arabic text-2xl text-primary drop-shadow-sm leading-none group-hover:scale-110 transition-transform duration-500">{surah.name}</p>
                            <p className="text-[9px] text-muted-foreground/40 font-bold uppercase tracking-tighter mt-1">{surah.englishNameTranslation}</p>
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
              <div className="w-16 h-16 bg-muted/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">{ti18n('noSurahsFound')}</p>
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
};

export default Quran;
