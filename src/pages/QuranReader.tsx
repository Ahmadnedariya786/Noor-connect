import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Star } from 'lucide-react';
import { quranService } from '@/lib/quran-service';
import { MushafSurahPages, type MushafReadingMode } from '@/components/Quran/MushafSurahPages';
import { PageTransition } from '@/components/PageTransition';
import { Preferences } from '@capacitor/preferences';
import { useSettings } from '@/contexts/SettingsContext';
import { quranFeaturesService } from '@/lib/quran-features';

const LS_LAST_SURAH = 'quran-reader-last-surah';
const BOOKMARKS_KEY = 'quran-bookmarks';

export default function QuranReader() {
  const { effectiveTheme } = useSettings();
  const isDark = effectiveTheme === 'dark';

  const { surahName } = useParams<{ surahName: string }>();
  const navigate = useNavigate();

  const initialSurah = (() => {
    if (surahName) {
      const m = surahName.match(/surah-(\d+)/);
      if (m) return parseInt(m[1], 10);
    }
    const saved = localStorage.getItem(LS_LAST_SURAH);
    return saved ? parseInt(saved, 10) : 1;
  })();

  const [surahNum, setSurahNum] = useState(initialSurah);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalSurahPages, setTotalSurahPages] = useState(1);
  const [, setMaxPageViewed] = useState(1);

  // Eye-comfort mode persisted in localStorage "noor_mushaf_mode", default: 'parchment'
  const [mushafMode, setMushafMode] = useState<MushafReadingMode>(() => {
    try {
      const saved = localStorage.getItem('noor_mushaf_mode') as MushafReadingMode;
      if (saved === 'parchment' || saved === 'night' || saved === 'classic') {
        return saved;
      }
    } catch {
      // Fallback to default parchment
    }
    return 'parchment';
  });

  const handleModeChange = (mode: MushafReadingMode) => {
    setMushafMode(mode);
    try {
      localStorage.setItem('noor_mushaf_mode', mode);
    } catch {
      // Ignore storage write error
    }
  };

  // Sync with route param
  useEffect(() => {
    if (surahName) {
      const m = surahName.match(/surah-(\d+)/);
      if (m) {
        const parsed = parseInt(m[1], 10);
        if (!isNaN(parsed) && parsed >= 1 && parsed <= 114 && parsed !== surahNum) {
          setSurahNum(parsed);
        }
      }
    }
  }, [surahName, surahNum]);

  const surahInfo = quranService.getSurahInfo(surahNum);

  useEffect(() => {
    localStorage.setItem(LS_LAST_SURAH, String(surahNum));
    if (surahInfo) {
      const lastReadData = {
        number: surahNum,
        name: surahInfo.englishName,
        englishName: surahInfo.englishName,
        arabicName: surahInfo.name,
        page: currentPage,
        totalPages: totalSurahPages,
      };
      localStorage.setItem('quran-last-read', JSON.stringify(lastReadData));
    }
    loadBookmark();

    const syncId = setTimeout(() => {
      if (!surahInfo) return;
      quranFeaturesService.updateReadingStreak().catch((e) => {
        // Safe catch for streak update
        console.warn('Streak update warning', e);
      });
      const completedAyahs = Math.round((currentPage / totalSurahPages) * surahInfo.numberOfAyahs);
      quranFeaturesService.updateRecitationProgress(
        surahNum,
        surahInfo.englishName,
        surahInfo.numberOfAyahs,
        completedAyahs,
        completedAyahs,
        currentPage,
        totalSurahPages
      )
      .then(() => quranFeaturesService.checkAndUnlockAchievements())
      .then(() => {
        window.dispatchEvent(new CustomEvent('noorconnect:quran-progress-changed'));
      })
      .catch((e) => {
        // Safe catch for progress update
        console.warn('Progress update warning', e);
      });
    }, 1000);

    return () => clearTimeout(syncId);
  }, [surahNum, surahInfo, currentPage, totalSurahPages]);

  const loadBookmark = async () => {
    try {
      const { value } = await Preferences.get({ key: BOOKMARKS_KEY });
      const bookmarks = value ? JSON.parse(value) : [];
      setIsBookmarked(bookmarks.includes(surahNum));
    } catch {
      try {
        const bookmarks = JSON.parse(localStorage.getItem(BOOKMARKS_KEY) || '[]');
        setIsBookmarked(bookmarks.includes(surahNum));
      } catch {
        setIsBookmarked(false);
      }
    }
  };

  const toggleBookmark = async () => {
    try {
      const { value } = await Preferences.get({ key: BOOKMARKS_KEY });
      let bookmarks = value ? JSON.parse(value) : [];

      if (bookmarks.includes(surahNum)) {
        bookmarks = bookmarks.filter((b: number) => b !== surahNum);
      } else {
        bookmarks.push(surahNum);
      }

      await Preferences.set({ key: BOOKMARKS_KEY, value: JSON.stringify(bookmarks) });
      localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
      setIsBookmarked(bookmarks.includes(surahNum));
      window.dispatchEvent(new CustomEvent('noorconnect:quran-bookmarks-changed', { detail: bookmarks }));
    } catch {
      try {
        let bookmarks = JSON.parse(localStorage.getItem(BOOKMARKS_KEY) || '[]');
        if (bookmarks.includes(surahNum)) {
          bookmarks = bookmarks.filter((b: number) => b !== surahNum);
        } else {
          bookmarks.push(surahNum);
        }
        localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
        setIsBookmarked(bookmarks.includes(surahNum));
        window.dispatchEvent(new CustomEvent('noorconnect:quran-bookmarks-changed', { detail: bookmarks }));
      } catch {
        setIsBookmarked(!isBookmarked);
      }
    }
  };

  const goToPreviousSurah = () => {
    if (surahNum > 1) {
      const nextNum = surahNum - 1;
      setSurahNum(nextNum);
      navigate(`/quran/surah-${nextNum}`, { replace: true });
    }
  };

  const goToNextSurah = () => {
    if (surahNum < 114) {
      const nextNum = surahNum + 1;
      setSurahNum(nextNum);
      navigate(`/quran/surah-${nextNum}`, { replace: true });
    }
  };

  const handlePageChange = (page: number, total: number, maxViewed: number) => {
    setCurrentPage(page);
    setTotalSurahPages(total);
    setMaxPageViewed(maxViewed);
  };

  return (
    <PageTransition>
      <div className="min-h-screen relative overflow-hidden bg-[var(--bg-base)]">
        {/* Upgraded Top Reader Control Bar */}
        <div className="sticky top-0 z-30 backdrop-blur-md border-b safe-top bg-[var(--surface)]/95 border-[var(--border)] shadow-sm">
          <div className="max-w-2xl mx-auto px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2">
            {/* Left: Clean back button returning to /quran via { replace: true } */}
            <button
              type="button"
              onClick={() => navigate('/quran', { replace: true })}
              className="flex items-center gap-1 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] font-bold text-[var(--text-primary)] hover:border-[var(--accent)] transition-colors shrink-0 select-none"
              style={{ padding: '5px 8px', fontSize: '0.72rem' }}
            >
              <ChevronLeft className="w-3.5 h-3.5 text-[var(--accent-text)]" />
              <span>Quran</span>
            </button>

            {/* Center: Arabic Surah Title + English Surah Name + Subtitle */}
            <div
              className="cursor-pointer select-none"
              style={{ flex: 1, minWidth: 0, textAlign: 'center', padding: '0 4px' }}
              onClick={() => navigate('/quran', { replace: true })}
              title="Return to Quran index"
            >
              <h1 className="font-arabic font-bold text-base sm:text-lg text-[var(--accent-text)] leading-tight truncate">
                {surahInfo?.name}
              </h1>
              <p className="text-xs font-bold text-[var(--text-primary)] truncate">
                {surahInfo?.englishName}
              </p>
              <p
                className="text-[var(--text-secondary)] font-medium"
                style={{ fontSize: '0.72rem', whiteSpace: 'nowrap', lineHeight: 1.2 }}
              >
                Surah #{surahNum} • {totalSurahPages} Pages
              </p>
            </div>

            {/* Right: Prev / Next compact pill buttons + Bookmark toggle button */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={goToPreviousSurah}
                disabled={surahNum <= 1}
                title="Previous Surah"
                className="rounded-lg font-bold border border-[var(--border)] bg-[var(--surface-2)] disabled:opacity-20 disabled:cursor-not-allowed text-[var(--text-primary)] hover:border-[var(--accent)]/50 transition-colors select-none"
                style={{ padding: '5px 8px', fontSize: '0.72rem' }}
              >
                ‹ Prev
              </button>
              <button
                type="button"
                onClick={goToNextSurah}
                disabled={surahNum >= 114}
                title="Next Surah"
                className="rounded-lg font-bold border border-[var(--border)] bg-[var(--surface-2)] disabled:opacity-20 disabled:cursor-not-allowed text-[var(--text-primary)] hover:border-[var(--accent)]/50 transition-colors select-none"
                style={{ padding: '5px 8px', fontSize: '0.72rem' }}
              >
                Next ›
              </button>
              <button
                type="button"
                onClick={toggleBookmark}
                title={isBookmarked ? 'Remove Bookmark' : 'Bookmark Surah'}
                className={`rounded-lg border transition-all select-none ${
                  isBookmarked
                    ? 'bg-[var(--accent-soft)] text-[var(--accent-text)] border-[var(--accent)] shadow-sm'
                    : 'bg-[var(--surface-2)] text-[var(--text-secondary)] border-[var(--border)] hover:text-[var(--text-primary)]'
                }`}
                style={{ padding: '5px 7px' }}
              >
                <Star className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-[var(--accent)] text-[var(--accent)]' : ''}`} />
              </button>
            </div>
          </div>

          {/* 3-Mode Eye-Comfort Reading Filter Bar */}
          <div className="border-t border-[var(--border)]/60 bg-[var(--surface)] px-3 py-1.5 flex items-center justify-center gap-2">
            {[
              { mode: 'parchment' as const, icon: '📜', label: 'Parchment' },
              { mode: 'night' as const, icon: '🌙', label: 'Night Ink' },
              { mode: 'classic' as const, icon: '☀️', label: 'Classic' },
            ].map((item) => {
              const isActive = mushafMode === item.mode;
              return (
                <button
                  key={item.mode}
                  type="button"
                  onClick={() => handleModeChange(item.mode)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all select-none ${
                    isActive
                      ? 'bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-[var(--on-accent)] shadow-[0_2px_10px_var(--accent-glow)]'
                      : 'bg-[var(--surface-2)] text-[var(--text-secondary)] border border-[var(--border)] hover:bg-[var(--surface)]'
                  }`}
                >
                  <span className="text-xs leading-none">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Mushaf Pages — vertical scroll with eye-comfort styling */}
        <div className="max-w-2xl mx-auto px-4 py-4">
          <MushafSurahPages
            surahNumber={surahNum}
            mushafMode={mushafMode}
            onPageChange={handlePageChange}
          />
        </div>
      </div>
    </PageTransition>
  );
}
