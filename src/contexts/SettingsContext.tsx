import React, { createContext, useContext, useEffect, useState, ReactNode, useMemo } from 'react';
import { Preferences } from '@capacitor/preferences';
import { isLowEndDevice } from '@/lib/device-performance';

export type ThemePreference = 'light' | 'dark' | 'system';

interface SettingsContextProps {
  theme: ThemePreference;
  effectiveTheme: 'light' | 'dark';
  setTheme: (theme: ThemePreference) => void;
  toggleTheme: () => void;
  animationEnabled: boolean;
  setAnimationEnabled: (enabled: boolean) => void;
  toggleAnimation: () => void;
  greetingEnabled: boolean;
  setGreetingEnabled: (enabled: boolean) => void;
  toggleGreeting: () => void;
  splashGreetingEnabled: boolean;
  setSplashGreetingEnabled: (enabled: boolean) => void;
  toggleSplashGreeting: () => void;
  splashEnabled: boolean;
  setSplashEnabled: (enabled: boolean) => void;
  toggleSplash: () => void;
}

const SettingsContext = createContext<SettingsContextProps | undefined>(undefined);

const THEME_KEY = 'theme';
const ANIMATION_KEY = 'animations_enabled';
const GREETING_KEY = 'greetingEnabled';
const LEGACY_GREETING_KEY = 'salam-greeting-enabled';
const SPLASH_GREETING_KEY = 'splash_greeting_enabled';
const SPLASH_ENABLED_KEY = 'splash_enabled';

const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const getStoredTheme = async (): Promise<ThemePreference> => {
  try {
    const { value } = await Preferences.get({ key: THEME_KEY });
    if (value === 'light' || value === 'dark' || value === 'system') {
      return value as ThemePreference;
    }
  } catch (error) {
    console.warn('Failed to read theme from Preferences, falling back to localStorage:', error);
    const fallback = localStorage.getItem(THEME_KEY);
    if (fallback === 'light' || fallback === 'dark') {
      return fallback as ThemePreference;
    }
  }
  return 'system';
};

const getEffectiveTheme = (themePreference: ThemePreference): 'light' | 'dark' => {
  return themePreference === 'system' ? getSystemTheme() : themePreference;
};

const getStoredBoolean = (key: string, fallback = true): boolean => {
  const storedValue = localStorage.getItem(key);
  return storedValue === null ? fallback : storedValue === 'true';
};

const getStoredBooleanFromPreferences = async (key: string, fallback = true): Promise<boolean> => {
  try {
    const { value } = await Preferences.get({ key });
    if (value === null) return fallback;
    return value === 'true';
  } catch (error) {
    console.warn(`Failed to read ${key} from Preferences, falling back to localStorage:`, error);
    const storedValue = localStorage.getItem(key);
    return storedValue === null ? fallback : storedValue === 'true';
  }
};

const getStoredBooleanOrNullFromPreferences = async (key: string): Promise<boolean | null> => {
  try {
    const { value } = await Preferences.get({ key });
    if (value === null) return null;
    return value === 'true';
  } catch (error) {
    console.warn(`Failed to read ${key} from Preferences, falling back to localStorage:`, error);
    const storedValue = localStorage.getItem(key);
    return storedValue === null ? null : storedValue === 'true';
  }
};

const setStoredBooleanToPreferences = async (key: string, value: boolean): Promise<void> => {
  try {
    await Preferences.set({ key, value: value.toString() });
  } catch (error) {
    console.warn(`Failed to save ${key} to Preferences, falling back to localStorage:`, error);
    localStorage.setItem(key, value.toString());
  }
};

const getPrefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

// Apply no-animations class immediately based on setting
const applyAnimationClass = (enabled: boolean) => {
  if (enabled) {
    document.documentElement.classList.remove('no-animations');
    document.documentElement.dataset.animations = 'on';
  } else {
    document.documentElement.classList.add('no-animations');
    document.documentElement.dataset.animations = 'off';
  }
};

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setThemeState] = useState<ThemePreference>('system');
  const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark'>(() => getEffectiveTheme('system'));
  const [isLoaded, setIsLoaded] = useState(false);
  const [animationEnabled, setAnimationEnabledState] = useState<boolean>(() => {
    // Default: respect prefers-reduced-motion and low-end device detection
    const storedValue = localStorage.getItem(ANIMATION_KEY);
    if (storedValue === null) {
      // No user preference set - check device capabilities
      const isLowEnd = isLowEndDevice();
      const prefersReducedMotion = getPrefersReducedMotion();
      // Disable animations if device is low-end OR user prefers reduced motion
      return !isLowEnd && !prefersReducedMotion;
    }
    // User has set a preference - respect it
    return storedValue === 'true';
  });
  const [greetingEnabled, setGreetingEnabledState] = useState<boolean>(() => {
    const currentValue = localStorage.getItem(GREETING_KEY);
    if (currentValue !== null) return currentValue === 'true';
    return getStoredBoolean(LEGACY_GREETING_KEY, true);
  });
  const [splashGreetingEnabled, setSplashGreetingEnabledState] = useState<boolean>(true); // Will be loaded from Preferences
  const [splashEnabled, setSplashEnabledState] = useState<boolean>(true); // Will be loaded from Preferences

  // Load settings from Capacitor Preferences on mount
  useEffect(() => {
    const loadSettings = async () => {
      // Load theme
      const storedTheme = await getStoredTheme();
      setThemeState(storedTheme);
      setEffectiveTheme(getEffectiveTheme(storedTheme));

      // Load animation setting from Preferences (with prefers-reduced-motion and low-end device fallback)
      const storedAnimation = await getStoredBooleanOrNullFromPreferences(ANIMATION_KEY);
      let finalAnimationValue: boolean;
      
      if (storedAnimation === null) {
        // No stored preference - use device detection
        const isLowEnd = isLowEndDevice();
        const prefersReducedMotion = getPrefersReducedMotion();
        finalAnimationValue = !isLowEnd && !prefersReducedMotion;
        // Store this initial preference so it persists
        await setStoredBooleanToPreferences(ANIMATION_KEY, finalAnimationValue);
        localStorage.setItem(ANIMATION_KEY, finalAnimationValue.toString());
      } else {
        // User has a stored preference - respect it
        finalAnimationValue = storedAnimation;
      }
      
      setAnimationEnabledState(finalAnimationValue);
      applyAnimationClass(finalAnimationValue);

      // Load splash greeting setting from Preferences
      const storedSplashGreeting = await getStoredBooleanFromPreferences(SPLASH_GREETING_KEY, true);
      setSplashGreetingEnabledState(storedSplashGreeting);

      // Load splash enabled setting from Preferences
      const storedSplashEnabled = await getStoredBooleanFromPreferences(SPLASH_ENABLED_KEY, true);
      setSplashEnabledState(storedSplashEnabled);

      setIsLoaded(true);
    };
    loadSettings();
  }, []);

  // Apply effective theme to DOM
  useEffect(() => {
    if (!isLoaded) return;
    document.documentElement.classList.toggle('dark', effectiveTheme === 'dark');
  }, [effectiveTheme, isLoaded]);

  // Listen for system theme changes when using 'system' preference
  useEffect(() => {
    if (!isLoaded || theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      setEffectiveTheme(getSystemTheme());
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, isLoaded]);

  // Persist theme changes to Capacitor Preferences
  useEffect(() => {
    if (!isLoaded) return;
    Preferences.set({ key: THEME_KEY, value: theme }).catch(error => {
      console.error('Failed to save theme to Preferences:', error);
      // Fallback to localStorage
      localStorage.setItem(THEME_KEY, theme);
    });
  }, [theme, isLoaded]);

  // Persist and apply animation changes
  useEffect(() => {
    if (!isLoaded) return;
    setStoredBooleanToPreferences(ANIMATION_KEY, animationEnabled);
    localStorage.setItem(ANIMATION_KEY, animationEnabled.toString());
    applyAnimationClass(animationEnabled);
  }, [animationEnabled, isLoaded]);

  useEffect(() => {
    localStorage.setItem(GREETING_KEY, greetingEnabled.toString());
    localStorage.removeItem(LEGACY_GREETING_KEY);
  }, [greetingEnabled]);

  // Persist splash greeting changes to Preferences
  useEffect(() => {
    if (!isLoaded) return;
    setStoredBooleanToPreferences(SPLASH_GREETING_KEY, splashGreetingEnabled);
    localStorage.setItem(SPLASH_GREETING_KEY, splashGreetingEnabled.toString());
  }, [splashGreetingEnabled, isLoaded]);

  // Persist splash enabled changes to Preferences
  useEffect(() => {
    if (!isLoaded) return;
    setStoredBooleanToPreferences(SPLASH_ENABLED_KEY, splashEnabled);
    localStorage.setItem(SPLASH_ENABLED_KEY, splashEnabled.toString());
  }, [splashEnabled, isLoaded]);

  const setTheme = (nextTheme: ThemePreference) => {
    setThemeState(nextTheme);
    setEffectiveTheme(getEffectiveTheme(nextTheme));
  };
  const toggleTheme = () => {
    const newTheme: ThemePreference = effectiveTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
  };
  const setAnimationEnabled = (enabled: boolean) => setAnimationEnabledState(enabled);
  const toggleAnimation = () => setAnimationEnabledState((prev) => !prev);
  const setGreetingEnabled = (enabled: boolean) => setGreetingEnabledState(enabled);
  const toggleGreeting = () => setGreetingEnabledState((prev) => !prev);
  const setSplashGreetingEnabled = (enabled: boolean) => setSplashGreetingEnabledState(enabled);
  const toggleSplashGreeting = () => setSplashGreetingEnabledState((prev) => !prev);
  const setSplashEnabled = (enabled: boolean) => setSplashEnabledState(enabled);
  const toggleSplash = () => setSplashEnabledState((prev) => !prev);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    theme,
    effectiveTheme,
    setTheme,
    toggleTheme,
    animationEnabled,
    setAnimationEnabled,
    toggleAnimation,
    greetingEnabled,
    setGreetingEnabled,
    toggleGreeting,
    splashGreetingEnabled,
    setSplashGreetingEnabled,
    toggleSplashGreeting,
    splashEnabled,
    setSplashEnabled,
    toggleSplash,
  }), [
    theme,
    effectiveTheme,
    animationEnabled,
    greetingEnabled,
    splashGreetingEnabled,
    splashEnabled,
  ]);

  return (
    <SettingsContext.Provider value={contextValue}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return context;
};
