/**
 * Noor Connect — Quran Clip Studio Modal
 *
 * In-app Quran Ayah image card & recitation video (Reel / Story / Post) generator.
 * Styled purely with Noor Connect's active CSS theme tokens and 360px viewport safety.
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Video,
  Image as ImageIcon,
  Play,
  Pause,
  Minus,
  Plus,
  Share2,
  Download,
  RotateCcw,
  Search,
  Check,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  type AspectRatioType,
  type SceneId,
  type ClipAyahData,
  SCENE_DEFINITIONS,
  ASPECT_RATIO_PRESETS,
  stripTashkeel,
  ensureFontsReady,
  drawProceduralScene,
  prerenderAyahOffscreenCanvas,
  drawClipOverlay,
  renderAyahImageCard,
  renderRecitationVideoClip,
  exportAndShareClip,
} from '@/lib/quran-clip-renderer';
import { QURAN_RECITERS, getReciterById } from '@/lib/quran-reciters';
import { useTilawah } from '@/contexts/TilawahContext';
import { memoryPageCache } from '@/lib/interactive-mushaf';
import { resolveSceneJourney, stripLeadingBismillah } from '@/lib/ayah-meaning-scene-engine';

export interface QuranClipStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  surahNumber: number;
  surahNameArabic: string;
  surahNameEnglish: string;
  totalAyahsInSurah: number;
  fromAyah: number;
  toAyah: number;
  initialVerses?: Array<{ verse_number: number; text_uthmani: string }>;
}

export const QuranClipStudioModal: React.FC<QuranClipStudioModalProps> = ({
  isOpen,
  onClose,
  surahNumber,
  surahNameArabic,
  surahNameEnglish,
  totalAyahsInSurah,
  fromAyah: initialFromAyah,
  toAyah: initialToAyah,
  initialVerses,
}) => {
  const { reciter: currentGlobalReciter } = useTilawah();

  // Mode: Video Reel vs Ayah Image Card
  const [activeTab, setActiveTab] = useState<'video' | 'image'>('video');

  // Ayah Range (enforce fromAyah <= toAyah, max 10 ayahs)
  const [fromAyah, setFromAyah] = useState<number>(() =>
    Math.max(1, Math.min(totalAyahsInSurah, initialFromAyah || 1))
  );
  const [toAyah, setToAyah] = useState<number>(() => {
    const initTo = initialToAyah || initialFromAyah || 1;
    const boundedTo = Math.max(fromAyah, Math.min(totalAyahsInSurah, initTo));
    return Math.min(boundedTo, fromAyah + 9);
  });

  // Creator Controls
  const [aspectRatio, setAspectRatio] = useState<AspectRatioType>('9:16');
  const [sceneId, setSceneId] = useState<SceneId>('auto-meaning');
  const [withTashkeel, setWithTashkeel] = useState<boolean>(true);
  const [subtitleLang, setSubtitleLang] = useState<'none' | 'en' | 'ur' | 'hi' | 'gu'>('en');
  const [audioMastering, setAudioMastering] = useState<'haramain' | 'pure'>('haramain');

  // Reciter Selection
  const [selectedReciterId, setSelectedReciterId] = useState<string>(
    () => currentGlobalReciter?.id || 'ar.alafasy'
  );
  const [isQariPickerOpen, setIsQariPickerOpen] = useState(false);
  const [qariSearch, setQariSearch] = useState('');

  // Verses Data Cache
  const [versesData, setVersesData] = useState<Record<number, { textUthmani: string; translations: Record<string, string> }>>({});
  const versesDataRef = useRef(versesData);
  versesDataRef.current = versesData;
  const [isLoadingVerses, setIsLoadingVerses] = useState(false);

  // Generation & Engine State
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationPercent, setGenerationPercent] = useState(0);
  const [generationStatus, setGenerationStatus] = useState('');
  const abortControllerRef = useRef<AbortController | null>(null);

  // Generated Outputs
  const [videoResult, setVideoResult] = useState<{
    blob: Blob;
    url: string;
    mimeType: string;
    extension: string;
    duration: number;
  } | null>(null);

  const [imageResult, setImageResult] = useState<{
    blob: Blob;
    dataUrl: string;
  } | null>(null);

  // Live Canvas Preview
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(true);

  // Sync initial props on change
  useEffect(() => {
    const safeFrom = Math.max(1, Math.min(totalAyahsInSurah, initialFromAyah || 1));
    const safeTo = Math.max(safeFrom, Math.min(totalAyahsInSurah, Math.min(safeFrom + 9, initialToAyah || safeFrom)));
    setFromAyah(safeFrom);
    setToAyah(safeTo);
  }, [surahNumber, initialFromAyah, initialToAyah, totalAyahsInSurah]);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      if (videoResult?.url) {
        URL.revokeObjectURL(videoResult.url);
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [videoResult]);

  // Load Quran Verses & Translations for the selected range
  useEffect(() => {
    let cancelled = false;

    const loadRangeVerses = async () => {
      setIsLoadingVerses(true);
      const newCache: Record<number, { textUthmani: string; translations: Record<string, string> }> = {
        ...versesDataRef.current,
      };

      // 1. Seed from initialVerses prop if present
      if (initialVerses && Array.isArray(initialVerses)) {
        initialVerses.forEach((iv) => {
          if (!newCache[iv.verse_number]) {
            newCache[iv.verse_number] = { textUthmani: iv.text_uthmani, translations: {} };
          }
        });
      }

      // 2. Seed from interactive-mushaf in-memory cache
      try {
        for (const [, pageData] of memoryPageCache.entries()) {
          if (pageData && Array.isArray(pageData.verses)) {
            pageData.verses.forEach((v) => {
              if (v.surah_number === surahNumber && !newCache[v.verse_number]) {
                newCache[v.verse_number] = { textUthmani: v.text_uthmani, translations: {} };
              }
            });
          }
        }
      } catch {
        // Safe memory scan
      }

      // 3. For any missing verses in the range fromAyah..toAyah, fetch from storage / API
      for (let a = fromAyah; a <= toAyah; a++) {
        const cacheKey = `noor_clip_verse_${surahNumber}_${a}`;
        let uthmani = newCache[a]?.textUthmani || '';
        let transMap: Record<string, string> = { ...(newCache[a]?.translations || {}) };

        try {
          const stored = localStorage.getItem(cacheKey);
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed?.textUthmani) {
              uthmani = parsed.textUthmani;
              transMap = { ...(parsed.translations || {}), ...transMap };
            }
          }
        } catch {
          // Safe storage parse
        }

        // Check if full offline translation pack exists from AyahStudySheet
        if (subtitleLang !== 'none' && !transMap[subtitleLang]) {
          const offlinePackKey =
            subtitleLang === 'gu'
              ? `noor_offline_trans_gu.omari_${surahNumber}`
              : subtitleLang === 'hi'
              ? `noor_offline_trans_hi.hindi_${surahNumber}`
              : subtitleLang === 'ur'
              ? `noor_offline_trans_ur.jalandhry_${surahNumber}`
              : `noor_offline_trans_en.sahih_${surahNumber}`;
          try {
            const pack = localStorage.getItem(offlinePackKey);
            if (pack) {
              const packData = JSON.parse(pack);
              if (packData && packData[a]) {
                transMap[subtitleLang] = packData[a];
              }
            }
          } catch {
            // Safe offline pack parse
          }
        }

        // If we have both uthmani text and the required subtitle translation (or subtitles are none), we're done with this ayah!
        if (uthmani && (subtitleLang === 'none' || Boolean(transMap[subtitleLang]))) {
          newCache[a] = { textUthmani: uthmani, translations: transMap };
          continue;
        }

        // Fetch missing online
        try {
          const alquranUrl = `https://api.alquran.cloud/v1/ayah/${surahNumber}:${a}/editions/quran-uthmani,en.sahih,ur.jalandhry,hi.hindi`;
          const gujaratiUrl = `https://quranenc.com/api/v1/translation/aya/gujarati_omari/${surahNumber}/${a}`;

          const [alRes, guRes] = await Promise.allSettled([
            fetch(alquranUrl, { signal: AbortSignal.timeout(4000) }),
            fetch(gujaratiUrl, { signal: AbortSignal.timeout(4000) }),
          ]);

          if (alRes.status === 'fulfilled' && alRes.value.ok) {
            const data = await alRes.value.json();
            if (data?.data && Array.isArray(data.data)) {
              data.data.forEach((item: { edition?: { identifier?: string }; text?: string }) => {
                const id = item?.edition?.identifier;
                if (id === 'quran-uthmani' && item.text) uthmani = item.text;
                else if (id === 'en.sahih' && item.text) transMap.en = item.text;
                else if (id === 'ur.jalandhry' && item.text) transMap.ur = item.text;
                else if (id === 'hi.hindi' && item.text) transMap.hi = item.text;
              });
            }
          }

          if (guRes.status === 'fulfilled' && guRes.value.ok) {
            try {
              const guData = await guRes.value.json();
              const rawGu = guData?.result?.translation || '';
              const cleanGu = rawGu.replace(/^[૦-૯0-9]+\.\s*/, '').trim();
              if (cleanGu) transMap.gu = cleanGu;
            } catch {
              // Handled gujarati parse
            }
          }

          // Gujarati CDN fallback if QuranEnc fails
          if (subtitleLang === 'gu' && !transMap.gu) {
            try {
              const cdnRes = await fetch(
                `https://cdn.jsdelivr.net/gh/fawazahmed0/quran-api@1/editions/guj-rabila/chapters/${surahNumber}.json`,
                { signal: AbortSignal.timeout(3000) }
              );
              if (cdnRes.ok) {
                const cdnData = await cdnRes.json();
                const v = cdnData?.chapter?.find((item: { verse: number; text: string }) => item.verse === a);
                if (v?.text) {
                  transMap.gu = v.text.replace(/^[૦-૯0-9]+\.\s*/, '').trim();
                }
              }
            } catch {
              // Safe CDN catch
            }
          }

          // Hindi CDN fallback if AlQuran fails
          if (subtitleLang === 'hi' && !transMap.hi) {
            try {
              const cdnRes = await fetch(
                `https://cdn.jsdelivr.net/gh/fawazahmed0/quran-api@1/editions/hin-muhammadfarooqk/${surahNumber}/${a}.json`,
                { signal: AbortSignal.timeout(3000) }
              );
              if (cdnRes.ok) {
                const cdnData = await cdnRes.json();
                if (cdnData?.text) {
                  transMap.hi = cdnData.text.trim();
                }
              }
            } catch {
              // Safe CDN catch
            }
          }

          if (!uthmani) {
            uthmani = `سورة ${surahNameArabic} - آية ${a}`;
          }

          const record = { textUthmani: uthmani, translations: transMap };
          newCache[a] = record;

          try {
            localStorage.setItem(cacheKey, JSON.stringify(record));
          } catch {
            // Safe localStorage save
          }
        } catch (fetchErr) {
          console.warn(`[QuranClipStudio] Fetch notice for ${surahNumber}:${a}`, fetchErr);
          if (!newCache[a]) {
            newCache[a] = {
              textUthmani: uthmani || `سورة ${surahNameArabic} - آية ${a}`,
              translations: transMap,
            };
          }
        }
      }

      if (!cancelled) {
        setVersesData(newCache);
        setIsLoadingVerses(false);
      }
    };

    loadRangeVerses();
    return () => {
      cancelled = true;
    };
  }, [surahNumber, fromAyah, toAyah, subtitleLang, surahNameArabic, surahNameEnglish, initialVerses]);

  // Prepared Ayahs list for rendering
  const selectedAyahsList: ClipAyahData[] = useMemo(() => {
    const list: ClipAyahData[] = [];
    for (let a = fromAyah; a <= toAyah; a++) {
      const data = versesData[a];
      const rawText = data?.textUthmani || '';
      const text = stripLeadingBismillah(rawText, surahNumber, a);
      const translation = subtitleLang !== 'none' ? data?.translations?.[subtitleLang] : undefined;
      list.push({
        ayahNumber: a,
        textUthmani: text,
        translation,
        surahNumber,
      });
    }
    return list;
  }, [fromAyah, toAyah, versesData, subtitleLang, surahNumber]);

  // Stepper Handlers (enforce fromAyah <= toAyah, max 10 ayahs)
  const handleFromAyahChange = (val: number) => {
    const clamped = Math.max(1, Math.min(totalAyahsInSurah, val));
    setFromAyah(clamped);
    if (clamped > toAyah) {
      setToAyah(clamped);
    } else if (toAyah - clamped + 1 > 10) {
      setToAyah(clamped + 9);
    }
  };

  const handleToAyahChange = (val: number) => {
    const clamped = Math.max(fromAyah, Math.min(totalAyahsInSurah, val));
    if (clamped - fromAyah + 1 > 10) {
      setToAyah(fromAyah + 9);
    } else {
      setToAyah(clamped);
    }
  };

  // 1-Tap Smart Range (selects ~15–28s thematic clip of 3–5 verses)
  const handleSmartRange = useCallback(() => {
    const idealAyahCount = 4;
    const targetTo = Math.min(totalAyahsInSurah, Math.min(fromAyah + 9, fromAyah + idealAyahCount - 1));
    handleToAyahChange(targetTo);
    toast.success(`✨ Smart Range: Ayahs ${fromAyah}–${targetTo} selected (~20s reel)`);
  }, [fromAyah, totalAyahsInSurah, handleToAyahChange]);

  // Opening Arabic Snippets for Stepper Previews
  const fromSnippet = useMemo(() => {
    const raw = versesData[fromAyah]?.textUthmani;
    if (!raw) return 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ...';
    const clean = stripLeadingBismillah(raw, surahNumber, fromAyah);
    return (withTashkeel ? clean : stripTashkeel(clean)).slice(0, 42) + '...';
  }, [versesData, fromAyah, withTashkeel, surahNumber]);

  const toSnippet = useMemo(() => {
    const raw = versesData[toAyah]?.textUthmani;
    if (!raw) return '...';
    const clean = stripLeadingBismillah(raw, surahNumber, toAyah);
    return (withTashkeel ? clean : stripTashkeel(clean)).slice(0, 42) + '...';
  }, [versesData, toAyah, withTashkeel, surahNumber]);

  // Active Reciter Info
  const activeReciter = useMemo(() => {
    return getReciterById(selectedReciterId);
  }, [selectedReciterId]);

  // Filtered Reciters for Searchable Picker
  const filteredReciters = useMemo(() => {
    if (!qariSearch.trim()) return QURAN_RECITERS;
    const q = qariSearch.toLowerCase().trim();
    return QURAN_RECITERS.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.arabicName.includes(q) ||
        r.shortName.toLowerCase().includes(q)
    );
  }, [qariSearch]);

  // Semantic Ayah-Meaning Scene Journey
  const sceneJourney = useMemo(() => {
    return resolveSceneJourney(selectedAyahsList, surahNumber);
  }, [selectedAyahsList, surahNumber]);

  // Live Canvas Preview Animation Loop (with 700ms Scene Cross-Fade & Ayah Cycling)
  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Load fonts first
    ensureFontsReady();

    const dims = ASPECT_RATIO_PRESETS[aspectRatio].video;
    canvas.width = dims.width;
    canvas.height = dims.height;

    const startTime = performance.now();
    let isRunning = true;

    // Pre-render offscreen text canvases for each ayah & sub-segment in the selected range
    const targetAyahs =
      selectedAyahsList.length > 0
        ? selectedAyahsList
        : [
            {
              ayahNumber: fromAyah,
              textUthmani: versesData[fromAyah]?.textUthmani || 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
              translation:
                subtitleLang !== 'none' ? versesData[fromAyah]?.translations?.[subtitleLang] : undefined,
              surahNumber,
            },
          ];

    const offscreens: HTMLCanvasElement[] = [];
    const segmentOffscreens = new Map<string, HTMLCanvasElement>();

    targetAyahs.forEach((ayah, aIdx) => {
      const baseOff = prerenderAyahOffscreenCanvas({
        width: dims.width,
        height: dims.height,
        ayah,
        surahNameArabic,
        surahNameEnglish,
        withTashkeel,
        subtitleLang,
      });
      offscreens.push(baseOff);

      const journey = sceneJourney[aIdx];
      const subs = journey?.subTimeline || [];
      subs.forEach((sub, sIdx) => {
        const segOff = prerenderAyahOffscreenCanvas({
          width: dims.width,
          height: dims.height,
          ayah,
          surahNameArabic,
          surahNameEnglish,
          withTashkeel,
          subtitleLang,
          clauseArabic: sub.arabicClause,
          clauseTranslation: sub.translationClause,
        });
        segmentOffscreens.set(`${ayah.ayahNumber}_${sIdx}`, segOff);
      });
    });

    const loop = (now: number) => {
      if (!isRunning) return;

      const elapsedSec = isPreviewPlaying ? (now - startTime) / 1000 : 0;

      if (sceneId === 'auto-meaning' && targetAyahs.length > 0) {
        // Dynamic Semantic Scene Journey with Ken Burns Push & 500ms Cross-Fade per segment/ayah
        const ayahDuration = 5.0; // 5.0 seconds preview cycle per ayah
        const totalDuration = targetAyahs.length * ayahDuration;
        const loopTime = elapsedSec % totalDuration;
        const activeIdx = Math.min(targetAyahs.length - 1, Math.floor(loopTime / ayahDuration));
        const timeInAyah = loopTime % ayahDuration;
        const ayahRatio = timeInAyah / ayahDuration;

        const currJourney = sceneJourney[activeIdx];
        const subTimeline =
          currJourney?.subTimeline && currJourney.subTimeline.length > 1
            ? currJourney.subTimeline
            : null;

        let activeSceneId: SceneId = currJourney?.sceneId || 'kiswah-gold';
        let prevSceneId: SceneId = activeSceneId;
        let segmentFade = 1.0;
        let zoomScale = 1.0 + 0.08 * ayahRatio;
        let currentSegIdx = -1;

        if (subTimeline) {
          const segIdx = subTimeline.findIndex(
            (s) => ayahRatio >= s.startRatio && ayahRatio < s.endRatio
          );
          currentSegIdx = segIdx >= 0 ? segIdx : subTimeline.length - 1;
          const currentSeg = subTimeline[currentSegIdx];
          activeSceneId = currentSeg.sceneId;

          const segDuration = Math.max(0.01, currentSeg.endRatio - currentSeg.startRatio);
          const timeInSegRatio = Math.min(1.0, Math.max(0.0, (ayahRatio - currentSeg.startRatio) / segDuration));
          zoomScale = 1.0 + 0.08 * timeInSegRatio;

          const segElapsedSec = timeInSegRatio * (segDuration * ayahDuration);
          if (currentSegIdx > 0 && segElapsedSec < 0.5) {
            prevSceneId = subTimeline[currentSegIdx - 1].sceneId;
            const norm = segElapsedSec / 0.5;
            segmentFade = norm * norm * (3 - 2 * norm);
          } else if (currentSegIdx === 0 && timeInAyah < 0.5 && targetAyahs.length > 1) {
            const prevIdx = (activeIdx - 1 + targetAyahs.length) % targetAyahs.length;
            const prevJ = sceneJourney[prevIdx];
            const prevSub = prevJ?.subTimeline;
            prevSceneId =
              prevSub && prevSub.length > 0
                ? prevSub[prevSub.length - 1].sceneId
                : prevJ?.sceneId || 'kiswah-gold';
            const norm = timeInAyah / 0.5;
            segmentFade = norm * norm * (3 - 2 * norm);
          }
        } else {
          if (timeInAyah < 0.5 && targetAyahs.length > 1) {
            const prevIdx = (activeIdx - 1 + targetAyahs.length) % targetAyahs.length;
            const prevJ = sceneJourney[prevIdx];
            const prevSub = prevJ?.subTimeline;
            prevSceneId =
              prevSub && prevSub.length > 0
                ? prevSub[prevSub.length - 1].sceneId
                : prevJ?.sceneId || 'kiswah-gold';
            const norm = timeInAyah / 0.5;
            segmentFade = norm * norm * (3 - 2 * norm);
          }
        }

        if (segmentFade < 1.0 && prevSceneId !== activeSceneId) {
          drawProceduralScene(ctx, prevSceneId, dims.width, dims.height, elapsedSec, zoomScale);
          ctx.save();
          ctx.globalAlpha = segmentFade;
          drawProceduralScene(ctx, activeSceneId, dims.width, dims.height, elapsedSec, zoomScale);
          ctx.restore();
        } else {
          drawProceduralScene(ctx, activeSceneId, dims.width, dims.height, elapsedSec, zoomScale);
        }

        // 0.25s Calligraphy text fade-in & active clause rendering
        const textAlpha = Math.min(1.0, timeInAyah / 0.25);
        ctx.save();
        ctx.globalAlpha = textAlpha;
        const activeSegBmp =
          (subTimeline && currentSegIdx >= 0
            ? segmentOffscreens.get(`${targetAyahs[activeIdx]?.ayahNumber}_${currentSegIdx}`)
            : null) || offscreens[activeIdx];
        if (activeSegBmp) {
          ctx.drawImage(activeSegBmp, 0, 0);
        }
        ctx.restore();

        // Overlay watermark & timeline progress
        const simulatedProgress = loopTime / totalDuration;
        drawClipOverlay(ctx, dims.width, dims.height, activeTab === 'video' ? simulatedProgress : 1.0);
      } else {
        // Single static scene with subtle Ken Burns push
        const ayahDuration = 15.0;
        const ayahRatio = (elapsedSec % ayahDuration) / ayahDuration;
        const zoomScale = 1.0 + 0.06 * ayahRatio;
        drawProceduralScene(ctx, sceneId, dims.width, dims.height, elapsedSec, zoomScale);
        if (offscreens[0]) {
          ctx.drawImage(offscreens[0], 0, 0);
        }
        const simulatedProgress = ayahRatio;
        drawClipOverlay(ctx, dims.width, dims.height, activeTab === 'video' ? simulatedProgress : 1.0);
      }

      if (isPreviewPlaying) {
        animFrameRef.current = requestAnimationFrame(loop);
      }
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      isRunning = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [
    aspectRatio,
    sceneId,
    withTashkeel,
    subtitleLang,
    surahNumber,
    fromAyah,
    toAyah,
    surahNameArabic,
    surahNameEnglish,
    selectedAyahsList,
    sceneJourney,
    versesData,
    isPreviewPlaying,
    activeTab,
  ]);

  // Video Generation Trigger
  const handleGenerateVideo = async () => {
    if (isGenerating) return;

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsGenerating(true);
    setGenerationPercent(5);
    setGenerationStatus('Preparing Recitation Video Engine...');

    try {
      const result = await renderRecitationVideoClip({
        surahNumber,
        surahNameArabic,
        surahNameEnglish,
        ayahs: selectedAyahsList,
        reciterId: selectedReciterId,
        aspectRatio,
        sceneId,
        withTashkeel,
        subtitleLang,
        audioMastering,
        signal: controller.signal,
        onProgress: (info) => {
          setGenerationPercent(info.percent);
          setGenerationStatus(info.statusText);
        },
      });

      const videoUrl = URL.createObjectURL(result.blob);
      setVideoResult({
        blob: result.blob,
        url: videoUrl,
        mimeType: result.mimeType,
        extension: result.extension,
        duration: result.duration,
      });

      toast.success('Quran Recitation Reel generated successfully!');
    } catch (err: any) {
      if ((err instanceof DOMException && err.name === 'AbortError') || err?.name === 'AbortError') {
        toast.info('Video generation cancelled.');
      } else {
        console.warn('[QuranClipStudio] Video generation notice:', err);
        const msg = err instanceof Error ? err.message : 'Unknown generation failure';
        toast.error(`Video generation failed: ${msg}`);
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  // Image Generation Trigger
  const handleGenerateImage = async () => {
    setIsGenerating(true);
    setGenerationPercent(20);
    setGenerationStatus('Rendering High-Res Ayah Card (1080p)...');

    try {
      const targetAyah = selectedAyahsList[0] || {
        ayahNumber: fromAyah,
        textUthmani: versesData[fromAyah]?.textUthmani || '',
        translation: subtitleLang !== 'none' ? versesData[fromAyah]?.translations?.[subtitleLang] : undefined,
        surahNumber,
      };

      const result = await renderAyahImageCard({
        surahNumber,
        surahNameArabic,
        surahNameEnglish,
        ayah: targetAyah,
        aspectRatio,
        sceneId,
        withTashkeel,
        subtitleLang,
      });

      setImageResult({
        blob: result.blob,
        dataUrl: result.dataUrl,
      });

      toast.success('Ayah Image Card rendered in 1080p!');
    } catch (err) {
      console.error('[QuranClipStudio] Image render error:', err);
      toast.error('Failed to generate Ayah image card.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Instant Cancel Handler (< 16ms responsive)
  const handleCancelGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);
    setGenerationPercent(0);
    setGenerationStatus('');
  };

  // Share & Export Handlers with Auto-Attached Viral Social Caption
  const handleShareVideo = async () => {
    if (!videoResult) return;
    const filename = `noor-clip-s${surahNumber}-a${fromAyah}-${toAyah}${videoResult.extension}`;
    const cleanSurahName = surahNameEnglish.replace(/[^a-zA-Z0-9]/g, '');
    const firstTranslation = selectedAyahsList[0]?.translation ? `"${selectedAyahsList[0].translation}"\n\n` : '';
    const cite = fromAyah === toAyah ? `${fromAyah}` : `${fromAyah}–${toAyah}`;

    const viralCaption =
`﷽
${firstTranslation}📖 Surah ${surahNameEnglish} [${surahNumber}:${cite}]
🎙️ Reciter: ${activeReciter.name}
✨ Created with Noor Connect

#Quran #QuranRecitation #Surah${cleanSurahName} #NoorConnect #AyahOfTheDay #IslamicReels #Dhikr #Islam`;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(viralCaption);
        toast.success('📋 Reel caption & hashtags copied!');
      }
    } catch (_clipErr) {
      // Clipboard handled safely
    }

    await exportAndShareClip({
      blob: videoResult.blob,
      filename,
      title: `Surah ${surahNameEnglish} [${surahNumber}:${fromAyah}-${toAyah}]`,
      text: viralCaption,
      onToast: (m) => toast.info(m),
    });
  };

  const handleShareImage = async () => {
    if (!imageResult) {
      await handleGenerateImage();
    }
    const filename = `noor-ayah-s${surahNumber}-a${fromAyah}.png`;
    const targetBlob = imageResult?.blob;
    if (!targetBlob) return;

    const cleanSurahName = surahNameEnglish.replace(/[^a-zA-Z0-9]/g, '');
    const firstTranslation = selectedAyahsList[0]?.translation ? `"${selectedAyahsList[0].translation}"\n\n` : '';

    const viralCaption =
`﷽
${firstTranslation}📖 Surah ${surahNameEnglish} [${surahNumber}:${fromAyah}]
✨ Created with Noor Connect

#Quran #AyahOfTheDay #Surah${cleanSurahName} #NoorConnect #IslamicQuotes #Dhikr #Islam`;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(viralCaption);
        toast.success('📋 Ayah caption & hashtags copied!');
      }
    } catch (_clipErr) {
      // Clipboard handled safely
    }

    await exportAndShareClip({
      blob: targetBlob,
      filename,
      title: `Surah ${surahNameEnglish} [${surahNumber}:${fromAyah}]`,
      text: viralCaption,
      onToast: (m) => toast.info(m),
    });
  };

  const handleDownloadVideo = () => {
    if (!videoResult) return;
    const filename = `noor-clip-s${surahNumber}-a${fromAyah}-${toAyah}${videoResult.extension}`;
    const a = document.createElement('a');
    a.href = videoResult.url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success('Downloading Quran Reel...');
  };

  const handleDownloadImage = async () => {
    let currentBlob = imageResult?.blob;
    if (!currentBlob) {
      setIsGenerating(true);
      try {
        const targetAyah = selectedAyahsList[0] || {
          ayahNumber: fromAyah,
          textUthmani: versesData[fromAyah]?.textUthmani || '',
          translation: subtitleLang !== 'none' ? versesData[fromAyah]?.translations?.[subtitleLang] : undefined,
          surahNumber,
        };
        const rendered = await renderAyahImageCard({
          surahNumber,
          surahNameArabic,
          surahNameEnglish,
          ayah: targetAyah,
          aspectRatio,
          sceneId,
          withTashkeel,
          subtitleLang,
        });
        currentBlob = rendered.blob;
        setImageResult({ blob: rendered.blob, dataUrl: rendered.dataUrl });
      } catch (renderErr) {
        console.warn('[QuranClipStudio] Image render notice:', renderErr);
        toast.error('Could not render image');
        return;
      } finally {
        setIsGenerating(false);
      }
    }

    if (!currentBlob) return;
    const filename = `noor-ayah-s${surahNumber}-a${fromAyah}.png`;
    const url = URL.createObjectURL(currentBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    toast.success('Downloading 1080p Ayah Image...');
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 select-none animate-in fade-in duration-200"
      style={{ background: 'rgba(2, 4, 10, 0.86)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isGenerating) onClose();
      }}
    >
      <div
        className="w-full max-w-lg max-h-[92vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden"
        style={{
          background: 'var(--surface)',
          borderColor: 'var(--border)',
          boxShadow: '0 20px 50px rgba(0,0,0,0.6), inset 0 1px 0 var(--card-sheen-line, var(--card-sheen))',
        }}
      >
        {/* HEADER */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] shrink-0 bg-[var(--surface)]">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
              style={{ background: 'var(--accent-soft)', color: 'var(--accent-text)' }}
            >
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-[var(--text-primary)] truncate">
                Noor Clip Studio
              </h2>
              <p className="text-[11px] text-[var(--text-secondary)] truncate">
                Surah {surahNameEnglish} • <span dir="rtl" className="font-arabic">{surahNameArabic}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isGenerating}
            className="w-8 h-8 rounded-full flex items-center justify-center border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)] transition-colors disabled:opacity-40"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* SCROLLABLE BODY */}
        <div className="overflow-y-auto flex-1 p-3 sm:p-4 space-y-4">
          {/* 1. MODE SWITCHER TABS (TOP ROW) */}
          <div className="grid grid-cols-2 p-1 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('video')}
              disabled={isGenerating}
              className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'video'
                  ? 'bg-[var(--accent)] text-[var(--on-accent)] shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Video className="w-3.5 h-3.5" />
              <span>🎥 Recitation Video</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('image')}
              disabled={isGenerating}
              className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'image'
                  ? 'bg-[var(--accent)] text-[var(--on-accent)] shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>🖼️ Ayah Image Card</span>
            </button>
          </div>

          {/* 2. LIVE PREVIEW CANVAS */}
          <div className="relative rounded-2xl border border-[var(--border)] overflow-hidden bg-black flex items-center justify-center">
            {videoResult && activeTab === 'video' ? (
              <video
                src={videoResult.url}
                controls
                autoPlay
                loop
                playsInline
                className="w-full max-h-[220px] object-contain mx-auto bg-black"
              />
            ) : (
              <div
                className={`w-full flex items-center justify-center max-h-[220px] ${
                  aspectRatio === '9:16'
                    ? 'aspect-[9/16]'
                    : aspectRatio === '1:1'
                    ? 'aspect-square'
                    : 'aspect-[16/9]'
                }`}
              >
                <canvas
                  ref={previewCanvasRef}
                  className="w-full h-full object-contain max-h-[220px]"
                />
              </div>
            )}

            {/* Play/Pause toggle for animated preview */}
            {!videoResult && activeTab === 'video' && (
              <button
                type="button"
                onClick={() => setIsPreviewPlaying((p) => !p)}
                className="absolute bottom-2 right-2 p-1.5 rounded-xl bg-black/60 border border-white/20 text-white/90 hover:text-white transition-all text-xs flex items-center gap-1"
                title={isPreviewPlaying ? 'Pause Live Preview' : 'Play Live Preview'}
              >
                {isPreviewPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              </button>
            )}

            {/* Loading Verses Badge */}
            {isLoadingVerses && (
              <div className="absolute top-2 left-2 px-2 py-0.5 rounded-lg bg-black/70 border border-white/20 text-[10px] text-[var(--accent-text)] animate-pulse">
                Loading verses...
              </div>
            )}
          </div>

          {/* 3. AYAH RANGE SELECTOR WITH LIVE ARABIC SNIPPET PREVIEW */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs gap-1">
              <span className="font-semibold text-[var(--text-secondary)]">Ayah Selection Range:</span>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={handleSmartRange}
                  className="px-2 py-0.5 rounded-lg border border-[var(--accent)]/40 bg-[var(--accent)]/10 text-[var(--accent-text)] text-[10px] font-bold hover:bg-[var(--accent)]/20 active:scale-95 transition-all flex items-center gap-1"
                  title="Auto-select a 15–30s thematic clip range"
                >
                  <Sparkles className="w-3 h-3 text-[var(--accent)]" />
                  <span>✨ Smart Range</span>
                </button>
                <span className="text-[11px] text-[var(--accent-text)] font-mono">
                  {toAyah - fromAyah + 1} {toAyah - fromAyah + 1 === 1 ? 'Ayah' : 'Ayahs'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {/* From Ayah */}
              <div className="p-2.5 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] flex flex-col gap-1 min-w-0">
                <div className="text-[10px] font-bold tracking-wider text-[var(--text-secondary)] uppercase text-center">
                  FROM AYAH
                </div>
                <div className="flex items-center justify-center gap-2 py-0.5">
                  <button
                    type="button"
                    disabled={isGenerating || fromAyah <= 1}
                    onClick={() => handleFromAyahChange(fromAyah - 1)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)] hover:border-[var(--accent)] disabled:opacity-30 active:scale-95"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-sm font-bold text-[var(--text-primary)] min-w-[28px] text-center font-mono">
                    {fromAyah}
                  </span>
                  <button
                    type="button"
                    disabled={isGenerating || fromAyah >= toAyah}
                    onClick={() => handleFromAyahChange(fromAyah + 1)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)] hover:border-[var(--accent)] disabled:opacity-30 active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* 1-Line RTL Arabic opening snippet preview */}
                <div
                  style={{
                    fontSize: '0.72rem',
                    direction: 'rtl',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    color: 'var(--accent-text)',
                  }}
                  className="font-arabic pt-0.5 text-center"
                >
                  {fromSnippet}
                </div>
              </div>

              {/* To Ayah */}
              <div className="p-2.5 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] flex flex-col gap-1 min-w-0">
                <div className="text-[10px] font-bold tracking-wider text-[var(--text-secondary)] uppercase text-center">
                  TO AYAH
                </div>
                <div className="flex items-center justify-center gap-2 py-0.5">
                  <button
                    type="button"
                    disabled={isGenerating || toAyah <= fromAyah}
                    onClick={() => handleToAyahChange(toAyah - 1)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)] hover:border-[var(--accent)] disabled:opacity-30 active:scale-95"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-sm font-bold text-[var(--text-primary)] min-w-[28px] text-center font-mono">
                    {toAyah}
                  </span>
                  <button
                    type="button"
                    disabled={isGenerating || toAyah >= Math.min(totalAyahsInSurah, fromAyah + 9)}
                    onClick={() => handleToAyahChange(toAyah + 1)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)] hover:border-[var(--accent)] disabled:opacity-30 active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* 1-Line RTL Arabic opening snippet preview */}
                <div
                  style={{
                    fontSize: '0.72rem',
                    direction: 'rtl',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    color: 'var(--accent-text)',
                  }}
                  className="font-arabic pt-0.5 text-center"
                >
                  {toSnippet}
                </div>
              </div>
            </div>
          </div>

          {/* 4. TASHKEEL & SUBTITLE CONTROLS */}
          <div className="space-y-2.5 pt-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[var(--text-secondary)]">Arabic Tashkeel:</span>
              <div className="inline-flex rounded-xl p-0.5 border border-[var(--border)] bg-[var(--surface-2)]">
                <button
                  type="button"
                  onClick={() => setWithTashkeel(true)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                    withTashkeel
                      ? 'bg-[var(--accent)] text-[var(--on-accent)] shadow-sm'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  With Tashkeel (بالتشكيل)
                </button>
                <button
                  type="button"
                  onClick={() => setWithTashkeel(false)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                    !withTashkeel
                      ? 'bg-[var(--accent)] text-[var(--on-accent)] shadow-sm'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Without Tashkeel (بدون تشكيل)
                </button>
              </div>
            </div>

            {/* Subtitle Selector */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[var(--text-secondary)]">Subtitles:</span>
                {isLoadingVerses && subtitleLang !== 'none' && !versesData[fromAyah]?.translations?.[subtitleLang] && (
                  <span className="text-[10px] text-[var(--accent-text)] animate-pulse">
                    Loading {subtitleLang === 'gu' ? 'Gujarati' : subtitleLang === 'hi' ? 'Hindi' : subtitleLang === 'ur' ? 'Urdu' : 'English'}...
                  </span>
                )}
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {(
                  [
                    { id: 'none', label: 'Arabic' },
                    { id: 'en', label: 'English' },
                    { id: 'ur', label: 'Urdu' },
                    { id: 'hi', label: 'Hindi' },
                    { id: 'gu', label: 'Gujarati' },
                  ] as const
                ).map((sub) => (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => setSubtitleLang(sub.id)}
                    className={`rounded-xl font-bold text-center border transition-all ${
                      subtitleLang === sub.id
                        ? 'bg-[var(--accent)] border-[var(--accent)] text-[var(--on-accent)] shadow-sm'
                        : 'bg-[var(--surface-2)] border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                    style={{ fontSize: '0.68rem', padding: '5px 4px', whiteSpace: 'nowrap' }}
                  >
                    {sub.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 5. SEARCHABLE QARI / RECITER PICKER (VIDEO MODE ONLY) */}
          {activeTab === 'video' && (
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[var(--text-secondary)]">Reciter / Qari:</span>
                <span className="text-[11px] text-[var(--accent-text)] font-semibold truncate max-w-[180px]">
                  {activeReciter.shortName} ({activeReciter.style})
                </span>
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsQariPickerOpen((prev) => !prev)}
                  className="w-full py-2 px-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] text-left flex items-center justify-between text-xs font-semibold hover:border-[var(--accent)] transition-all"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base">🎙️</span>
                    <span className="text-[var(--text-primary)] truncate font-bold">{activeReciter.name}</span>
                    <span className="text-[10px] text-[var(--text-secondary)] truncate">
                      • {activeReciter.style}
                    </span>
                  </div>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-[var(--text-secondary)] transition-transform ${
                      isQariPickerOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {/* Popover Reciter List */}
                {isQariPickerOpen && (
                  <div
                    className="absolute z-50 left-0 right-0 mt-1 p-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl space-y-2 max-h-56 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
                    style={{
                      boxShadow: '0 12px 30px rgba(0,0,0,0.5)',
                    }}
                  >
                    <div className="relative shrink-0">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[var(--text-secondary)]" />
                      <input
                        type="text"
                        value={qariSearch}
                        onChange={(e) => setQariSearch(e.target.value)}
                        placeholder="Search 45+ Reciters..."
                        className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)]"
                      />
                    </div>

                    <div className="overflow-y-auto flex-1 space-y-1 pr-1">
                      {filteredReciters.map((r) => {
                        const isSel = r.id === selectedReciterId;
                        return (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => {
                              setSelectedReciterId(r.id);
                              setIsQariPickerOpen(false);
                            }}
                            className={`w-full p-2 rounded-xl text-left flex items-center justify-between text-xs transition-colors ${
                              isSel
                                ? 'bg-[var(--accent-soft)] text-[var(--accent-text)] font-bold'
                                : 'hover:bg-[var(--surface-2)] text-[var(--text-primary)]'
                            }`}
                          >
                            <div className="min-w-0 pr-2">
                              <p className="truncate">{r.name}</p>
                              <p className="text-[10px] text-[var(--text-secondary)] truncate font-arabic" dir="rtl">
                                {r.arabicName}
                              </p>
                            </div>
                            {isSel && <Check className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Audio Mastering Selector (Video Mode Only) */}
              <div className="flex items-center justify-between text-xs pt-1.5">
                <span className="font-semibold text-[var(--text-secondary)]">Audio Mastering:</span>
                <div className="inline-flex rounded-xl p-0.5 border border-[var(--border)] bg-[var(--surface-2)]">
                  <button
                    type="button"
                    onClick={() => setAudioMastering('haramain')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                      audioMastering === 'haramain'
                        ? 'bg-[var(--accent)] text-[var(--on-accent)] shadow-sm'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    🎙️ Haramain Reverb (Auto)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAudioMastering('pure')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                      audioMastering === 'pure'
                        ? 'bg-[var(--accent)] text-[var(--on-accent)] shadow-sm'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    🎙️ Pure Studio
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 6. 3 ASPECT RATIO PRESETS */}
          <div className="space-y-1.5 pt-1">
            <span className="text-xs font-semibold text-[var(--text-secondary)]">Aspect Ratio:</span>
            <div className="grid grid-cols-3 gap-2">
              {(['9:16', '1:1', '16:9'] as const).map((ratio) => {
                const isSel = aspectRatio === ratio;
                return (
                  <button
                    key={ratio}
                    type="button"
                    onClick={() => {
                      setAspectRatio(ratio);
                      setVideoResult(null);
                    }}
                    className={`py-2 px-1.5 rounded-2xl text-xs font-bold border transition-all text-center truncate ${
                      isSel
                        ? 'bg-[var(--accent)] border-[var(--accent)] text-[var(--on-accent)] shadow-sm'
                        : 'bg-[var(--surface-2)] border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {ASPECT_RATIO_PRESETS[ratio].label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 7. 12 BUILT-IN PROCEDURAL LUXURY & NATURE CANVAS SCENES */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[var(--text-secondary)]">
                Procedural Canvas Theme:
              </span>
              <span className="text-[11px] text-[var(--accent-text)] font-semibold truncate">
                {sceneId === 'auto-meaning'
                  ? 'Auto Meaning Sync'
                  : SCENE_DEFINITIONS.find((s) => s.id === sceneId)?.name}
              </span>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none">
              {SCENE_DEFINITIONS.map((scene) => {
                const isSel = scene.id === sceneId;
                return (
                  <button
                    key={scene.id}
                    type="button"
                    onClick={() => {
                      setSceneId(scene.id);
                      setVideoResult(null);
                    }}
                    className={`p-1 rounded-2xl border transition-all shrink-0 flex flex-col items-center gap-1 ${
                      isSel
                        ? 'border-[var(--accent)] shadow-md ring-1 ring-[var(--accent)] bg-[var(--surface-2)]'
                        : 'border-[var(--border)] hover:border-[var(--accent)]/50 bg-[var(--surface)]'
                    }`}
                    style={{ width: '86px', minWidth: '86px', flexShrink: 0 }}
                  >
                    <div
                      className="w-16 h-12 rounded-xl flex items-center justify-center text-lg shadow-inner relative overflow-hidden"
                      style={{ background: scene.previewGradient }}
                    >
                      <span>{scene.icon}</span>
                      {isSel && (
                        <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[var(--accent)] text-[var(--on-accent)] flex items-center justify-center text-[10px]">
                          <Check className="w-2.5 h-2.5" />
                        </div>
                      )}
                    </div>
                    <span
                      className="font-bold text-[var(--text-primary)] text-center"
                      style={{ fontSize: '0.62rem', whiteSpace: 'nowrap', overflow: 'visible' }}
                    >
                      {scene.name}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Dynamic Auto Scene Journey Ribbon */}
            {sceneId === 'auto-meaning' && (
              <div className="p-2.5 rounded-2xl border border-[var(--accent)]/30 bg-[var(--surface-2)] space-y-1.5 animate-in fade-in duration-200">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-[var(--accent-text)] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[var(--accent-text)]" />
                    Auto Scene Journey ({sceneJourney.length} {sceneJourney.length === 1 ? 'Ayah' : 'Ayahs'}):
                  </span>
                  <span className="text-[10px] text-[var(--text-secondary)] font-medium">
                    500ms dynamic cross-fade
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 py-0.5">
                  {sceneJourney.map((step, idx) => {
                    const hasSubTimeline = step.subTimeline && step.subTimeline.length > 1;
                    return (
                      <React.Fragment key={step.ayahNumber}>
                        <div
                          style={{
                            whiteSpace: 'nowrap',
                            flexShrink: 0,
                            maxWidth: 'none',
                            padding: '4px 10px',
                            fontSize: '0.68rem',
                          }}
                          className="flex items-center gap-1.5 rounded-xl bg-[var(--surface)] border border-[var(--border)]"
                        >
                          <span className="font-bold text-[var(--text-primary)]">Ayah {step.ayahNumber}:</span>
                          {hasSubTimeline ? (
                            <div className="inline-flex items-center gap-1">
                              {step.subTimeline!.map((sub, sIdx) => (
                                <React.Fragment key={sIdx}>
                                  <span className="text-[var(--accent-text)] font-semibold">
                                    {sub.icon} {sub.label}
                                  </span>
                                  {sIdx < step.subTimeline!.length - 1 && (
                                    <span className="text-[var(--text-secondary)] text-[10px] shrink-0 font-bold">→</span>
                                  )}
                                </React.Fragment>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[var(--accent-text)] font-semibold">{step.icon} {step.moodLabel}</span>
                          )}
                        </div>
                        {idx < sceneJourney.length - 1 && (
                          <span className="text-[var(--text-secondary)] text-[11px] shrink-0 font-bold">→</span>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 8. GENERATION PROGRESS BAR */}
          {isGenerating && (
            <div className="p-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] space-y-2 animate-in fade-in duration-150">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[var(--accent-text)]">{generationStatus}</span>
                <span className="font-mono text-xs font-bold text-[var(--text-primary)]">
                  {generationPercent}%
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-[var(--surface)] overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[var(--accent)] to-amber-300 transition-all duration-200"
                  style={{ width: `${generationPercent}%` }}
                />
              </div>
              <button
                type="button"
                onClick={handleCancelGeneration}
                className="w-full py-1.5 px-3 rounded-xl border border-red-500/40 text-red-400 hover:bg-red-500/10 text-xs font-bold transition-all text-center"
              >
                Cancel Generation
              </button>
            </div>
          )}
        </div>

        {/* BOTTOM ACTION BAR */}
        <div className="p-3 sm:p-4 border-t border-[var(--border)] bg-[var(--surface)] shrink-0 flex items-center gap-2">
          {activeTab === 'video' ? (
            videoResult ? (
              <>
                <button
                  type="button"
                  onClick={handleShareVideo}
                  className="rounded-2xl font-bold flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
                  style={{
                    background: 'var(--accent)',
                    color: 'var(--on-accent)',
                    flex: '1 1 0%',
                    whiteSpace: 'nowrap',
                    fontSize: '0.84rem',
                    padding: '12px 16px',
                  }}
                >
                  <Share2 className="w-4 h-4 shrink-0" />
                  <span>Share Reel / Story</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadVideo}
                  className="p-2.5 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-primary)] hover:border-[var(--accent)] transition-all active:scale-95"
                  title="Download Video File"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setVideoResult(null)}
                  className="p-2.5 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all active:scale-95"
                  title="Re-generate"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </>
            ) : (
              <button
                type="button"
                disabled={isGenerating || isLoadingVerses}
                onClick={handleGenerateVideo}
                className="w-full py-3 px-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 disabled:opacity-50"
                style={{
                  background: 'var(--accent)',
                  color: 'var(--on-accent)',
                  boxShadow: '0 4px 16px var(--accent-glow)',
                }}
              >
                <Video className="w-4 h-4" />
                <span>
                  {isGenerating ? 'Rendering Reel...' : '🎬 Generate Recitation Reel (30FPS)'}
                </span>
              </button>
            )
          ) : (
            <>
              <button
                type="button"
                disabled={isGenerating || isLoadingVerses}
                onClick={handleShareImage}
                className="flex-1 py-2.5 px-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 disabled:opacity-50"
                style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}
              >
                <Share2 className="w-4 h-4" />
                <span>Share Ayah Image</span>
              </button>
              <button
                type="button"
                disabled={isGenerating || isLoadingVerses}
                onClick={handleDownloadImage}
                className="py-2.5 px-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-primary)] hover:border-[var(--accent)] text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                title="Download 1080p Image"
              >
                <Download className="w-4 h-4" />
                <span>Save 1080p</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
