/**
 * Unified Multi-Language Islamic Content Translation Engine
 * ─────────────────────────────────────────────────────────────
 * Provides dynamic 4-language support for Hadith, Seerah, Prophets,
 * Duas, Remedies, and Daily Cards:
 *   - 'en': English (Original canonical text)
 *   - 'ur': Urdu (اردو) - with RTL layout and Nastaliq spacing
 *   - 'gu': Gujarati (ગુજરાતી)
 *   - 'hi': Hindi (हिन्दी)
 *
 * Online-first with 0ms in-memory + LocalStorage cache fallback.
 * Strictly adheres to Zero-User-Impact Principle & Offline Safety.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext-new';

export type ContentLang = 'en' | 'ur' | 'gu' | 'hi';

export const CONTENT_LANG_STORAGE_KEY = 'noor_content_lang_v1';
export const CONTENT_TRANSLATION_CACHE_PREFIX = 'noor_ctr_v1_';

export interface ContentLangOption {
  code: ContentLang;
  label: string;
  nativeLabel: string;
  shortLabel: string;
  dir: 'ltr' | 'rtl';
}

export const CONTENT_LANGUAGES: ContentLangOption[] = [
  { code: 'en', label: 'English', nativeLabel: 'English', shortLabel: 'EN', dir: 'ltr' },
  { code: 'ur', label: 'Urdu', nativeLabel: 'اردو', shortLabel: 'اردو', dir: 'rtl' },
  { code: 'gu', label: 'Gujarati', nativeLabel: 'ગુજરાતી', shortLabel: 'ગુજ', dir: 'ltr' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी', shortLabel: 'हिं', dir: 'ltr' },
];

// In-Memory Fast Cache (0ms lookup)
const memoryCache = new Map<string, string>();

/**
 * Fast 32-bit FNV-1a / DJB2 variant for short safe cache keys
 */
export function fastHash(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}

/**
 * Standardize and sanitize Islamic honorifics across Urdu, Gujarati, Hindi & English
 */
export function sanitizeIslamicHonorifics(text: string, targetLang: ContentLang): string {
  if (!text) return '';

  if (targetLang === 'ur') {
    return text
      .replace(/\((?:ﷺ|peace be upon him|pbuh|p\.b\.u\.h\.)\)/gi, 'ﷺ')
      .replace(/\bpeace be upon him\b/gi, 'ﷺ')
      .replace(/\b(?:PBUH|pbuh)\b/g, 'ﷺ')
      .replace(/\((?:AS|a\.s\.|alayhis-salam|alayhis salam)\)/gi, 'علیہ السلام')
      .replace(/\b(?:AS|alayhis salam)\b/g, 'علیہ السلام')
      .replace(/\((?:RA|r\.a\.|radiyallahu 'anhu|radiyallahu anhu)\)/gi, 'رضی اللہ عنہ')
      .replace(/\b(?:RA|radiyallahu anhu)\b/g, 'رضی اللہ عنہ');
  }

  if (targetLang === 'gu') {
    return text
      .replace(/\((?:ﷺ|peace be upon him|pbuh|p\.b\.u\.h\.)\)/gi, ' (સ.અ.વ.)')
      .replace(/\bpeace be upon him\b/gi, '(સ.અ.વ.)')
      .replace(/\b(?:PBUH|pbuh)\b/g, '(સ.અ.વ.)')
      .replace(/\((?:AS|a\.s\.|alayhis-salam|alayhis salam)\)/gi, ' (અ.સ.)')
      .replace(/\((?:RA|r\.a\.|radiyallahu 'anhu|radiyallahu anhu)\)/gi, ' (ર.અ.)');
  }

  if (targetLang === 'hi') {
    return text
      .replace(/\((?:ﷺ|peace be upon him|pbuh|p\.b\.u\.h\.)\)/gi, ' (स.अ.व.)')
      .replace(/\bpeace be upon him\b/gi, '(स.अ.व.)')
      .replace(/\b(?:PBUH|pbuh)\b/g, '(स.अ.व.)')
      .replace(/\((?:AS|a\.s\.|alayhis-salam|alayhis salam)\)/gi, ' (अ.स.)')
      .replace(/\((?:RA|r\.a\.|radiyallahu 'anhu|radiyallahu anhu)\)/gi, ' (र.अ.)');
  }

  return text;
}

/**
 * Splits text into chunks of <= maxChunkSize characters at paragraph or sentence boundaries
 */
function splitIntoChunks(text: string, maxChunkSize = 1100): string[] {
  if (text.length <= maxChunkSize) return [text];

  const chunks: string[] = [];
  const paragraphs = text.split(/\n\s*\n/);

  let currentChunk = '';

  for (const para of paragraphs) {
    if (para.length > maxChunkSize) {
      // Split large paragraph by sentences
      const sentences = para.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [para];
      for (const sentence of sentences) {
        if ((currentChunk + ' ' + sentence).trim().length > maxChunkSize) {
          if (currentChunk.trim()) chunks.push(currentChunk.trim());
          currentChunk = sentence;
        } else {
          currentChunk = (currentChunk ? currentChunk + ' ' : '') + sentence;
        }
      }
    } else {
      if ((currentChunk + '\n\n' + para).trim().length > maxChunkSize) {
        if (currentChunk.trim()) chunks.push(currentChunk.trim());
        currentChunk = para;
      } else {
        currentChunk = (currentChunk ? currentChunk + '\n\n' : '') + para;
      }
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * Translates a single text chunk via Google GTX API with timeout and honorifics
 */
async function fetchGtxTranslation(chunk: string, targetLang: ContentLang): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4500);

  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(chunk)}`;
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      return chunk;
    }

    const data = await response.json();
    if (Array.isArray(data) && Array.isArray(data[0])) {
      const translatedParts = data[0].map((item: any) => (Array.isArray(item) ? item[0] : '')).filter(Boolean);
      return translatedParts.join('') || chunk;
    }
    return chunk;
  } catch {
    // Offline or aborted — gracefully fall back to original chunk
    return chunk;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Core Translation Function:
 * Translates any English Islamic text to targetLang ('en' | 'ur' | 'gu' | 'hi')
 * with 0ms local cache hit, chunking for long passages, and honorific polishing.
 */
export async function translateIslamicText(
  text: string,
  targetLang: ContentLang = 'en'
): Promise<string> {
  if (!text || !text.trim() || targetLang === 'en') {
    return text;
  }

  const trimmed = text.trim();
  const cacheKey = `${CONTENT_TRANSLATION_CACHE_PREFIX}${targetLang}_${fastHash(trimmed)}`;

  // 1. Check in-memory cache (0ms)
  if (memoryCache.has(cacheKey)) {
    return memoryCache.get(cacheKey)!;
  }

  // 2. Check localStorage cache (0ms)
  try {
    const stored = localStorage.getItem(cacheKey);
    if (stored) {
      memoryCache.set(cacheKey, stored);
      return stored;
    }
  } catch {
    // LocalStorage quota or access denied — ignore silently
  }

  // 3. Online fetch with chunking
  const chunks = splitIntoChunks(trimmed);
  const translatedChunks: string[] = [];

  for (const chunk of chunks) {
    const res = await fetchGtxTranslation(chunk, targetLang);
    translatedChunks.push(res);
  }

  const translatedFull = translatedChunks.join('\n\n');
  const polished = sanitizeIslamicHonorifics(translatedFull, targetLang);

  // 4. Save into caches
  if (polished && polished !== trimmed) {
    memoryCache.set(cacheKey, polished);
    try {
      localStorage.setItem(cacheKey, polished);
    } catch {
      // Storage quota exceeded — continue gracefully
    }
    return polished;
  }

  return trimmed;
}

/**
 * Batch translation helper for lists (e.g. chapters, hadith items, dua categories)
 */
export async function translateIslamicBatch(
  texts: string[],
  targetLang: ContentLang = 'en'
): Promise<string[]> {
  if (!texts || texts.length === 0 || targetLang === 'en') {
    return texts;
  }

  return Promise.all(texts.map((t) => translateIslamicText(t, targetLang)));
}

/**
 * Resolves the initial active Content Language:
 * Syncs with global app language if 'ur' | 'gu' | 'hi', otherwise checks saved preference.
 */
export function getStoredContentLang(globalLang?: string): ContentLang {
  try {
    const saved = localStorage.getItem(CONTENT_LANG_STORAGE_KEY) as ContentLang | null;
    if (saved && (saved === 'en' || saved === 'ur' || saved === 'gu' || saved === 'hi')) {
      return saved;
    }
  } catch {
    // Ignore storage read error
  }

  if (globalLang === 'ur' || globalLang === 'gu' || globalLang === 'hi') {
    return globalLang;
  }

  return 'en';
}

/**
 * Custom React Hook: `useContentLanguage`
 * ──────────────────────────────────────
 * Provides reactive content language state across all 6 sections.
 * Automatically synchronizes with Settings app language when changed,
 * and notifies all listeners via a CustomEvent without triggering full reloads.
 */
export function useContentLanguage() {
  const { language: globalLang } = useLanguage();
  const [contentLang, setContentLangState] = useState<ContentLang>(() => getStoredContentLang(globalLang));

  // Sync when global app language changes in Settings
  useEffect(() => {
    if (globalLang === 'ur' || globalLang === 'gu' || globalLang === 'hi' || globalLang === 'en') {
      const saved = localStorage.getItem(CONTENT_LANG_STORAGE_KEY);
      // If user hasn't explicitly set a custom content language, follow global language
      if (!saved || saved === globalLang) {
        setContentLangState(globalLang as ContentLang);
      }
    }
  }, [globalLang]);

  // Listen to cross-component content language changes
  useEffect(() => {
    const handleLangChange = (e: Event) => {
      const customEvent = e as CustomEvent<ContentLang>;
      if (customEvent.detail && customEvent.detail !== contentLang) {
        setContentLangState(customEvent.detail);
      }
    };

    window.addEventListener('noor-content-lang-change', handleLangChange);
    window.addEventListener('noor-content-lang-changed', handleLangChange);
    return () => {
      window.removeEventListener('noor-content-lang-change', handleLangChange);
      window.removeEventListener('noor-content-lang-changed', handleLangChange);
    };
  }, [contentLang]);

  const setContentLang = useCallback((newLang: ContentLang) => {
    setContentLangState(newLang);
    try {
      localStorage.setItem(CONTENT_LANG_STORAGE_KEY, newLang);
    } catch {
      // Ignore storage error
    }
    window.dispatchEvent(new CustomEvent('noor-content-lang-change', { detail: newLang }));
    window.dispatchEvent(new CustomEvent('noor-content-lang-changed', { detail: newLang }));
  }, []);

  const isRtl = contentLang === 'ur';
  const dir = isRtl ? 'rtl' : 'ltr';

  const fontClass = useMemo(() => {
    if (contentLang === 'ur') {
      return 'font-urdu text-right leading-[2.35] tracking-normal pt-1 pb-1';
    }
    return '';
  }, [contentLang]);

  const contentStyle = useMemo(() => {
    if (contentLang === 'ur') {
      return {
        fontFamily: 'var(--font-urdu)',
        direction: 'rtl' as const,
        textAlign: 'right' as const,
        lineHeight: 2.35,
        fontSize: '1.08rem',
        paddingTop: '4px',
        paddingBottom: '4px',
      };
    }
    return {
      direction: 'ltr' as const,
      textAlign: 'left' as const,
      lineHeight: 1.6,
    };
  }, [contentLang]);

  return {
    contentLang,
    setContentLang,
    isRtl,
    dir,
    fontClass,
    contentStyle,
  };
}

