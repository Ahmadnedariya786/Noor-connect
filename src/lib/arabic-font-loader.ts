const SYSTEM_ARABIC_FONT_STACK = [
  "ui-serif",
  "Georgia",
  "Cambria",
  "Times New Roman",
  "Times",
  "serif"
].join(", ");

export class ArabicFontLoader {
  /**
   * Apply a system Arabic font stack (no external fonts).
   */
  static async loadAmiriFont(): Promise<void> {
    this.loadFallbackFont();
  }

  /**
   * Load fallback Arabic font
   */
  private static loadFallbackFont(): void {
    document.documentElement.style.setProperty('--quran-font', SYSTEM_ARABIC_FONT_STACK);
  }

  /**
   * Check if font is loaded (always true for system fonts)
   */
  static isFontLoaded(): boolean {
    return true;
  }
}

// Compatibility export to match existing imports (`arabicFontLoader.loadAmiriFont()`)
export const arabicFontLoader = ArabicFontLoader;
