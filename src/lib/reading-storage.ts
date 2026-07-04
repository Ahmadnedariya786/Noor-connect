// Shared Reading Storage Helpers
// Used by Seerah and Qisas readers for progress, bookmarks, font size, etc.

export type ReadingFeature = "seerah" | "qisas" | "hadith";

const STORAGE_PREFIX = "noor";

// ─── Reading Progress ──────────────────────────────────────────────────
export function getReadingProgress(
  id: string,
  feature: ReadingFeature
): number {
  const key = `${STORAGE_PREFIX}-${feature}-progress`;
  try {
    const data = JSON.parse(localStorage.getItem(key) || "{}");
    return data[id] || 0;
  } catch {
    return 0;
  }
}

export function setReadingProgress(
  id: string,
  percentage: number,
  feature: ReadingFeature
): void {
  const key = `${STORAGE_PREFIX}-${feature}-progress`;
  try {
    const data = JSON.parse(localStorage.getItem(key) || "{}");
    data[id] = Math.min(100, Math.max(0, percentage));
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.warn(`Failed to save reading progress for ${feature}:`, err);
  }
}

// ─── Bookmarks ───────────────────────────────────────────────────────
export function getBookmarks(feature: ReadingFeature): Set<string> {
  const key = `${STORAGE_PREFIX}-${feature}-bookmarks`;
  try {
    const data = JSON.parse(localStorage.getItem(key) || "[]");
    return new Set(data);
  } catch {
    return new Set();
  }
}

export function toggleBookmark(
  id: string,
  feature: ReadingFeature
): boolean {
  const bookmarks = getBookmarks(feature);
  const isBookmarked = bookmarks.has(id);

  if (isBookmarked) {
    bookmarks.delete(id);
  } else {
    bookmarks.add(id);
  }

  const key = `${STORAGE_PREFIX}-${feature}-bookmarks`;
  localStorage.setItem(key, JSON.stringify([...bookmarks]));
  return !isBookmarked;
}

export function isBookmarked(id: string, feature: ReadingFeature): boolean {
  return getBookmarks(feature).has(id);
}

// ─── Font Size ───────────────────────────────────────────────────────
export function getFontSize(feature: ReadingFeature): number {
  const key = `${STORAGE_PREFIX}-${feature}-font-size`;
  try {
    const size = localStorage.getItem(key);
    return size ? parseInt(size, 10) : 16;
  } catch {
    return 16;
  }
}

export function setFontSize(size: number, feature: ReadingFeature): void {
  const key = `${STORAGE_PREFIX}-${feature}-font-size`;
  const clamped = Math.min(24, Math.max(14, size));
  localStorage.setItem(key, String(clamped));
}

// ─── Last Read ─────────────────────────────────────────────────────────
export function getLastRead(feature: ReadingFeature): string | null {
  const key = `${STORAGE_PREFIX}-${feature}-last-read`;
  return localStorage.getItem(key);
}

export function setLastRead(id: string, feature: ReadingFeature): void {
  const key = `${STORAGE_PREFIX}-${feature}-last-read`;
  localStorage.setItem(key, id);
}

// ─── Clear Feature Data ───────────────────────────────────────────────
export function clearFeatureData(feature: ReadingFeature): void {
  const keys = [
    `${STORAGE_PREFIX}-${feature}-progress`,
    `${STORAGE_PREFIX}-${feature}-bookmarks`,
    `${STORAGE_PREFIX}-${feature}-font-size`,
    `${STORAGE_PREFIX}-${feature}-last-read`,
  ];

  keys.forEach((key) => {
    try {
      localStorage.removeItem(key);
    } catch (err) {
      console.warn(`Failed to clear ${key}:`, err);
    }
  });
}
