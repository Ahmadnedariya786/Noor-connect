import { useMemo, useRef, useEffect, useState } from 'react';
import { MushafPage as MushafPageType, MushafLine, MushafWord as MushafWordType } from '@/lib/mushaf-service';
import { MushafWord } from './MushafWord';
import { ScrollArea } from '@/components/ui/scroll-area';

// Lazy word list component to optimize rendering of many words
interface LazyWordListProps {
  words: MushafWordType[];
  fontSize: number;
  currentPlayingLocation?: string;
  highlightedWord?: string;
  onPlayWordAudio?: (location: string) => void;
  onShowTooltip?: (word: any, position: { x: number; y: number }) => void;
}

function LazyWordList({ words, fontSize, currentPlayingLocation, highlightedWord, onPlayWordAudio, onShowTooltip }: LazyWordListProps) {
  const [visibleWords, setVisibleWords] = useState<Set<number>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const index = parseInt(entry.target.getAttribute('data-index') || '0');
            setVisibleWords(prev => new Set([...prev, index]));
          }
        });
      },
      { rootMargin: '50px' }
    );

    const wordElements = containerRef.current?.querySelectorAll('[data-index]');
    wordElements?.forEach(el => observer.observe(el));

    return () => observer.disconnect();
  }, [words]);

  return (
    <div ref={containerRef}>
      {words.map((word, wordIndex) => {
        const wordMatch = word.word.match(/^(.*?)(\d+)$/);
        const isLastWord = !!wordMatch;
        const verseNum = isLastWord ? parseInt(wordMatch[2]) : null;
        const textOnly = isLastWord ? wordMatch[1] : word.word;
        const isVisible = visibleWords.has(wordIndex);

        return (
          <span key={wordIndex} className="inline-block" data-index={wordIndex}>
            {isVisible ? (
              <>
                <MushafWord
                  word={{...word, word: textOnly || word.word}}
                  fontSize={fontSize + 4}
                  isPlaying={currentPlayingLocation === word.location}
                  isHighlighted={highlightedWord === word.location}
                  onPlayAudio={onPlayWordAudio}
                  onShowTooltip={onShowTooltip}
                />
                {isLastWord && verseNum && (
                  <span className="inline-flex items-center justify-center mx-1">
                    <span 
                      className="w-7 h-7 rounded-full border-2 border-amber-600 dark:border-amber-500 flex items-center justify-center text-sm font-bold text-amber-800 dark:text-amber-200 font-arabic bg-gradient-to-br from-white to-amber-50 dark:from-amber-900 dark:to-amber-950 shadow-sm"
                      style={{
                        fontFamily: 'var(--quran-font), "Uthmani", "Traditional Arabic", serif',
                      }}
                    >
                      {verseNum}
                    </span>
                  </span>
                )}
              </>
            ) : (
              <span style={{ opacity: 0 }} className="inline-block">
                {/* Placeholder to maintain layout */}
                <span style={{ 
                  fontFamily: 'var(--quran-font), "Uthmani", "Traditional Arabic", serif',
                  fontSize: `${fontSize + 4}px`,
                  lineHeight: '2.8',
                  letterSpacing: '0.02em'
                }}>
                  {textOnly || word.word}
                </span>
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}

interface MushafPageProps {
  page: MushafPageType;
  fontSize: number;
  currentPlayingLocation?: string;
  highlightedWord?: string;
  onPlayWordAudio?: (location: string) => void;
  onShowTooltip?: (word: any, position: { x: number; y: number }) => void;
}

export function MushafPage({
  page,
  fontSize,
  currentPlayingLocation,
  highlightedWord,
  onPlayWordAudio,
  onShowTooltip
}: MushafPageProps) {
  // Find surah header if this is the start of a surah
  const surahHeaderLine = page.lines.find(line => line.type === 'surah-header');
  const isSurahStart = !!surahHeaderLine;
  const surahName = surahHeaderLine?.text || '';

  const renderLine = useMemo(() => (line: MushafLine, index: number) => {
    switch (line.type) {
      case 'surah-header':
        // Skip rendering in main content - shown in decorative header
        if (isSurahStart) return null;
        return (
          <div key={`line-${index}`} className="text-center py-4">
            <p
              className="font-arabic text-2xl font-bold text-amber-900 dark:text-amber-100"
              style={{
                fontFamily: 'var(--quran-font), "Uthmani", "Traditional Arabic", serif',
                fontSize: `${fontSize + 4}px`
              }}
            >
              {line.text}
            </p>
          </div>
        );

      case 'basmala':
        return (
          <div key={`line-${index}`} className="text-center py-6">
            <p
              className="font-arabic text-3xl text-amber-900 dark:text-amber-100"
              style={{
                fontFamily: 'var(--quran-font), "Uthmani", "Traditional Arabic", serif',
                fontSize: `${fontSize + 10}px`,
                lineHeight: '2.5'
              }}
            >
              {line.text || 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ'}
            </p>
          </div>
        );

      case 'text':
        return (
          <div key={`line-${index}`} className="relative py-3">
            {/* Render words with proper Mushaf styling */}
            <p
              className="text-right leading-loose"
              style={{
                fontFamily: 'var(--quran-font), "Uthmani", "Traditional Arabic", serif',
                fontSize: `${fontSize + 4}px`,
                lineHeight: '2.8',
                letterSpacing: '0.02em'
              }}
            >
              {line.words && line.words.length > 0 ? (
                <LazyWordList 
                  words={line.words} 
                  fontSize={fontSize}
                  currentPlayingLocation={currentPlayingLocation}
                  highlightedWord={highlightedWord}
                  onPlayWordAudio={onPlayWordAudio}
                  onShowTooltip={onShowTooltip}
                />
              ) : (
                <span className="text-amber-800 dark:text-amber-200">
                  {line.text}
                </span>
              )}
            </p>
          </div>
        );

      default:
        return null;
    }
  }, [fontSize, currentPlayingLocation, highlightedWord, onPlayWordAudio, onShowTooltip, isSurahStart]);

  return (
    <div className="min-h-full">
      {/* Decorative Header for Surah Start */}
      {isSurahStart && (
        <div className="relative mb-6">
          {/* Main header container with teal/green Islamic theme */}
          <div className="relative bg-gradient-to-r from-teal-700 via-teal-600 to-teal-700 rounded-t-2xl overflow-hidden h-24">
            {/* Decorative pattern using CSS */}
            <div className="absolute inset-0 opacity-20">
              <div className="absolute inset-0" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.3'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                backgroundSize: '30px 30px'
              }} />
            </div>
            
            {/* Left decorative border */}
            <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-yellow-500 via-yellow-400 to-yellow-500 flex items-center justify-center">
              <div className="w-8 h-full flex flex-col items-center justify-around py-2">
                <div className="w-4 h-4 rounded-full bg-white/80" />
                <div className="w-1 h-8 bg-white/60 rounded-full" />
                <div className="w-4 h-4 rounded-full bg-white/80" />
              </div>
            </div>
            
            {/* Right decorative border */}
            <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-r from-yellow-500 via-yellow-400 to-yellow-500 flex items-center justify-center">
              <div className="w-8 h-full flex flex-col items-center justify-around py-2">
                <div className="w-4 h-4 rounded-full bg-white/80" />
                <div className="w-1 h-8 bg-white/60 rounded-full" />
                <div className="w-4 h-4 rounded-full bg-white/80" />
              </div>
            </div>
            
            {/* Center content - Surah name */}
            <div className="relative z-10 h-full flex flex-col items-center justify-center px-20">
              <h1
                className="font-arabic text-3xl md:text-4xl font-bold text-white drop-shadow-lg"
                style={{
                  fontFamily: 'var(--quran-font), "Uthmani", "Traditional Arabic", serif',
                  textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
                }}
              >
                {surahName}
              </h1>
            </div>
            
            {/* Bottom decorative line */}
            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gradient-to-r from-yellow-600 via-yellow-400 to-yellow-600" />
          </div>
        </div>
      )}

      {/* Page Header (if not surah start) */}
      {!isSurahStart && (
        <div className="text-center mb-6">
          <span className="inline-block px-4 py-2 text-sm font-bold bg-gradient-to-r from-amber-400 to-orange-400 text-white border-2 border-amber-300 dark:border-amber-600 rounded-full shadow-lg font-arabic">
            {page.page}
          </span>
        </div>
      )}

      {/* Page Content - Authentic Mushaf Style */}
      <div className="relative bg-white dark:bg-slate-900 rounded-b-2xl shadow-2xl overflow-hidden" style={{ minHeight: '500px' }}>
        {/* Inner border decoration */}
        <div className="absolute inset-4 border-2 border-amber-200 dark:border-amber-800 rounded-xl pointer-events-none" />
        
        <div className="relative p-6 md:p-10">
          <ScrollArea className="h-[calc(100vh-300px)] md:h-[calc(100vh-260px)]">
            <div className="space-y-1">
              {page.lines.map((line, index) => renderLine(line, index))}
            </div>
          </ScrollArea>
        </div>
        
        {/* Page number footer */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2">
          <span className="text-sm font-bold text-amber-600 dark:text-amber-400 font-arabic">
            {page.page}
          </span>
        </div>
      </div>
    </div>
  );
}

interface MushafPageSkeletonProps {
  pageNumber: number;
}

export function MushafPageSkeleton({ pageNumber }: MushafPageSkeletonProps) {
  return (
    <div className="min-h-full animate-pulse">
      <div className="text-center mb-6">
        <div className="inline-block px-4 py-2 rounded-full bg-amber-200 dark:bg-amber-800 h-8 w-24" />
      </div>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-6 md:p-10" style={{ minHeight: '500px' }}>
        <div className="space-y-4">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="h-10 bg-amber-100 dark:bg-amber-900/30 rounded" />
          ))}
        </div>
      </div>
    </div>
  );
}
