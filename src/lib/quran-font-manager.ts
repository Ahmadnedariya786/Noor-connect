/**
 * Quran Font Manager
 * Handles Quran font switching with CSS variables and localStorage persistence
 */

export type QuranFont = 'uthmani' | 'indopak' | 'system';

export interface QuranFontOption {
  id: QuranFont;
  name: string;
  description: string;
  fontFamily: string;
  googleFonts?: string[];
}

export const QURAN_FONTS: Record<QuranFont, QuranFontOption> = {
  uthmani: {
    id: 'uthmani',
    name: 'Uthmani',
    description: 'Standard Madinah/Mushaf look',
    fontFamily: "ui-serif, Georgia, Cambria, 'Times New Roman', Times, serif"
  },
  indopak: {
    id: 'indopak',
    name: 'Indo-Pak',
    description: 'Common in Pakistan/India',
    fontFamily: "ui-serif, Georgia, Cambria, 'Times New Roman', Times, serif"
  },
  system: {
    id: 'system',
    name: 'System Arabic',
    description: 'Standard digital font',
    fontFamily: "system-ui, -apple-system, 'Segoe UI', 'Noto Sans Arabic', Tahoma, sans-serif"
  }
};

export class QuranFontManager {
  private static instance: QuranFontManager;
  private currentFont: QuranFont = 'uthmani';

  static getInstance(): QuranFontManager {
    if (!QuranFontManager.instance) {
      QuranFontManager.instance = new QuranFontManager();
    }
    return QuranFontManager.instance;
  }

  constructor() {
    this.loadSavedFont();
  }

  /**
   * Load saved font from localStorage
   */
  private loadSavedFont(): void {
    try {
      const saved = localStorage.getItem('quran-font') as QuranFont;
      if (saved && Object.keys(QURAN_FONTS).includes(saved)) {
        this.currentFont = saved;
        this.applyFont(saved);
      }
    } catch (error) {
      console.warn('Failed to load saved Quran font:', error);
    }
  }

  /**
   * Get current font
   */
  getCurrentFont(): QuranFont {
    return this.currentFont;
  }

  /**
   * Get all available fonts
   */
  getAvailableFonts(): QuranFontOption[] {
    return Object.values(QURAN_FONTS);
  }

  /**
   * Set Quran font
   */
  setFont(font: QuranFont): void {
    if (!Object.keys(QURAN_FONTS).includes(font)) {
      console.warn(`Invalid Quran font: ${font}`);
      return;
    }

    this.currentFont = font;
    this.applyFont(font);
    this.saveFont(font);
  }

  /**
   * Apply font to CSS variable
   */
  private applyFont(font: QuranFont): void {
    try {
      const fontOption = QURAN_FONTS[font];
      document.documentElement.style.setProperty('--quran-font', fontOption.fontFamily);
    } catch (error) {
      console.error('Failed to apply Quran font:', error);
    }
  }

  /**
   * Save font to localStorage
   */
  private saveFont(font: QuranFont): void {
    try {
      localStorage.setItem('quran-font', font);
    } catch (error) {
      console.warn('Failed to save Quran font:', error);
    }
  }

  /**
   * Get font option by ID
   */
  getFontOption(font: QuranFont): QuranFontOption {
    return QURAN_FONTS[font];
  }

  /**
   * Kept for compatibility with existing callers.
   * Fonts now rely on local/system stacks to respect the app CSP.
   */
  async loadGoogleFonts(font: QuranFont): Promise<void> {
    this.applyFont(font);
  }

  /**
   * Initialize fonts on app start
   */
  async initialize(): Promise<void> {
    this.applyFont(this.currentFont);
  }
}

// Export singleton instance
export const quranFontManager = QuranFontManager.getInstance();
