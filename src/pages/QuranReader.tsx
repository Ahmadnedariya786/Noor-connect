import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { quranService } from '@/lib/quran-service';
import { MushafSurahPages } from '@/components/Quran/MushafSurahPages';
import { PageTransition } from '@/components/PageTransition';
import { Preferences } from '@capacitor/preferences';
import { useSettings } from '@/contexts/SettingsContext';
import { goBackOrFallback } from '@/lib/navigation';
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
      if (m) return parseInt(m[1]);
    }
    const saved = localStorage.getItem(LS_LAST_SURAH);
    return saved ? parseInt(saved) : 1;
  })();

  const [surahNum, setSurahNum] = useState(initialSurah);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalSurahPages, setTotalSurahPages] = useState(1);
  const [maxPageViewed, setMaxPageViewed] = useState(1);

  const surahInfo = quranService.getSurahInfo(surahNum);
  const allSurahs = useMemo(() => quranService.getAllSurahs(), []);

  useEffect(() => {
    localStorage.setItem(LS_LAST_SURAH, String(surahNum));
    if (surahInfo) {
      localStorage.setItem('quran-last-read', JSON.stringify({ number: surahNum, name: surahInfo.englishName }));
    }
    loadBookmark();

    const syncId = setTimeout(() => {
      if (!surahInfo) return;
      quranFeaturesService.updateReadingStreak().catch(console.error);
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
      .catch(console.error);
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
      setIsBookmarked(!isBookmarked);
    } catch {
      try {
        let bookmarks = JSON.parse(localStorage.getItem(BOOKMARKS_KEY) || '[]');
        if (bookmarks.includes(surahNum)) {
          bookmarks = bookmarks.filter((b: number) => b !== surahNum);
        } else {
          bookmarks.push(surahNum);
        }
        localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
        setIsBookmarked(!isBookmarked);
      } catch {
        setIsBookmarked(!isBookmarked);
      }
    }
  };

  const goToPreviousSurah = () => {
    if (surahNum > 1) {
      setSurahNum(surahNum - 1);
    }
  };

  const goToNextSurah = () => {
    if (surahNum < 114) {
      setSurahNum(surahNum + 1);
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
        {/* Top Bar */}
        <div className="sticky top-0 z-30 backdrop-blur-md border-b safe-top bg-[var(--surface)]/95 border-[var(--border)]">
          <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
            <button
              onClick={() => goBackOrFallback(navigate, '/quran')}
              className="p-2 rounded-full transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)]"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            <div className="flex items-center gap-3">
              <button
                onClick={goToPreviousSurah}
                disabled={surahNum <= 1}
                className="p-1.5 rounded-full transition-colors disabled:opacity-20 disabled:cursor-default text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)]"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="text-center cursor-pointer" onClick={() => navigate('/quran', { replace: true })}>
                <h1 className="text-lg font-bold text-[var(--accent-text)]">{surahInfo?.name}</h1>
                <p className="text-xs text-[var(--text-secondary)]">{surahInfo?.englishName} — Page {currentPage} of {totalSurahPages}</p>
              </div>

              <button
                onClick={goToNextSurah}
                disabled={surahNum >= 114}
                className="p-1.5 rounded-full transition-colors disabled:opacity-20 disabled:cursor-default text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)]"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={toggleBookmark}
              className={`p-2 rounded-full transition-colors ${
                isBookmarked
                  ? 'text-[var(--accent-text)] bg-[var(--accent-soft)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)]'
              }`}
            >
              <Star className={`w-5 h-5 ${isBookmarked ? 'fill-current' : ''}`} />
            </button>
          </div>
        </div>

        {/* Mushaf Pages — vertical scroll */}
        <div className="max-w-2xl mx-auto px-4 py-6">
          <MushafSurahPages surahNumber={surahNum} onPageChange={handlePageChange} />
        </div>
      </div>
    </PageTransition>
  );
}
