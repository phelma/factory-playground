import { beforeEach, describe, expect, it } from "vitest";

import { openDatabase } from "./db";
import { createSqliteTodoStore, type TodoStore } from "./store";

let store: TodoStore;

beforeEach(() => {
  store = createSqliteTodoStore(openDatabase(":memory:"));
});

describe("sqlite todo store", () => {
  it("starts empty", async () => {
    await expect(store.list()).resolves.toEqual([]);
  });

  it("creates a todo and lists it", async () => {
    const created = await store.create({ title: "Buy milk", priority: "medium" });
    expect(created).toMatchObject({ id: 1, title: "Buy milk", done: false, priority: "medium" });

    const list = await store.list();
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ id: 1, title: "Buy milk" });
  });

  it("lists todos in id order", async () => {
    await store.create({ title: "First", priority: "low" });
    await store.create({ title: "Second", priority: "high" });
    const list = await store.list();
    expect(list.map((todo) => todo.title)).toEqual(["First", "Second"]);
  });

  it("marks a todo as done", async () => {
    await store.create({ title: "Buy milk", priority: "medium" });
    const updated = await store.update(1, { done: true });
    expect(updated).toMatchObject({ id: 1, done: true });
  });

  it("renames a todo and updates its priority", async () => {
    await store.create({ title: "Buy milk", priority: "medium" });
    const updated = await store.update(1, { title: "Buy oat milk", priority: "low" });
    expect(updated).toMatchObject({ id: 1, title: "Buy oat milk", priority: "low", done: false });
  });

  it("returns null for an unknown todo", async () => {
    await expect(store.update(99, { done: true })).resolves.toBeNull();
  });
});
