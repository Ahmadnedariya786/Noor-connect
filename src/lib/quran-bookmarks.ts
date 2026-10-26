/**
 * Noor Connect — 5-Colour Smart Bookmarks System
 *
 * Provides 5 jewel-toned bookmarks (Emerald, Gold, Sapphire, Violet, Ruby)
 * with "Moves as you read" auto-advancing progress tracking.
 * 100% offline-first with reactive window events and localStorage persistence.
 */

export type BookmarkColorId = 'emerald' | 'gold' | 'sapphire' | 'violet' | 'ruby';

export interface BookmarkColorDef {
  id: BookmarkColorId;
  name: string;
  hex: string;
  bgHex: string;
  borderHex: string;
  textColor: string;
}

export const BOOKMARK_COLORS: BookmarkColorDef[] = [
  {
    id: 'emerald',
    name: 'Emerald',
    hex: '#10B981',
    bgHex: 'rgba(16, 185, 129, 0.16)',
    borderHex: 'rgba(16, 185, 129, 0.45)',
    textColor: '#34D399',
  },
  {
    id: 'gold',
    name: 'Gold',
    hex: '#F59E0B',
    bgHex: 'rgba(245, 158, 11, 0.16)',
    borderHex: 'rgba(245, 158, 11, 0.45)',
    textColor: '#FBBF24',
  },
  {
    id: 'sapphire',
    name: 'Sapphire',
    hex: '#3B82F6',
    bgHex: 'rgba(59, 130, 246, 0.16)',
    borderHex: 'rgba(59, 130, 246, 0.45)',
    textColor: '#60A5FA',
  },
  {
    id: 'violet',
    name: 'Violet',
    hex: '#8B5CF6',
    bgHex: 'rgba(139, 92, 246, 0.16)',
    borderHex: 'rgba(139, 92, 246, 0.45)',
    textColor: '#A78BFA',
  },
  {
    id: 'ruby',
    name: 'Ruby',
    hex: '#EF4444',
    bgHex: 'rgba(239, 68, 68, 0.16)',
    borderHex: 'rgba(239, 68, 68, 0.45)',
    textColor: '#F87171',
  },
];

export interface ColorBookmark {
  colorId: BookmarkColorId;
  surah: number;
  surahName: string;
  surahArabic?: string;
  ayah: number;
  page: number;
  autoMove: boolean; // "Moves as you read"
  updatedAt: string;
}

const STORAGE_KEY = 'noor_color_bookmarks_v1';
export const COLOR_BOOKMARKS_CHANGED_EVENT = 'noorconnect:color-bookmarks-changed';

/**
 * Read all 5 color bookmarks from localStorage
 */
export function getColorBookmarks(): Record<BookmarkColorId, ColorBookmark | null> {
  const empty: Record<BookmarkColorId, ColorBookmark | null> = {
    emerald: null,
    gold: null,
    sapphire: null,
    violet: null,
    ruby: null,
  };

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw);
    return {
      ...empty,
      ...parsed,
    };
  } catch {
    return empty;
  }
}

/**
 * Save color bookmarks state and dispatch global notification
 */
function saveColorBookmarks(state: Record<BookmarkColorId, ColorBookmark | null>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent(COLOR_BOOKMARKS_CHANGED_EVENT, { detail: state })
      );
    }
  } catch {
    // Storage quota or unavailable safe fallback
  }
}

/**
 * Toggle or set a coloured bookmark at the given location.
 * If already placed with the exact same surah, ayah, and page, tapping again removes it.
 */
export function toggleColorBookmark(
  colorId: BookmarkColorId,
  loc: {
    surah: number;
    surahName: string;
    surahArabic?: string;
    ayah: number;
    page: number;
    autoMove?: boolean;
  }
): boolean {
  const current = getColorBookmarks();
  const existing = current[colorId];

  // If already at this exact spot, remove it
  if (existing && existing.surah === loc.surah && existing.ayah === loc.ayah) {
    current[colorId] = null;
    saveColorBookmarks(current);
    return false; // removed
  }

  // Set or update
  current[colorId] = {
    colorId,
    surah: loc.surah,
    surahName: loc.surahName,
    surahArabic: loc.surahArabic,
    ayah: loc.ayah,
    page: loc.page,
    autoMove: loc.autoMove ?? (existing ? existing.autoMove : true),
    updatedAt: new Date().toISOString(),
  };

  saveColorBookmarks(current);
  syncContinueReadingCard(loc.surah, loc.surahName, loc.page, loc.surahArabic);
  return true; // placed
}

/**
 * Update the "Moves as you read" toggle for a specific color bookmark
 */
export function setBookmarkAutoMove(colorId: BookmarkColorId, autoMove: boolean): void {
  const current = getColorBookmarks();
  if (current[colorId]) {
    current[colorId] = {
      ...current[colorId]!,
      autoMove,
      updatedAt: new Date().toISOString(),
    };
    saveColorBookmarks(current);
  }
}

/**
 * Remove a specific color bookmark
 */
export function removeColorBookmark(colorId: BookmarkColorId): void {
  const current = getColorBookmarks();
  if (current[colorId]) {
    current[colorId] = null;
    saveColorBookmarks(current);
  }
}

/**
 * "Moves as you read" progress follower:
 * Called whenever the user turns Mushaf pages or advances ayahs.
 * Any bookmark with autoMove === true will follow the reading position!
 */
export function updateAutoMovingBookmarks(
  surah: number,
  surahName: string,
  ayah: number,
  page: number,
  surahArabic?: string
): void {
  const current = getColorBookmarks();
  let changed = false;

  (Object.keys(current) as BookmarkColorId[]).forEach((cid) => {
    const bm = current[cid];
    if (bm && bm.autoMove) {
      current[cid] = {
        ...bm,
        surah,
        surahName,
        surahArabic: surahArabic || bm.surahArabic,
        ayah,
        page,
        updatedAt: new Date().toISOString(),
      };
      changed = true;
    }
  });

  if (changed) {
    saveColorBookmarks(current);
    syncContinueReadingCard(surah, surahName, page, surahArabic);
  }
}

/**
 * Synchronize with the single CONTINUE READING card in localStorage
 */
function syncContinueReadingCard(
  surah: number,
  surahName: string,
  page: number,
  arabicName?: string
): void {
  try {
    const data = {
      number: surah,
      name: surahName,
      englishName: surahName,
      arabicName: arabicName || '',
      page,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem('quran-last-read', JSON.stringify(data));
  } catch {
    // Storage fallback
  }
}
