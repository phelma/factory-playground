import { beforeEach, describe, expect, it } from "vitest";

import {
  createD1TodoStore,
  type D1DatabaseBinding,
  type D1PreparedStatement,
  type TodoStore,
} from "./store";

type FakeRow = {
  id: number;
  title: string;
  done: number;
  priority: string;
  created_at: string;
};

function createFakeD1(): D1DatabaseBinding {
  const rows = new Map<number, FakeRow>();
  let nextId = 1;

  return {
    prepare(sql: string): D1PreparedStatement {
      const params: unknown[] = [];
      const stmt: D1PreparedStatement = {
        bind(...values: unknown[]) {
          params.push(...values);
          return stmt;
        },
        async all<T>() {
          if (sql.includes("ORDER BY id")) {
            const results = [...rows.values()].sort((a, b) => a.id - b.id);
            return { results: results as unknown as T[] };
          }
          throw new Error(`unsupported query: ${sql}`);
        },
        async first<T>() {
          const row = rows.get(params[0] as number) ?? null;
          return (row as unknown as T | null) ?? null;
        },
        async run() {
          if (sql.startsWith("INSERT INTO todos")) {
            const id = nextId++;
            rows.set(id, {
              id,
              title: params[0] as string,
              done: 0,
              priority: params[1] as string,
              created_at: new Date().toISOString(),
            });
            return { meta: { last_row_id: id, changes: 1 } };
          }
          if (sql.startsWith("UPDATE todos SET")) {
            const id = params[params.length - 1] as number;
            const row = rows.get(id);
            if (!row) return { meta: { last_row_id: 0, changes: 0 } };
            const setClause = sql.slice("UPDATE todos SET ".length, sql.indexOf(" WHERE id"));
            const columns = setClause.split(", ").map((part) => part.split(" = ")[0]);
            columns.forEach((column, index) => {
              const value = params[index];
              if (column === "title") row.title = value as string;
              else if (column === "done") row.done = value as number;
              else if (column === "priority") row.priority = value as string;
            });
            return { meta: { last_row_id: id, changes: 1 } };
          }
          throw new Error(`unsupported query: ${sql}`);
        },
      };
      return stmt;
    },
  };
}

describe("d1 todo store", () => {
  let store: TodoStore;

  beforeEach(() => {
    store = createD1TodoStore(createFakeD1());
  });

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
