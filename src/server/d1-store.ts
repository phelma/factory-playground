import { normalisePriority, type Priority, type Todo } from "../shared/todo";
import type { TodoPatch, TodoStore } from "./store";

/**
 * Minimal structural view of the Cloudflare D1 binding surface we use.
 * It mirrors the async prepare-bind-run contract of the real `D1Database`
 * so tests can substitute a fake without reaching into binding internals.
 */
export type D1Row = Record<string, unknown>;

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  all<T extends D1Row = D1Row>(): Promise<{ results: T[] }>;
  first<T extends D1Row = D1Row>(column?: string): Promise<T | null>;
  run(): Promise<{ meta: { last_row_id: number; changes: number } }>;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

function rowToTodo(row: D1Row): Todo {
  return {
    id: row["id"] as number,
    title: row["title"] as string,
    done: (row["done"] as number) === 1,
    priority: normalisePriority(row["priority"]) ?? "medium",
    createdAt: row["created_at"] as string,
  };
}

async function findTodo(db: D1Database, id: number): Promise<Todo | null> {
  const row = await db.prepare("SELECT * FROM todos WHERE id = ?").bind(id).first();
  return row ? rowToTodo(row) : null;
}

export function createD1TodoStore(db: D1Database): TodoStore {
  return {
    async list(): Promise<Todo[]> {
      const { results } = await db.prepare("SELECT * FROM todos ORDER BY id").all();
      return results.map(rowToTodo);
    },

    async create(input: { title: string; priority: Priority }): Promise<Todo> {
      const outcome = await db
        .prepare("INSERT INTO todos (title, priority) VALUES (?, ?)")
        .bind(input.title, input.priority)
        .run();
      const created = await findTodo(db, outcome.meta.last_row_id);
      if (created === null) throw new Error("failed to read back created todo");
      return created;
    },

    async update(id: number, patch: TodoPatch): Promise<Todo | null> {
      const sets: string[] = [];
      const values: unknown[] = [];
      if (patch.title !== undefined) {
        sets.push("title = ?");
        values.push(patch.title);
      }
      if (patch.done !== undefined) {
        sets.push("done = ?");
        values.push(patch.done ? 1 : 0);
      }
      if (patch.priority !== undefined) {
        sets.push("priority = ?");
        values.push(patch.priority);
      }
      if (sets.length === 0) return findTodo(db, id);
      const outcome = await db
        .prepare(`UPDATE todos SET ${sets.join(", ")} WHERE id = ?`)
        .bind(...values, id)
        .run();
      if (outcome.meta.changes === 0) return null;
      return findTodo(db, id);
    },
  };
}
