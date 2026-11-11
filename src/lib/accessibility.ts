export type FontScale = "normal" | "large" | "largest";

export type AccessibilityPreferences = {
  darkTheme: boolean;
  fontScale: FontScale;
  highContrast: boolean;
  reduceMotion: boolean;
  underlineLinks: boolean;
  spaciousSpacing: boolean;
  largeTargets: boolean;
};

const STORAGE_KEY = "proterra-accessibility-preferences";

export const DEFAULT_ACCESSIBILITY_PREFERENCES: AccessibilityPreferences = {
  darkTheme: true,
  fontScale: "normal",
  highContrast: false,
  reduceMotion: false,
  underlineLinks: false,
  spaciousSpacing: false,
  largeTargets: false,
};

export function readAccessibilityPreferences(): AccessibilityPreferences {
  if (typeof window === "undefined") return DEFAULT_ACCESSIBILITY_PREFERENCES;

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_ACCESSIBILITY_PREFERENCES;
    const parsed = JSON.parse(stored) as Partial<AccessibilityPreferences>;
    const fontScale = parsed.fontScale;
    return {
      darkTheme: parsed.darkTheme !== false,
      fontScale: fontScale === "large" || fontScale === "largest" ? fontScale : "normal",
      highContrast: parsed.highContrast === true,
      reduceMotion: parsed.reduceMotion === true,
      underlineLinks: parsed.underlineLinks === true,
      spaciousSpacing: parsed.spaciousSpacing === true,
      largeTargets: parsed.largeTargets === true,
    };
  } catch {
    return DEFAULT_ACCESSIBILITY_PREFERENCES;
  }
}

export function applyAccessibilityPreferences(preferences: AccessibilityPreferences) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("dark", preferences.darkTheme);
  root.dataset.fontScale = preferences.fontScale;
  root.dataset.highContrast = String(preferences.highContrast);
  root.dataset.reduceMotion = String(preferences.reduceMotion);
  root.dataset.underlineLinks = String(preferences.underlineLinks);
  root.dataset.spaciousSpacing = String(preferences.spaciousSpacing);
  root.dataset.largeTargets = String(preferences.largeTargets);
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
