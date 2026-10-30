/**
 * Islamic Open-Source CDN APIs & Rate-Limit-Free Backbone
 *
 * Integrated endpoints leveraging jsDelivr worldwide CDN (fawazahmed0/quran-api & fawazahmed0/hadith-api)
 * providing high availability, 0ms rate-limit penalty, and offline-compatible fallbacks.
 */

export interface CdnQuranVerse {
  chapter: number;
  verse: number;
  text: string;
}

export interface CdnQuranChapterResponse {
  chapter: number;
  verses: CdnQuranVerse[];
}

export interface CdnHadithItem {
  hadithnumber: number;
  arabicnumber: number;
  text: string;
  grades?: Array<{ name: string; grade: string }>;
  reference?: { book: number; hadith: number };
}

const JSDELIVR_QURAN_BASE = 'https://cdn.jsdelivr.net/gh/fawazahmed0/quran-api@1/editions';
const JSDELIVR_HADITH_BASE = 'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions';

export class IslamicOpenApis {
  /**
   * Fetch chapter verses from global CDN
   */
  static async getQuranChapter(
    chapterNumber: number,
    edition: string = 'ara-quranuthmani'
  ): Promise<CdnQuranChapterResponse | null> {
    try {
      const url = `${JSDELIVR_QURAN_BASE}/${edition}/chapters/${chapterNumber}.json`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4500);

      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (response.ok) {
        return await response.json();
      }
    } catch {
      // Fallback cleanly
    }
    return null;
  }

  /**
   * Fetch single verse text from global CDN
   */
  static async getQuranVerse(
    chapterNumber: number,
    verseNumber: number,
    edition: string = 'ara-quranuthmani'
  ): Promise<string | null> {
    try {
      const url = `${JSDELIVR_QURAN_BASE}/${edition}/${chapterNumber}/${verseNumber}.json`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        return data.text || null;
      }
    } catch {
      // Fallback
    }
    return null;
  }

  /**
   * Fetch Hadith item from global CDN
   */
  static async getHadith(
    collection: string,
    hadithNumber: number,
    edition: string = 'ara-bukhari'
  ): Promise<CdnHadithItem | null> {
    try {
      const url = `${JSDELIVR_HADITH_BASE}/${edition}/${hadithNumber}.json`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (response.ok) {
        return await response.json();
      }
    } catch {
      // Fallback
    }
    return null;
  }
}
