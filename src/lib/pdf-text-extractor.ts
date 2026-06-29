// PDF Text Extraction Utility using pdf.js
// Lazy load pdfjs-dist to reduce bundle size
let pdfjsLib: any = null;

async function getPdfjsLib() {
  if (!pdfjsLib) {
    pdfjsLib = await import('pdfjs-dist');
    // Configure PDF.js worker (should match the version used in NativePdfViewer)
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
  }
  return pdfjsLib;
}

export interface ExtractedText {
  text: string;
  pageNumber: number;
  totalPages: number;
}

/**
 * Extract text from a specific page of a PDF document
 */
export async function extractTextFromPage(
  pdfUrl: string | Blob,
  pageNumber: number
): Promise<string> {
  try {
    const lib = await getPdfjsLib();
    // Load the PDF document
    const source =
      typeof pdfUrl === 'string'
        ? pdfUrl
        : { data: new Uint8Array(await pdfUrl.arrayBuffer()) };
    const loadingTask = lib.getDocument(source);
    const pdf = await loadingTask.promise;

    // Get the specific page
    const page = await pdf.getPage(pageNumber);

    // Extract text content
    const textContent = await page.getTextContent();

    // Combine all text items into a single string
    const text = textContent.items
      .map((item: any) => item.str)
      .join(' ')
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();

    // Clean up
    page.cleanup();

    return text;
  } catch (error) {
    console.error('Error extracting text from PDF page:', error);
    throw error;
  }
}

/**
 * Extract text from all pages of a PDF document
 */
export async function extractTextFromAllPages(
  pdfUrl: string | Blob
): Promise<ExtractedText[]> {
  try {
    const lib = await getPdfjsLib();
    const source =
      typeof pdfUrl === 'string'
        ? pdfUrl
        : { data: new Uint8Array(await pdfUrl.arrayBuffer()) };
    const loadingTask = lib.getDocument(source);
    const pdf = await loadingTask.promise;

    const totalPages = pdf.numPages;
    const results: ExtractedText[] = [];

    // Extract text from each page
    for (let i = 1; i <= totalPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();

      const text = textContent.items
        .map((item: any) => item.str)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();

      results.push({
        text,
        pageNumber: i,
        totalPages
      });

      page.cleanup();
    }

    return results;
  } catch (error) {
    console.error('Error extracting text from all PDF pages:', error);
    throw error;
  }
}

/**
 * Preload and cache PDF document for faster text extraction
 */
export class PdfTextCache {
  private cache: Map<string, any> = new Map();
  private textCache: Map<string, Map<number, string>> = new Map();

  async preload(pdfUrl: string | Blob, cacheKey: string): Promise<void> {
    try {
      const lib = await getPdfjsLib();
      const source =
        typeof pdfUrl === 'string'
          ? pdfUrl
          : { data: new Uint8Array(await pdfUrl.arrayBuffer()) };
      const loadingTask = lib.getDocument(source);
      const pdf = await loadingTask.promise;
      this.cache.set(cacheKey, pdf);
      this.textCache.set(cacheKey, new Map());
    } catch (error) {
      console.error('Error preloading PDF:', error);
      throw error;
    }
  }

  async getText(cacheKey: string, pageNumber: number): Promise<string> {
    const pdf = this.cache.get(cacheKey);
    if (!pdf) {
      throw new Error('PDF not preloaded. Call preload() first.');
    }

    // Check text cache first
    const pageCache = this.textCache.get(cacheKey);
    if (pageCache?.has(pageNumber)) {
      return pageCache.get(pageNumber)!;
    }

    // Extract and cache
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();

    const text = textContent.items
      .map((item: any) => item.str)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    pageCache?.set(pageNumber, text);
    page.cleanup();

    return text;
  }

  clear(cacheKey?: string): void {
    if (cacheKey) {
      const pdf = this.cache.get(cacheKey);
      if (pdf && pdf.destroy) {
        pdf.destroy();
      }
      this.cache.delete(cacheKey);
      this.textCache.delete(cacheKey);
    } else {
      // Clear all
      this.cache.forEach((pdf) => {
        if (pdf && pdf.destroy) {
          pdf.destroy();
        }
      });
      this.cache.clear();
      this.textCache.clear();
    }
  }

  isLoaded(cacheKey: string): boolean {
    return this.cache.has(cacheKey);
  }
}

// Global cache instance
export const pdfTextCache = new PdfTextCache();

/**
 * Detect the language of text content
 * Simple heuristic-based detection for common languages
 */
export function detectLanguage(text: string): string {
  if (!text || text.length < 10) return 'en';
  
  // Check for Arabic script (Arabic, Urdu, Persian)
  const arabicPattern = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  if (arabicPattern.test(text)) {
    // Try to distinguish Arabic, Urdu, Persian
    const urduSpecificChars = /[\u0679\u0688\u0691\u06C0\u06C2\u06D2\u06D3]/; // Urdu-specific characters
    if (urduSpecificChars.test(text)) return 'ur';
    
    const persianSpecificChars = /[\u06CC\u06A9\u06AF\u0698\u067E\u0686]/; // Persian-specific characters
    if (persianSpecificChars.test(text)) return 'fa';
    
    return 'ar'; // Default to Arabic
  }
  
  // Check for Bengali
  const bengaliPattern = /[\u0980-\u09FF]/;
  if (bengaliPattern.test(text)) return 'bn';
  
  // Check for Devanagari (Hindi)
  const devanagariPattern = /[\u0900-\u097F]/;
  if (devanagariPattern.test(text)) return 'hi';
  
  // Default to English
  return 'en';
}
