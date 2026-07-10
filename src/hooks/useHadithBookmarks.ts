import { useState, useCallback, useEffect } from "react";

const STORAGE_KEY = "hadith-bookmarks";

interface Bookmark {
  id: string;
  collection: string;
  bookNumber: string;
  hadithNumber: string;
  arabic: string;
  englishTranslation?: string;
  bookName?: string;
  timestamp: number;
}

function loadBookmarks(): Bookmark[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function useHadithBookmarks() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(loadBookmarks);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
  }, [bookmarks]);

  const isBookmarked = useCallback(
    (collection: string, hadithNumber: string) =>
      bookmarks.some((b) => b.collection === collection && b.hadithNumber === hadithNumber),
    [bookmarks]
  );

  const toggleBookmark = useCallback(
    (item: { collection: string; bookNumber: string; hadithNumber: string; arabic: string; englishTranslation?: string; bookName?: string }) => {
      setBookmarks((prev) => {
        const existing = prev.findIndex(
          (b) => b.collection === item.collection && b.hadithNumber === item.hadithNumber
        );
        if (existing >= 0) {
          return prev.filter((_, i) => i !== existing);
        }
        return [
          ...prev,
          { ...item, id: `${item.collection}-${item.hadithNumber}-${Date.now()}`, timestamp: Date.now() },
        ];
      });
    },
    []
  );

  const removeBookmark = useCallback((id: string) => {
    setBookmarks((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const clearBookmarks = useCallback(() => {
    setBookmarks([]);
  }, []);

  return { bookmarks, isBookmarked, toggleBookmark, removeBookmark, clearBookmarks };
}
