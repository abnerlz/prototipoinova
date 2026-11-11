export type AccessibilityPreferences = {
  largeText: boolean;
  highContrast: boolean;
  reduceMotion: boolean;
  underlineLinks: boolean;
};

const STORAGE_KEY = "proterra-accessibility-preferences";

export const DEFAULT_ACCESSIBILITY_PREFERENCES: AccessibilityPreferences = {
  largeText: false,
  highContrast: false,
  reduceMotion: false,
  underlineLinks: false,
};

export function readAccessibilityPreferences(): AccessibilityPreferences {
  if (typeof window === "undefined") return DEFAULT_ACCESSIBILITY_PREFERENCES;

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_ACCESSIBILITY_PREFERENCES;
    const parsed = JSON.parse(stored) as Partial<AccessibilityPreferences>;
    return {
      largeText: parsed.largeText === true,
      highContrast: parsed.highContrast === true,
      reduceMotion: parsed.reduceMotion === true,
      underlineLinks: parsed.underlineLinks === true,
    };
  } catch {
    return DEFAULT_ACCESSIBILITY_PREFERENCES;
  }
}

export function applyAccessibilityPreferences(preferences: AccessibilityPreferences) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.dataset.fontSize = preferences.largeText ? "large" : "normal";
  root.dataset.highContrast = String(preferences.highContrast);
  root.dataset.reduceMotion = String(preferences.reduceMotion);
  root.dataset.underlineLinks = String(preferences.underlineLinks);
}

export function saveAccessibilityPreferences(preferences: AccessibilityPreferences) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // Preferences still apply for the current session when storage is unavailable.
  }
  window.dispatchEvent(new Event("proterra:accessibility-preferences"));
}
