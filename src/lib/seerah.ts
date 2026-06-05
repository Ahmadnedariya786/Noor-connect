// Seerah Library — thin re-export wrapper
// Re-exports all functions from data layer for convenience

export {
  loadSeerahBook,
  loadSeerahChapter,
  loadSeerahChapterList,
  loadSeerahChaptersByPeriod,
  loadSeerahMetadata,
  clearSeerahCache,
} from "../data/seerah/index";

export type {
  SeerahBook,
  SeerahChapter,
  SeerahChapterSummary,
  SeerahMetadata,
} from "../data/seerah/types";
