import { describe, expect, it } from "vitest";

import { parseThemePreference, resolveTheme } from "./theme";

describe("parseThemePreference", () => {
  it("parses valid values to themselves", () => {
    expect(parseThemePreference("system")).toBe("system");
    expect(parseThemePreference("light")).toBe("light");
    expect(parseThemePreference("dark")).toBe("dark");
  });

  it("falls back to system for junk", () => {
    expect(parseThemePreference(undefined)).toBe("system");
    expect(parseThemePreference(null)).toBe("system");
    expect(parseThemePreference("")).toBe("system");
    expect(parseThemePreference("SYSTEM")).toBe("system");
    expect(parseThemePreference("midnight")).toBe("system");
    expect(parseThemePreference(42)).toBe("system");
    expect(parseThemePreference({})).toBe("system");
  });
});

describe("resolveTheme", () => {
  it("resolves system to the OS value", () => {
    expect(resolveTheme("system", "light")).toBe("light");
    expect(resolveTheme("system", "dark")).toBe("dark");
  });

  it("resolves light to itself regardless of the OS", () => {
    expect(resolveTheme("light", "light")).toBe("light");
    expect(resolveTheme("light", "dark")).toBe("light");
  });

  it("resolves dark to itself regardless of the OS", () => {
    expect(resolveTheme("dark", "light")).toBe("dark");
    expect(resolveTheme("dark", "dark")).toBe("dark");
  });
});
