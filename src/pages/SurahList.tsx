import { useState, useMemo, useEffect, memo, useRef, startTransition } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, Sparkles, History, ArrowRight, Star } from "lucide-react";
import { quranService, type SurahInfo } from "@/lib/quran-service";
import { PageTransition } from "@/components/PageTransition";
import { useSettings } from "@/contexts/SettingsContext";
import { getDailyAyah } from "@/lib/daily-content";
import { Badge } from "@/components/ui/badge";
import { Preferences } from "@capacitor/preferences";
import { CSSOnlyTransition } from '@/components/AdaptiveMotion';

const BOOKMARKS_KEY = 'quran-bookmarks';

interface SurahCardProps {
  surah: SurahInfo;
  index: number;
  isDark: boolean;
  isBookmarked: boolean;
  onClick: (number: number) => void;
}

const SurahCard = memo(function SurahCard({ surah, isBookmarked, onClick }: SurahCardProps) {
  return (
    <button
      onClick={() => onClick(surah.number)}
      className="w-full text-left outline-none active:scale-[0.98] transition-transform duration-150 group"
    >
      <div
        className="w-full flex items-center justify-between gap-3 p-3.5 sm:p-4 rounded-[18px] bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--accent)]/40 transition-colors"
        style={{
          boxShadow: 'inset 0 1px 0 var(--card-sheen)',
        }}
      >
        {/* Left Side: 8-Point Rub el Hizb Star Emblem + Details Stack */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* 8-Point Rub el Hizb Star Emblem for Surah Number */}
          <div className="relative w-[42px] h-[42px] flex items-center justify-center shrink-0">
            <svg width="42" height="42" viewBox="0 0 42 42" className="w-[42px] h-[42px] absolute inset-0">
              <rect x="8" y="8" width="26" height="26" rx="3.5" fill="var(--surface-2)" stroke="var(--accent)" strokeWidth="1.2" />
              <rect x="8" y="8" width="26" height="26" rx="3.5" transform="rotate(45 21 21)" fill="var(--surface-2)" stroke="var(--accent)" strokeWidth="1.2" />
            </svg>
            <span className="relative z-10 font-bold text-[var(--accent-text)] text-[0.82rem] leading-none select-none">
              {surah.number}
            </span>
          </div>

          {/* Surah Details Stack */}
          <div className="min-w-0 flex-1 space-y-0.5">
            {/* Top Line: English Transliterated Name */}
            <h3 className="font-bold text-base text-[var(--text-primary)] group-hover:text-[var(--accent-text)] transition-colors leading-tight truncate">
              {surah.englishName}
            </h3>
            {/* Middle Line: Full English Meaning (Zero Premature Truncation) */}
            <p className="text-[0.78rem] text-[var(--text-secondary)] font-medium leading-snug">
              {surah.englishNameTranslation}
            </p>
            {/* Bottom Line: Metadata Pills */}
            <div className="flex items-center gap-1.5 pt-0.5">
              <span
                className="uppercase font-bold tracking-wider rounded-[6px]"
                style={{
                  background: 'var(--accent-soft)',
                  color: 'var(--accent-text)',
                  fontSize: '0.65rem',
                  padding: '2px 7px',
                }}
              >
                {surah.revelationType.toUpperCase()}
              </span>
              <span className="text-[var(--text-secondary)] text-[0.72rem] font-semibold">
                • {surah.numberOfAyahs} AYAHS
              </span>
            </div>
          </div>
        </div>

        {/* Right Side: Dedicated Arabic Calligraphy Column */}
        <div className="shrink-0 text-right flex flex-col items-end justify-center pl-2">
          <div className="flex items-center gap-1.5 justify-end">
            {isBookmarked && (
              <span className="text-[var(--accent-text)] text-xs select-none drop-shadow-sm" title="Saved">★</span>
            )}
            <span className="font-arabic font-bold text-[1.35rem] text-[var(--accent-text)] leading-none select-none">
              {surah.name}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}, (prevProps, nextProps) => (
  prevProps.surah.number === nextProps.surah.number &&
  prevProps.surah.name === nextProps.surah.name &&
  prevProps.surah.englishName === nextProps.surah.englishName &&
  prevProps.isDark === nextProps.isDark &&
  prevProps.isBookmarked === nextProps.isBookmarked
));

type FilterTab = 'all' | 'meccan' | 'medinan' | 'saved';

export default function SurahList() {
  const { effectiveTheme } = useSettings();
  const isDark = effectiveTheme === 'dark';
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<FilterTab>('all');
  const [lastRead, setLastRead] = useState<{ number: number; name: string; englishName?: string; arabicName?: string; page?: number; totalPages?: number } | null>(null);
  const [bookmarkedSurahs, setBookmarkedSurahs] = useState<number[]>(() => {
    try {
      const raw = localStorage.getItem(BOOKMARKS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      // Fallback to empty list
      return [];
    }
  });
  const listRef = useRef<HTMLDivElement>(null);

  const dailyAyah = useMemo(() => getDailyAyah(), []);
  const allSurahs = useMemo(() => quranService.getAllSurahs(), []);

  const tokenizedReference = useMemo(() => {
    const raw = dailyAyah?.reference || dailyAyah?.subtitle || 'Al-Baqarah 2:45';
    if (!raw.includes('•')) {
      const match = raw.match(/^(.*?)\s*(\d+:\d+|\d+)$/);
      if (match) {
        return `${match[1].trim()} • ${match[2].trim()}`;
      }
    }
    return raw;
  }, [dailyAyah]);

  const dailySurahNumber = useMemo(() => {
    const raw = dailyAyah?.reference || dailyAyah?.subtitle || '';
    const match = raw.match(/(\d+):/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num >= 1 && num <= 114) return num;
    }
    const lower = raw.toLowerCase();
    if (lower.includes('baqarah')) return 2;
    if (lower.includes('imran')) return 3;
    if (lower.includes('tawbah')) return 9;
    if (lower.includes("ra'd") || lower.includes("rad")) return 13;
    return null;
  }, [dailyAyah]);

  // Load last read and bookmarks
  useEffect(() => {
    try {
      const saved = localStorage.getItem('quran-last-read');
      if (saved) setLastRead(JSON.parse(saved));
    } catch {
      // Ignore parse errors
    }

    const syncBookmarks = async () => {
      try {
        const { value } = await Preferences.get({ key: BOOKMARKS_KEY });
        if (value) {
          setBookmarkedSurahs(JSON.parse(value));
          return;
        }
      } catch {
        // Fallback to localStorage
      }
      try {
        const raw = localStorage.getItem(BOOKMARKS_KEY);
        if (raw) setBookmarkedSurahs(JSON.parse(raw));
      } catch {
        // Keep current state
      }
    };

    syncBookmarks();

    const handleBookmarksChanged = (e: Event) => {
      const custom = e as CustomEvent<number[]>;
      if (custom.detail) {
        setBookmarkedSurahs(custom.detail);
      } else {
        syncBookmarks();
      }
    };

    window.addEventListener('noorconnect:quran-bookmarks-changed', handleBookmarksChanged);
    window.addEventListener('focus', syncBookmarks);
    return () => {
      window.removeEventListener('noorconnect:quran-bookmarks-changed', handleBookmarksChanged);
      window.removeEventListener('focus', syncBookmarks);
    };
  }, []);

  const lastReadInfo = useMemo(() => {
    if (!lastRead) return null;
    return quranService.getSurahInfo(lastRead.number);
  }, [lastRead]);

  const filteredSurahs = useMemo(() => {
    let surahs = allSurahs;

    // Apply revelation type / saved filter
    if (filter === 'meccan') {
      surahs = surahs.filter(s => s.revelationType === 'Meccan');
    } else if (filter === 'medinan') {
      surahs = surahs.filter(s => s.revelationType === 'Medinan' || (s as unknown as { revelationType: string }).revelationType === 'Madinah');
    } else if (filter === 'saved') {
      surahs = surahs.filter(s => bookmarkedSurahs.includes(s.number));
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      surahs = surahs.filter(
        (s) =>
          s.englishName.toLowerCase().includes(query) ||
          s.name.includes(query) ||
          s.englishNameTranslation.toLowerCase().includes(query) ||
          s.number.toString() === query
      );
    }

    return surahs;
  }, [allSurahs, filter, bookmarkedSurahs, searchQuery]);

  const handleSurahClick = (surahNumber: number) => {
    if ('vibrate' in navigator) navigator.vibrate(15);
    startTransition(() => {
      navigate(`/quran/surah-${surahNumber}`, { replace: true });
    });
  };

  return (
    <PageTransition>
      <div className="min-h-screen relative overflow-hidden bg-[var(--bg-base)] pb-24">
        {/* Subtle Islamic geometric pattern backdrop */}
        <div className="absolute top-0 left-0 right-0 h-48 opacity-[0.03] bg-[radial-gradient(circle_at_2px_2px,_var(--accent)_1px,_transparent_0)] bg-[length:32px_32px] pointer-events-none" />

        {/* Illuminated Semantic Emerald-Gold Header */}
        <div className="max-w-2xl mx-auto px-4 pt-3 pb-2 safe-top">
          <div
            className="relative overflow-hidden p-5 sm:p-6 mb-4"
            style={{
              background: 'linear-gradient(145deg, rgba(16, 85, 60, 0.28), var(--surface))',
              border: '1px solid var(--border)',
              boxShadow: 'inset 0 1px 0 var(--card-sheen)',
              borderRadius: '22px',
            }}
          >
            {/* Subtle Arabesque Watermark */}
            <div className="absolute -right-6 -bottom-6 w-44 h-44 opacity-[0.06] pointer-events-none text-[var(--accent)]">
              <svg viewBox="0 0 100 100" fill="currentColor" className="w-full h-full">
                <rect x="20" y="20" width="60" height="60" rx="8" />
                <rect x="20" y="20" width="60" height="60" rx="8" transform="rotate(45 50 50)" />
              </svg>
            </div>

            <div className="relative z-10 flex flex-col items-center text-center">
              {/* Decorative Bismillah Subtitle */}
              <p className="font-arabic text-sm sm:text-base text-[var(--accent-text)] font-semibold mb-1 drop-shadow-sm select-none">
                بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ • ٱلْقُرْآنُ ٱلْكَرِيمُ
              </p>
              <h1 className="text-2xl sm:text-3xl font-arabic font-bold text-[var(--text-primary)] tracking-wide">
                Al-Quran Al-Kareem
              </h1>
              <p className="text-[var(--text-secondary)] text-xs font-medium max-w-[280px] leading-relaxed mt-1">
                Read, listen, and contemplate the divine guidance
              </p>

              {/* Recessed Jewel Pods */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3 w-full max-w-sm mt-4">
                {[
                  { label: 'SURAHS', value: '114' },
                  { label: 'AYAHS', value: '6,236' },
                  { label: 'JUZ', value: '30' },
                ].map((stat, idx) => (
                  <div
                    key={idx}
                    className="bg-[var(--surface-2)] border border-[var(--border)] rounded-[14px] p-2.5 sm:p-3 text-center shadow-inner"
                  >
                    <p className="text-[var(--accent-text)] text-base sm:text-lg font-black tracking-tight leading-none">
                      {stat.value}
                    </p>
                    <p className="text-[var(--text-secondary)] text-[10px] uppercase font-bold tracking-wider mt-1 truncate">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Search Input & 4-Pill Filter Section */}
        <div className="max-w-2xl mx-auto px-4 space-y-3 mb-4">
          {/* Glass Pill Search Input */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]/60 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by Surah name, number, or meaning..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border border-[var(--border)] rounded-[14px] py-3 pl-11 pr-11 text-xs sm:text-sm focus:outline-none focus:border-[var(--accent)] transition-colors bg-[var(--surface)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/50 shadow-sm"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)] transition-colors"
                title="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* 4-Pill Filter Row (Fits 100% inside 360px) */}
          <div
            className="w-full grid grid-cols-4 gap-1.5"
            style={{ minWidth: 0 }}
          >
            {[
              { key: 'all' as const, label: 'All' },
              { key: 'meccan' as const, label: 'Meccan' },
              { key: 'medinan' as const, label: 'Medinan' },
              { key: 'saved' as const, label: '★ Saved' },
            ].map((item) => {
              const isActive = filter === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setFilter(item.key)}
                  className={`w-full py-2 px-1 text-center rounded-[12px] text-[11px] font-bold uppercase tracking-wider transition-all truncate select-none ${
                    isActive
                      ? 'bg-gradient-to-br from-[var(--accent)] to-[var(--accent-2)] text-[var(--on-accent)] shadow-[0_4px_18px_var(--accent-glow)]'
                      : 'bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border)] hover:bg-[var(--surface-2)]'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Continue Reading Luxury Card */}
        {lastRead && (
          <div className="max-w-2xl mx-auto px-4 mb-4">
            <div
              onClick={() => {
                if ('vibrate' in navigator) navigator.vibrate(15);
                startTransition(() => {
                  navigate(`/quran/surah-${lastRead.number}`, { replace: true });
                });
              }}
              className="w-full flex items-center justify-between gap-3 p-3.5 sm:p-4 rounded-[18px] border border-[var(--accent)] cursor-pointer active:scale-[0.98] transition-transform duration-150"
              style={{
                background: 'linear-gradient(135deg, var(--surface), var(--surface-2))',
                boxShadow: '0 4px 18px var(--accent-glow)',
              }}
            >
              {/* Left & Center */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-[var(--accent-soft)] border border-[var(--accent)] text-[var(--accent-text)]">
                  <History className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <p className="text-[10px] font-bold text-[var(--accent-text)] uppercase tracking-wider mb-0.5">
                    CONTINUE READING
                  </p>
                  <h3 className="text-sm sm:text-base font-bold text-[var(--text-primary)] truncate">
                    Surah {lastReadInfo?.englishName || lastRead.name}
                  </h3>
                  <p className="text-[11px] text-[var(--text-secondary)] truncate">
                    Surah #{lastRead.number}{lastRead.page ? ` • Page ${lastRead.page}` : ''} • Tap to resume
                  </p>
                </div>
              </div>

              {/* Right: Crisp Arabic + Resume Button */}
              <div className="flex flex-col items-end gap-1.5 shrink-0 text-right">
                <span className="font-arabic font-bold text-base sm:text-lg text-[var(--accent-text)] leading-tight select-none">
                  {lastReadInfo?.name || lastRead.arabicName || ''}
                </span>
                <span
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold tracking-tight shadow-sm select-none"
                  style={{
                    background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
                    color: 'var(--on-accent)',
                  }}
                >
                  <span>Resume</span>
                  <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Verse of the Day Card */}
        <div className="max-w-2xl mx-auto px-4 mb-4">
          <CSSOnlyTransition hoverScale={0.99} tapScale={0.98} duration={150}>
            <div
              className="relative overflow-hidden rounded-[20px] bg-[var(--surface)] border border-[var(--border)] shadow-md cursor-pointer active:scale-[0.98] transition-transform p-4 sm:p-5"
              onClick={() => {
                if ('vibrate' in navigator) navigator.vibrate(15);
                startTransition(() => {
                  if (dailySurahNumber) {
                    navigate(`/quran/surah-${dailySurahNumber}`, { replace: true });
                  }
                });
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-[var(--accent)]" />
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--accent)]">
                  {dailyAyah?.title || 'Verse of the Day'}
                </span>
              </div>

              <div
                className="bg-[var(--surface-2)] rounded-xl p-3.5 sm:p-4 border border-[var(--border)] mb-2.5 shadow-sm"
                style={{ borderLeft: '3px solid var(--accent)' }}
              >
                <p className="text-[var(--text-primary)] text-xs sm:text-sm font-medium leading-relaxed mb-3">
                  "{dailyAyah?.content || 'Loading...'}"
                </p>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <Badge className="bg-[var(--accent-soft)] text-[var(--accent-text)] border border-[var(--border)] text-[11px] font-semibold px-2 py-0.5">
                    {tokenizedReference}
                  </Badge>
                  {dailySurahNumber ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if ('vibrate' in navigator) navigator.vibrate(15);
                        startTransition(() => {
                          navigate(`/quran/surah-${dailySurahNumber}`, { replace: true });
                        });
                      }}
                      className="text-xs font-semibold text-[var(--accent-text)] hover:underline inline-flex items-center gap-1 group/btn"
                    >
                      <span>Read in Surah</span>
                      <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover/btn:translate-x-0.5" />
                    </button>
                  ) : null}
                </div>
              </div>

              {dailyAyah?.reflection && (
                <p className="text-[var(--text-secondary)] text-[11px] italic leading-relaxed">
                  {dailyAyah.reflection}
                </p>
              )}
            </div>
          </CSSOnlyTransition>
        </div>

        {/* 114 Surah List (Royal 2-Column Layout) */}
        <div className="max-w-2xl mx-auto px-4" ref={listRef}>
          {filteredSurahs.length > 0 ? (
            <div className="flex flex-col gap-2 pb-8">
              {filteredSurahs.map((surah, index) => (
                <div key={surah.number} style={{ contentVisibility: 'auto', containIntrinsicSize: '88px' }}>
                  <SurahCard 
                    surah={surah} 
                    index={index} 
                    isDark={isDark} 
                    isBookmarked={bookmarkedSurahs.includes(surah.number)}
                    onClick={handleSurahClick} 
                  />
                </div>
              ))}
            </div>
          ) : filter === 'saved' ? (
            /* Clean Empty State for Saved Surahs */
            <div className="text-center py-12 px-6 rounded-2xl bg-[var(--surface)] border border-[var(--border)] max-w-md mx-auto my-6 shadow-sm">
              <div className="w-14 h-14 rounded-2xl bg-[var(--accent-soft)] border border-[var(--accent)] flex items-center justify-center mx-auto mb-3 text-[var(--accent-text)]">
                <Star className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-[var(--text-primary)] mb-1">No Saved Surahs Yet</h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed max-w-xs mx-auto">
                Tap the <span className="text-[var(--accent-text)] font-bold">★ Star</span> icon in the top bar of any Surah while reading to quickly access it here.
              </p>
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="w-14 h-14 bg-[var(--surface-2)] border border-[var(--border)] rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Search className="w-6 h-6 text-[var(--text-secondary)]" />
              </div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">No surahs found</p>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">Try a different name or number</p>
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
