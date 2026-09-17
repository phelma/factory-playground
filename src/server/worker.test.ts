import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";

import type { D1DatabaseBinding, D1PreparedStatement } from "./store";
import worker from "./worker";

const MIGRATION_URL = new URL("../../migrations/0001_create_todos.sql", import.meta.url);

function createEmptyD1(): D1DatabaseBinding {
  return {
    prepare(): D1PreparedStatement {
      const stmt: D1PreparedStatement = {
        bind: () => stmt,
        all: async <T>() => ({ results: [] as T[] }),
        first: async () => null,
        run: async () => ({ meta: { last_row_id: 0, changes: 0 } }),
      };
      return stmt;
    },
  };
}

describe("worker entry", () => {
  it("lists the managed-store contents as JSON (empty on first deploy)", async () => {
    const res = await worker.fetch(new Request("https://example.com/api/todos"), {
      DB: createEmptyD1(),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");
    expect(await res.json()).toEqual([]);
  });

  it("never returns the client shell for API routes", async () => {
    const res = await worker.fetch(new Request("https://example.com/api/does-not-exist"), {
      DB: createEmptyD1(),
    });
    expect(res.headers.get("content-type") ?? "").not.toContain("text/html");
    expect(await res.text()).not.toContain('<div id="root">');
  });

  it("applies the initial schema migration cleanly", () => {
    const sqlite = new DatabaseSync(":memory:");
    sqlite.exec(readFileSync(MIGRATION_URL, "utf8"));
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
