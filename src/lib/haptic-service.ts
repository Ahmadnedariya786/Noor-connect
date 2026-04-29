/**
 * Haptic Feedback Service
 * Manages vibration and haptic feedback for the app
 */

import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Preferences } from '@capacitor/preferences';

export type HapticPattern = 
  | 'light'     // Subtle tap
  | 'medium'    // Noticeable tap  
  | 'heavy'     // Strong tap
  | 'success'   // Success feedback
  | 'warning'   // Warning feedback
  | 'error'     // Error feedback
  | 'prayer'    // Prayer time notification
  | 'adhan'     // Adhan call vibration
  | 'bookmark'   // Bookmark saved
  | 'complete'   // Task completed;

export interface HapticSettings {
  enabled: boolean;
  prayerNotifications: boolean;
  bookmarkActions: boolean;
  uiInteractions: boolean;
  intensity: 'light' | 'medium' | 'heavy';
}

const DEFAULT_SETTINGS: HapticSettings = {
  enabled: true,
  prayerNotifications: true,
  bookmarkActions: true,
  uiInteractions: false, // Disabled by default to avoid overuse
  intensity: 'medium'
};

const STORAGE_KEY = 'haptic-settings';

/**
 * Load haptic settings from Capacitor Preferences
 */
const loadSettingsFromPreferences = async (): Promise<HapticSettings> => {
  try {
    const { value } = await Preferences.get({ key: STORAGE_KEY });
    if (value) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(value) };
    }
  } catch (error) {
    console.warn('Failed to load haptic settings from Preferences:', error);
    // Fallback to localStorage for migration
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const settings = { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
        // Migrate to Preferences
        await Preferences.set({ key: STORAGE_KEY, value: JSON.stringify(settings) });
        localStorage.removeItem(STORAGE_KEY);
        return settings;
      }
    } catch (fallbackError) {
      console.warn('Failed to load from localStorage fallback:', fallbackError);
    }
  }
  return DEFAULT_SETTINGS;
};

/**
 * Save haptic settings to Capacitor Preferences
 */
const saveSettingsToPreferences = async (settings: HapticSettings): Promise<void> => {
  try {
    await Preferences.set({ key: STORAGE_KEY, value: JSON.stringify(settings) });
  } catch (error) {
    console.warn('Failed to save haptic settings to Preferences:', error);
    // Fallback to localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }
};

class HapticService {
  private settings: HapticSettings = DEFAULT_SETTINGS;
  private initialized: boolean = false;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize haptic service by loading settings
   */
  private async initialize(): Promise<void> {
    this.settings = await loadSettingsFromPreferences();
    this.initialized = true;
  }

  /**
   * Get current haptic settings
   */
  getSettings(): HapticSettings {
    return { ...this.settings };
  }

  /**
   * Update haptic settings
   */
  async updateSettings(newSettings: Partial<HapticSettings>): Promise<void> {
    this.settings = { ...this.settings, ...newSettings };
    await saveSettingsToPreferences(this.settings);
  }

  /**
   * Check if haptics are enabled
   */
  isEnabled(): boolean {
    return this.settings.enabled;
  }

  /**
   * Check if specific haptic type is enabled
   */
  isTypeEnabled(type: 'prayer' | 'bookmark' | 'ui'): boolean {
    if (!this.settings.enabled) return false;
    
    switch (type) {
      case 'prayer':
        return this.settings.prayerNotifications;
      case 'bookmark':
        return this.settings.bookmarkActions;
      case 'ui':
        return this.settings.uiInteractions;
      default:
        return false;
    }
  }

  /**
   * Trigger haptic feedback
   */
  async trigger(pattern: HapticPattern): Promise<void> {
    // Wait for initialization if not ready
    if (!this.initialized) {
      await this.initialize();
    }

    // Check if haptics are globally enabled
    if (!this.settings.enabled) return;

    // Check if specific type is enabled
    const type = this.getPatternType(pattern);
    if (!this.isTypeEnabled(type)) return;

    try {
      // Map pattern to haptic intensity
      const intensity = this.getIntensityForPattern(pattern);
      
      switch (pattern) {
        case 'light':
        case 'medium':
        case 'heavy':
          await Haptics.impact({ style: this.getImpactStyle(intensity) });
          break;
          
        case 'success':
        case 'complete':
          await Haptics.notification({ type: NotificationType.Success });
          break;
          
        case 'warning':
          await Haptics.notification({ type: NotificationType.Warning });
          break;
          
        case 'error':
          await Haptics.notification({ type: NotificationType.Error });
          break;
          
        case 'prayer':
        case 'adhan':
          // Custom prayer vibration pattern
          await this.prayerVibration();
          break;
          
        case 'bookmark':
          await Haptics.impact({ style: ImpactStyle.Medium });
          break;
          
        default:
          await Haptics.impact({ style: ImpactStyle.Light });
      }
    } catch (error) {
      console.warn('Haptic feedback failed:', error);
    }
  }

  /**
   * Custom prayer vibration pattern
   */
  private async prayerVibration(): Promise<void> {
    try {
      // Three gentle pulses for prayer time
      await Haptics.impact({ style: ImpactStyle.Light });
      await this.delay(200);
      await Haptics.impact({ style: ImpactStyle.Light });
      await this.delay(200);
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch (error) {
      console.warn('Prayer vibration failed:', error);
    }
  }

  /**
   * Get the category of a haptic pattern
   */
  private getPatternType(pattern: HapticPattern): 'prayer' | 'bookmark' | 'ui' {
    if (pattern === 'prayer' || pattern === 'adhan') return 'prayer';
    if (pattern === 'bookmark') return 'bookmark';
    return 'ui';
  }

  /**
   * Get impact style based on settings intensity
   */
  private getImpactStyle(patternIntensity: string): ImpactStyle {
    const intensity = this.settings.intensity;
    
    // Override intensity if pattern specifies it
    if (patternIntensity === 'light') return ImpactStyle.Light;
    if (patternIntensity === 'heavy') return ImpactStyle.Heavy;
    
    switch (intensity) {
      case 'light':
        return ImpactStyle.Light;
      case 'heavy':
        return ImpactStyle.Heavy;
      default:
        return ImpactStyle.Medium;
    }
  }

  /**
   * Get intensity for specific pattern
   */
  private getIntensityForPattern(pattern: HapticPattern): string {
    switch (pattern) {
      case 'light': return 'light';
      case 'heavy': return 'heavy';
      default: return this.settings.intensity;
    }
  }

  /**
   * Simple delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Test haptic feedback
   */
  async test(): Promise<void> {
    if (!this.settings.enabled) {
      console.log('Haptics are disabled');
      return;
    }

    console.log('Testing haptic feedback...');
    
    // Test different patterns
    await this.trigger('light');
    await this.delay(500);
    
    await this.trigger('medium');
    await this.delay(500);
    
    await this.trigger('success');
    await this.delay(500);
    
    await this.trigger('prayer');
  }
}

// Export singleton instance
export const hapticService = new HapticService();
export default hapticService;
