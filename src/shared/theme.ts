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
