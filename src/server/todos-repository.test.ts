import { describe, expect, it } from "vitest";

import { openDatabase } from "./db";
import { createTodosRepository } from "./todos-repository";

describe("todos repository", () => {
  it("starts empty", () => {
    const repo = createTodosRepository(openDatabase(":memory:"));
    expect(repo.list()).toEqual([]);
    expect(repo.find(1)).toBeNull();
  });

  it("creates a todo and lists it", () => {
    const repo = createTodosRepository(openDatabase(":memory:"));
    const created = repo.create("Buy milk");
    expect(created).toMatchObject({ id: 1, title: "Buy milk", done: false });

    expect(repo.list()).toHaveLength(1);
    expect(repo.find(1)).toMatchObject({ id: 1, title: "Buy milk" });
  });

  it("marks a todo as done and un-done", () => {
    const repo = createTodosRepository(openDatabase(":memory:"));
    repo.create("Buy milk");

    expect(repo.setDone(1, true)).toMatchObject({ id: 1, done: true });
    expect(repo.setDone(1, false)).toMatchObject({ id: 1, done: false });
  });

  it("returns null for an unknown todo", () => {
    const repo = createTodosRepository(openDatabase(":memory:"));
    expect(repo.find(99)).toBeNull();
    expect(repo.setDone(99, true)).toBeNull();
  });
});
