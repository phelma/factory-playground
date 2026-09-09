import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { beforeEach, describe, expect, it } from "vitest";

import { createD1TodoStore, type D1Database } from "./d1-store";
import { createFakeD1 } from "./fake-d1";
import type { TodoStore } from "./store";

const MIGRATION_URL = new URL("../../migrations/0001_create_todos.sql", import.meta.url);

let db: D1Database;
let store: TodoStore;

beforeEach(() => {
  db = createFakeD1();
  store = createD1TodoStore(db);
});

describe("D1 todo store", () => {
  it("starts empty on a fresh managed store", async () => {
    await expect(store.list()).resolves.toEqual([]);
  });

  it("lists what was written to the managed store in id order", async () => {
    await store.create({ title: "First", priority: "low" });
    await store.create({ title: "Second", priority: "high" });
    const list = await store.list();
    expect(list.map((todo) => todo.title)).toEqual(["First", "Second"]);
  });

  it("applies the initial schema migration cleanly", () => {
    const sql = readFileSync(MIGRATION_URL, "utf8");
    const sqlite = new DatabaseSync(":memory:");
    sqlite.exec(sql);
    const columns = sqlite.prepare("PRAGMA table_info(todos)").all() as { name: string }[];
    expect(columns.map((column) => column.name)).toEqual([
      "id",
      "title",
      "done",
      "priority",
      "created_at",
    ]);
    sqlite.close();
  });
});
