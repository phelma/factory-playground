import { describe, expect, it } from "vitest";

import {
  parseThemePreference,
  readThemePreference,
  resolveTheme,
  THEME_STORAGE_KEY,
  writeThemePreference,
} from "./theme";

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

describe("theme preference storage", () => {
  const memoryStorage = (initial: Record<string, string> = {}) => {
    const data = { ...initial };
    return {
      getItem: (key: string) => (key in data ? data[key]! : null),
      setItem: (key: string, value: string) => {
        data[key] = value;
      },
      data,
    };
  };

  it("reads a stored preference through the shared parser", () => {
    expect(readThemePreference(memoryStorage({ [THEME_STORAGE_KEY]: "dark" }))).toBe("dark");
    expect(readThemePreference(memoryStorage({ [THEME_STORAGE_KEY]: "light" }))).toBe("light");
    expect(readThemePreference(memoryStorage({ [THEME_STORAGE_KEY]: "system" }))).toBe("system");
  });

  it("falls back to system when nothing is stored or the value is corrupt", () => {
    expect(readThemePreference(memoryStorage())).toBe("system");
    expect(readThemePreference(memoryStorage({ [THEME_STORAGE_KEY]: "midnight" }))).toBe(
      "system",
    );
    expect(readThemePreference(memoryStorage({ [THEME_STORAGE_KEY]: "" }))).toBe("system");
  });

  it("falls back to system when storage throws, without throwing", () => {
    const broken = {
      getItem: () => {
        throw new Error("denied");
      },
    };
    expect(() => readThemePreference(broken)).not.toThrow();
    expect(readThemePreference(broken)).toBe("system");
  });

  it("writes the preference under a single key", () => {
    const storage = memoryStorage();
    writeThemePreference(storage, "dark");
    expect(storage.data[THEME_STORAGE_KEY]).toBe("dark");
    writeThemePreference(storage, "light");
    expect(storage.data[THEME_STORAGE_KEY]).toBe("light");
    expect(Object.keys(storage.data)).toEqual([THEME_STORAGE_KEY]);
  });

  it("ignores storage write failures", () => {
    const broken = {
      setItem: () => {
        throw new Error("denied");
      },
    };
    expect(() => writeThemePreference(broken, "dark")).not.toThrow();
  });
});
