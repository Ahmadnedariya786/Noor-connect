// Hadith library — thin API layer over the data module
// This file re-exports the data layer with compatible function names.

import type { EnhancedHadith, HadithCollection } from "@/data/hadith-collections";
import {
  loadCollectionMetadata,
  loadBookHadiths,
  loadCollectionHadiths,
  getDailyHadith as getDailyHadithImpl,
} from "@/data/hadith-collections";

export function getDailyHadith(seed?: Date | number): ReturnType<typeof getDailyHadithImpl> {
  return getDailyHadithImpl(seed);
}

// Load collection metadata from local data
export async function getHadithCollectionMetadata(
  collectionName: string
): Promise<HadithCollection | null> {
  return loadCollectionMetadata(collectionName);
}

// Load Hadith data for a specific book
export async function getHadithBookData(
  collectionName: string,
  bookNumber: string
): Promise<EnhancedHadith[] | null> {
  const data = await loadBookHadiths(collectionName, bookNumber);
  return data.length > 0 ? data : null;
}

// Load all hadiths for a collection
export async function getAllCollectionHadiths(
  collectionName: string
): Promise<EnhancedHadith[]> {
  return loadCollectionHadiths(collectionName);
}

// Get available book numbers for a collection
export async function getAvailableHadithBooks(
  collectionName: string
): Promise<string[]> {
  const metadata = await loadCollectionMetadata(collectionName);
  if (metadata?.books?.length) {
    return metadata.books.map((b) => b.number);
  }
  return [];
}

// Get first available book
export async function getFirstAvailableHadithBook(
  collectionName: string
): Promise<string | null> {
  const books = await getAvailableHadithBooks(collectionName);
  return books[0] ?? null;
}
