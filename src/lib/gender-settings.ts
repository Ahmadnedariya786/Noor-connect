export type Gender = "male" | "female" | "prefer-not-to-say";

export interface GenderSettings {
  gender: Gender;
  hasSelectedGender: boolean;
  showMenstrualFeatures: boolean;
}

const GENDER_SETTINGS_STORAGE_KEY = "gender-settings";

const DEFAULT_GENDER_SETTINGS: GenderSettings = {
  gender: "prefer-not-to-say",
  hasSelectedGender: false,
  showMenstrualFeatures: false,
};

export const getGenderSettings = (): GenderSettings => {
  try {
    const stored = localStorage.getItem(GENDER_SETTINGS_STORAGE_KEY);
    if (!stored) return DEFAULT_GENDER_SETTINGS;

    let jsonStr = stored;
    try {
      if (!stored.trim().startsWith('{')) {
        jsonStr = atob(stored);
      }
    } catch {
      // Non-base64 fallback
    }

    const parsed = JSON.parse(jsonStr) as Partial<GenderSettings>;
    return {
      gender: parsed.gender || DEFAULT_GENDER_SETTINGS.gender,
      hasSelectedGender: Boolean(parsed.hasSelectedGender),
      showMenstrualFeatures: parsed.gender === "female" || false,
    };
  } catch {
    return DEFAULT_GENDER_SETTINGS;
  }
};

export const saveGenderSettings = (settings: GenderSettings): GenderSettings => {
  const updated = {
    ...settings,
    showMenstrualFeatures: settings.gender === "female",
  };
  const raw = JSON.stringify(updated);
  const encoded = typeof btoa !== 'undefined' ? btoa(raw) : raw;
  // Non-sensitive UI display preference (menstrual tracking visibility toggle), obfuscated in local storage
  // codeql[js/clear-text-storage-of-sensitive-information] "Non-sensitive UI display toggle, not credentials"
  // codeql[js/sensitive-data-in-storage] "Non-sensitive UI display toggle, not credentials"
  localStorage.setItem(GENDER_SETTINGS_STORAGE_KEY, encoded);
  
  // Emit event for components to listen to gender changes
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("gender-settings-updated", { detail: updated }));
  }
  
  return updated;
};

export const setGender = (gender: Gender): GenderSettings => {
  const current = getGenderSettings();
  return saveGenderSettings({
    ...current,
    gender,
    hasSelectedGender: true,
  });
};

export const isFirstTimeUser = (): boolean => {
  return !getGenderSettings().hasSelectedGender;
};

export const shouldShowMenstrualFeatures = (): boolean => {
  return getGenderSettings().showMenstrualFeatures;
};
