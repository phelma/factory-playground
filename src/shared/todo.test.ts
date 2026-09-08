import { describe, expect, it } from "vitest";

import { normalisePriority, normaliseTitle, summarise, type Todo } from "./todo";

const todo = (id: number, done: boolean): Todo => ({
  id,
  title: `Todo ${id}`,
  done,
  priority: "medium",
  createdAt: "2026-09-08T00:00:00.000Z",
});

describe("normaliseTitle", () => {
  it("trims surrounding whitespace", () => {
    expect(normaliseTitle("  Buy milk  ")).toBe("Buy milk");
  });

  it("rejects empty and non-string input", () => {
    expect(normaliseTitle("   ")).toBeNull();
    expect(normaliseTitle(42)).toBeNull();
    expect(normaliseTitle(undefined)).toBeNull();
  });

  it("rejects titles over the length limit", () => {
    expect(normaliseTitle("x".repeat(201))).toBeNull();
    expect(normaliseTitle("x".repeat(200))).toHaveLength(200);
  });
});

describe("normalisePriority", () => {
  it("accepts low, medium and high", () => {
    expect(normalisePriority("low")).toBe("low");
    expect(normalisePriority("medium")).toBe("medium");
    expect(normalisePriority("high")).toBe("high");
  });

  it("rejects anything else", () => {
    expect(normalisePriority("urgent")).toBeNull();
    expect(normalisePriority("")).toBeNull();
    expect(normalisePriority(undefined)).toBeNull();
    expect(normalisePriority(1)).toBeNull();
  });
});

describe("summarise", () => {
  it("counts every todo", () => {
    expect(summarise([todo(1, false), todo(2, true)]).total).toBe(2);
  });

  it("reports zero for an empty list", () => {
    expect(summarise([])).toEqual({ total: 0, remaining: 0 });
  });

  it("counts only todos that are not done as remaining", () => {
    expect(summarise([todo(1, false), todo(2, true), todo(3, false)]).remaining).toBe(2);
  });

  it("reports zero remaining when every todo is done", () => {
    expect(summarise([todo(1, true), todo(2, true)])).toEqual({ total: 2, remaining: 0 });
  });
});
