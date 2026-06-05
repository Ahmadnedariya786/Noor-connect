// Seerah Data Types

export interface SeerahMetadata {
  id: string;
  title: string;
  arabicTitle: string;
  author: string;
  arabicAuthor: string;
  description: string;
  source: string;
  totalChapters: number;
  language: string;
  category: "seerah";
}

export interface SeerahChapter {
  id: string;
  number: number;
  title: string;
  arabicTitle: string;
  period: "pre-prophethood" | "makkan" | "madinan" | "final-days";
  content: string;
  tags: string[];
}

export interface SeerahChapterSummary {
  id: string;
  number: number;
  title: string;
  arabicTitle: string;
  period: "pre-prophethood" | "makkan" | "madinan" | "final-days";
  tags: string[];
}

export interface SeerahBook {
  metadata: SeerahMetadata;
  chapters: SeerahChapter[];
}
