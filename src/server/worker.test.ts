import { describe, expect, it } from "vitest";

import type { D1DatabaseBinding, D1PreparedStatement } from "./store";
import worker, { type WorkerEnv } from "./worker";

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
            return { meta: { last_row_id: id, changes: 1 } };
          }
          throw new Error(`unsupported query: ${sql}`);
        },
      };
      return stmt;
    },
  };
}

function env(): WorkerEnv {
  return { DB: createFakeD1() };
}

describe("worker entry", () => {
  it("serves the todo API from the Worker fetch entry with a D1 binding", async () => {
    const res = await worker.fetch(new Request("http://localhost/api/todos"), env());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it("persists writes through the Worker across requests on the same binding", async () => {
    const binding = env();
    const created = await worker.fetch(
      new Request("http://localhost/api/todos", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: "Buy milk", priority: "high" }),
      }),
      binding,
    );
    expect(created.status).toBe(201);
    expect(await created.json()).toMatchObject({ title: "Buy milk", priority: "high" });

    const listed = await worker.fetch(new Request("http://localhost/api/todos"), binding);
    expect(await listed.json()).toMatchObject([{ title: "Buy milk" }]);
  });

  it("keeps validation behaviour through the Worker entry", async () => {
    const binding = env();
    const res = await worker.fetch(
      new Request("http://localhost/api/todos", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: "   " }),
      }),
      binding,
    );
    expect(res.status).toBe(400);
  });
});
