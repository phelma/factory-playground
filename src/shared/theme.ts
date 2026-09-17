export type ThemePreference = "system" | "light" | "dark";

export type EffectiveTheme = "light" | "dark";

export function parseThemePreference(raw: unknown): ThemePreference {
  return raw === "system" || raw === "light" || raw === "dark" ? raw : "system";
}

export function resolveTheme(
  preference: ThemePreference,
  osTheme: EffectiveTheme,
): EffectiveTheme {
  return preference === "system" ? osTheme : preference;
}

export const THEME_STORAGE_KEY = "theme-preference";

export function readThemePreference(storage: {
  getItem(key: string): string | null;
}): ThemePreference {
  try {
    return parseThemePreference(storage.getItem(THEME_STORAGE_KEY));
  } catch {
    return "system";
  }
}

export function writeThemePreference(
  storage: { setItem(key: string, value: string): void },
  preference: ThemePreference,
): void {
  try {
    storage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Storage can throw (e.g. private mode); the theme still applies in memory.
  }
}
