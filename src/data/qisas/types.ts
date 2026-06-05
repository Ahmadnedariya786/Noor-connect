// Qisas Data Types

export interface QisasMetadata {
  id: string;
  title: string;
  arabicTitle: string;
  author: string;
  arabicAuthor: string;
  description: string;
  source: string;
  totalProphets: number;
  language: string;
  category: "prophets";
}

export interface ProphetStory {
  id: string;
  number: number;
  name: string;
  arabicName: string;
  title: string;
  arabicTitle: string;
  era: "beginning-of-creation" | "pre-flood" | "patriarchal" | "israelite" | "post-israelite";
  quranMentions: string[];
  story: string;
  tags: string[];
}

export interface ProphetSummary {
  id: string;
  number: number;
  name: string;
  arabicName: string;
  title: string;
  arabicTitle: string;
  era: "beginning-of-creation" | "pre-flood" | "patriarchal" | "israelite" | "post-israelite";
  quranMentions: string[];
  tags: string[];
}

export interface QisasBook {
  metadata: QisasMetadata;
  prophets: ProphetStory[];
}
