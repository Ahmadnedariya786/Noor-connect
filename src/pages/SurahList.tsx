import { useState, useMemo, useEffect, memo, useRef, startTransition } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, ChevronLeft, Sparkles, History, Filter, MapPin, Moon } from "lucide-react";
import { quranService, type SurahInfo } from "@/lib/quran-service";
import { PageTransition } from "@/components/PageTransition";
import { useSettings } from "@/contexts/SettingsContext";
import { getDailyAyah } from "@/lib/daily-content";
import { Badge } from "@/components/ui/badge";
import { goBackOrFallback } from "@/lib/navigation";
import { CSSOnlyTransition } from '@/components/AdaptiveMotion';

interface SurahCardProps {
  surah: SurahInfo;
  index: number;
  isDark: boolean;
  onClick: (number: number) => void;
}

const SurahCard = memo(function SurahCard({ surah, index, isDark, onClick }: SurahCardProps) {
  return (
    <button
      onClick={() => onClick(surah.number)}
      className="w-full text-left group outline-none active:scale-[0.98] transition-transform duration-150"
    >
      <div className="rounded-[24px] p-5 border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] transition-all duration-300 hover:scale-[1.02] hover:border-[var(--accent)]/30 hover:shadow-lg hover:shadow-[var(--accent-glow)]">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            {/* Surah Number - Premium Octagonal Style */}
            <div className="relative w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center shrink-0">
              <div className="absolute inset-0 bg-[var(--accent-soft)] rotate-45 rounded-xl" />
              <div className="absolute inset-1 bg-[var(--accent-soft)]/50 rotate-12 rounded-lg" />
              <span className="relative z-10 font-black text-[var(--accent)] text-xs tracking-tighter">{surah.number}</span>
            </div>

            {/* Center: Arabic + English */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-3 min-w-0">
                <div className="space-y-0.5 min-w-0 flex-1">
                  <h3 className="font-arabic text-xl sm:text-2xl text-[var(--text-primary)] drop-shadow-sm leading-none truncate">
                    {surah.name}
                  </h3>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="px-1.5 py-0.5 rounded-full bg-[var(--surface-2)] border border-[var(--border)] text-[10px] font-bold uppercase tracking-wider text-[var(--accent-text)] shrink-0">
                      {surah.revelationType}
                    </span>
                    <span className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider shrink-0">
                      {surah.numberOfAyahs} Ayahs
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0 max-w-[45%] min-w-0">
                  <p className="font-bold text-sm sm:text-base tracking-tight group-hover:text-[var(--accent)] transition-colors truncate">{surah.englishName}</p>
                  <p className="text-[11px] text-[var(--text-secondary)]/60 font-bold uppercase tracking-tighter mt-0.5 truncate">{surah.englishNameTranslation}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </button>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.surah.number === nextProps.surah.number &&
    prevProps.surah.name === nextProps.surah.name &&
    prevProps.surah.englishName === nextProps.surah.englishName &&
    prevProps.isDark === nextProps.isDark
  );
});

export default function SurahList() {
  const { effectiveTheme } = useSettings();
  const isDark = effectiveTheme === 'dark';
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<'all' | 'meccan' | 'madinah'>('all');
  const [lastRead, setLastRead] = useState<{ number: number; name: string; englishName: string } | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const dailyAyah = useMemo(() => getDailyAyah(), []);
  const allSurahs = useMemo(() => quranService.getAllSurahs(), []);

  useEffect(() => {
    const saved = localStorage.getItem('quran-last-read');
    if (saved) setLastRead(JSON.parse(saved));
  }, []);

  const filteredSurahs = useMemo(() => {
    let surahs = allSurahs;

    // Apply revelation type filter
    if (filter === 'meccan') {
      surahs = surahs.filter(s => s.revelationType === 'Meccan');
    } else if (filter === 'madinah') {
      surahs = surahs.filter(s => s.revelationType === 'Medinan');
    }

    // Apply search filter
    if (searchQuery.trim()) {
      surahs = surahs.filter(
        (s) =>
          s.englishName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.name.includes(searchQuery) ||
          s.englishNameTranslation.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.number.toString() === searchQuery
      );
    }

    return surahs;
  }, [allSurahs, filter, searchQuery]);

  const handleSurahClick = (surahNumber: number) => {
    if ('vibrate' in navigator) navigator.vibrate(15);
    startTransition(() => {
      navigate(`/quran/surah-${surahNumber}`);
    });
  };

  return (
    <PageTransition>
      <div className="min-h-screen relative overflow-hidden bg-[var(--bg-base)]">
        {/* Subtle Islamic geometric pattern on header */}
        <div className="absolute top-0 left-0 right-0 h-48 opacity-[0.03] bg-[radial-gradient(circle_at_2px_2px,_var(--accent)_1px,_transparent_0)] bg-[length:32px_32px] pointer-events-none" />

        {/* Premium Hero Section */}
        <div className="relative overflow-hidden rounded-[32px] border border-[var(--border)] bg-gradient-to-br from-[var(--surface)] to-[var(--surface-2)] shadow-xl mb-6 safe-top">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--accent)]/5 rounded-full blur-[30px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-[var(--accent)]/5 rounded-full blur-[30px] translate-y-1/2 -translate-x-1/2 pointer-events-none" />

          <div className="relative z-10 p-5 sm:p-8 flex flex-col items-center text-center">
            <div className="flex items-center gap-3 mb-4 sm:mb-6 w-full min-w-0">
              <button
                onClick={() => goBackOrFallback(navigate, '/dashboard')}
                className="p-2 rounded-full bg-[var(--surface-2)] border border-[var(--border)] hover:bg-[var(--surface)] transition-colors shrink-0"
              >
                <ChevronLeft className="w-5 h-5 text-[var(--text-primary)]" />
              </button>
              <h1 className="text-2xl sm:text-4xl font-arabic font-bold text-[var(--text-primary)] flex-1 truncate">Al-Quran Al-Kareem</h1>
            </div>

            <p className="text-[var(--text-secondary)] text-xs font-medium max-w-[240px] leading-relaxed mb-6 sm:mb-8">
              Read, listen, and contemplate the divine guidance
            </p>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3 w-full max-w-sm">
              {[
                { label: 'Surahs', value: '114' },
                { label: 'Ayahs', value: '6,236' },
                { label: 'Juz', value: '30' }
              ].map((stat, idx) => (
                <div key={idx} className="bg-[var(--surface)] backdrop-blur-md rounded-2xl p-2.5 sm:p-4 border border-[var(--border)]">
                  <p className="text-[var(--accent)] text-base sm:text-lg font-black tracking-tighter">{stat.value}</p>
                  <p className="text-[var(--text-secondary)] text-[10px] sm:text-xs uppercase font-bold tracking-wider mt-1 truncate">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Search and Filter Section */}
        <div className="max-w-2xl mx-auto px-4 space-y-4 mb-6">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-secondary)]/50" />
            <input
              type="text"
              placeholder="Search surah..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border border-[var(--border)] rounded-xl py-3 pl-12 pr-12 focus:outline-none focus:border-[var(--accent)]/50 transition-colors bg-[var(--surface)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/50"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)]"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter Chips */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {[
              { key: 'all', label: 'All', icon: Filter },
              { key: 'meccan', label: 'Meccan', icon: Moon },
              { key: 'madinah', label: 'Madinah', icon: MapPin }
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => setFilter(item.key as 'all' | 'meccan' | 'madinah')}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
                  filter === item.key
                    ? 'bg-gradient-to-br from-[var(--accent)] to-[var(--accent-2)] text-[var(--on-accent)] shadow-[0_4px_18px_var(--accent-glow)]'
                    : 'bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border)] hover:bg-[var(--surface-2)]'
                }`}
              >
                <item.icon className="w-3.5 h-3.5" />
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Last Read Card */}
        {lastRead && (
          <div className="max-w-2xl mx-auto px-4 mb-6">
            <CSSOnlyTransition hoverScale={1.02} tapScale={0.98} duration={150}>
              <button
                onClick={() => {
                  if ('vibrate' in navigator) navigator.vibrate(15);
                  startTransition(() => {
                    navigate(`/quran/surah-${lastRead.number}`);
                  });
                }}
                className="w-full flex items-center p-4 bg-[var(--surface-2)] border border-[var(--border)] rounded-2xl gap-4 hover:border-[var(--accent)]/40 transition-all group active:scale-[0.98]"
              >
                <div className="w-12 h-12 bg-[var(--accent)] text-[var(--on-accent)] rounded-xl flex items-center justify-center shadow-lg shadow-[var(--accent-glow)] group-hover:scale-110 transition-transform">
                  <History className="w-6 h-6 text-[var(--on-accent)]" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-xs font-bold text-[var(--accent-text)] uppercase tracking-widest mb-1">Continue Reading</p>
                  <h3 className="text-lg font-black text-[var(--text-primary)]">{lastRead.name}</h3>
                  <p className="text-xs text-[var(--text-secondary)]">{lastRead.englishName}</p>
                </div>
              </button>
            </CSSOnlyTransition>
          </div>
        )}

        {/* Daily Ayah Card */}
        <div className="max-w-2xl mx-auto px-4 py-6">
          <CSSOnlyTransition hoverScale={0.98} tapScale={0.96} duration={150}>
            <div
              className="relative overflow-hidden rounded-[32px] bg-[var(--surface)] border border-[var(--border)] shadow-xl cursor-pointer active:scale-[0.98] transition-transform group"
              onClick={() => {
                if ('vibrate' in navigator) navigator.vibrate(15);
                startTransition(() => {
                  navigate('/quran');
                });
              }}
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--accent)]/5 rounded-full blur-[30px] -translate-y-1/2 translate-x-1/2 pointer-events-none group-hover:bg-[var(--accent)]/10 transition-colors" />

              <div className="relative z-10 p-8">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-4 h-4 text-[var(--accent)]" />
                  <span className="text-xs font-black uppercase tracking-[0.2em] text-[var(--accent)]">
                    {dailyAyah?.title || 'Verse of the Day'}
                  </span>
                </div>

                <div className="bg-[var(--surface-2)] rounded-2xl p-6 border border-[var(--border)] mb-4 shadow-sm">
                  <p className="text-[var(--text-primary)] text-base font-medium leading-relaxed mb-4">
                    {dailyAyah?.content || 'Loading...'}
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-[var(--accent-soft)] text-[var(--accent-text)] border border-[var(--border)] text-xs font-semibold">
                      {dailyAyah?.subtitle || 'Al-Baqarah 2:45'}
                    </Badge>
                    <span className="text-[var(--text-secondary)] text-xs font-medium">{dailyAyah?.reference || ''}</span>
                  </div>
                </div>

                <p className="text-[var(--text-secondary)] text-sm italic">
                  {dailyAyah?.reflection || ''}
                </p>
              </div>
            </div>
          </CSSOnlyTransition>
        </div>

        {/* Surah List */}
        <div className="max-w-2xl mx-auto px-4 py-6" ref={listRef}>
          {filteredSurahs.length > 0 ? (
            <div className="flex flex-col gap-2 pb-8">
              {filteredSurahs.map((surah, index) => (
                <div key={surah.number} style={{ contentVisibility: 'auto', containIntrinsicSize: '88px' }}>
                  <SurahCard 
                    surah={surah} 
                    index={index} 
                    isDark={isDark} 
                    onClick={handleSurahClick} 
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <div className="w-16 h-16 bg-muted/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">No surahs found</p>
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
