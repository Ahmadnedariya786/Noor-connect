import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { quranService } from '@/lib/quran-service';
import { MushafSurahPages } from '@/components/Quran/MushafSurahPages';
import { PageTransition } from '@/components/PageTransition';
import { Preferences } from '@capacitor/preferences';
import { useSettings } from '@/contexts/SettingsContext';
import { goBackOrFallback } from '@/lib/navigation';

const LS_LAST_SURAH = 'quran-reader-last-surah';
const BOOKMARKS_KEY = 'quran-bookmarks';

export default function QuranReader() {
  const { theme, effectiveTheme } = useSettings();
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

  const surahInfo = quranService.getSurahInfo(surahNum);
  const allSurahs = quranService.getAllSurahs();

  useEffect(() => {
    localStorage.setItem(LS_LAST_SURAH, String(surahNum));
    loadBookmark();
  }, [surahNum]);

  const loadBookmark = async () => {
    try {
      const { value } = await Preferences.get({ key: BOOKMARKS_KEY });
      const bookmarks = value ? JSON.parse(value) : [];
      setIsBookmarked(bookmarks.includes(surahNum));
    } catch {
      // Fallback to localStorage
      const bookmarks = JSON.parse(localStorage.getItem(BOOKMARKS_KEY) || '[]');
      setIsBookmarked(bookmarks.includes(surahNum));
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
      // Fallback to localStorage
      let bookmarks = JSON.parse(localStorage.getItem(BOOKMARKS_KEY) || '[]');
      if (bookmarks.includes(surahNum)) {
        bookmarks = bookmarks.filter((b: number) => b !== surahNum);
      } else {
        bookmarks.push(surahNum);
      }
      localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
      setIsBookmarked(!isBookmarked);
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

  const handleSwipe = (direction: 'left' | 'right') => {
    if (direction === 'left') {
      goToNextSurah();
    } else {
      goToPreviousSurah();
    }
  };

  return (
    <PageTransition>
      <div className={`min-h-screen relative overflow-hidden ${isDark ? 'bg-[#000000]' : 'bg-[#F5F5F5]'}`}>
        {/* Top Bar */}
        <div className={`sticky top-0 z-30 backdrop-blur-md border-b ${isDark ? 'bg-[#000000]/95 border-[#C9A84C]/20' : 'bg-[#F5F5F5]/95 border-[#C9A84C]/20'}`}>
          <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
            <button
              onClick={() => goBackOrFallback(navigate, '/quran')}
              className={`p-2 rounded-full transition-colors ${isDark ? 'text-white/60 hover:text-white hover:bg-white/5' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'}`}
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            <div className="text-center">
              <h1 className="text-lg font-bold text-[#C9A84C]">{surahInfo?.name}</h1>
              <p className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-500'}`}>{surahInfo?.englishName}</p>
            </div>

            <button
              onClick={toggleBookmark}
              className={`p-2 rounded-full transition-colors ${
                isBookmarked
                  ? 'text-[#C9A84C] bg-[#C9A84C]/10'
                  : isDark ? 'text-white/40 hover:text-white hover:bg-white/5' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-200/50'
              }`}
            >
              <Star className={`w-5 h-5 ${isBookmarked ? 'fill-current' : ''}`} />
            </button>
          </div>
        </div>

        {/* Mushaf Pages */}
        <div className="max-w-2xl mx-auto px-4 py-6">
          <MushafSurahPages surahNumber={surahNum} onSwipe={handleSwipe} />
        </div>

        {/* Floating Navigation Buttons */}
        <div className="fixed bottom-6 left-4 right-4 max-w-2xl mx-auto flex justify-between z-30">
          <button
            onClick={goToPreviousSurah}
            disabled={surahNum <= 1}
            className={`w-12 h-12 rounded-full border flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-colors ${
              isDark 
                ? 'bg-[#111111] border-[#C9A84C]/30 text-[#C9A84C] hover:bg-[#C9A84C]/10' 
                : 'bg-white border-[#C9A84C]/30 text-[#C9A84C] hover:bg-[#C9A84C]/10 shadow-sm'
            }`}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Page Indicator */}
          <div className={`px-4 py-2 rounded-full border text-xs font-medium ${
            isDark 
              ? 'bg-[#111111] border-[#C9A84C]/20 text-white/60' 
              : 'bg-white border-[#C9A84C]/20 text-gray-600 shadow-sm'
          }`}>
            Surah {surahNum} of 114
          </div>

          <button
            onClick={goToNextSurah}
            disabled={surahNum >= 114}
            className={`w-12 h-12 rounded-full border flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-colors ${
              isDark 
                ? 'bg-[#111111] border-[#C9A84C]/30 text-[#C9A84C] hover:bg-[#C9A84C]/10' 
                : 'bg-white border-[#C9A84C]/30 text-[#C9A84C] hover:bg-[#C9A84C]/10 shadow-sm'
            }`}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </PageTransition>
  );
}
