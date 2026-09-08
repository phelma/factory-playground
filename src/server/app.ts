import { Hono } from "hono";

import { normalisePriority, normaliseTitle, type Priority, type Todo } from "../shared/todo";
import type { Database } from "./db";

type TodoRow = {
  id: number;
  title: string;
  done: number;
  priority: string;
  created_at: string;
};

function rowToTodo(row: TodoRow): Todo {
  return {
    id: row.id,
    title: row.title,
    done: row.done === 1,
    priority: normalisePriority(row.priority) ?? "medium",
    createdAt: row.created_at,
  };
}

export function createApp(db: Database) {
  const app = new Hono();

  const selectAll = db.prepare("SELECT * FROM todos ORDER BY id");
  const selectOne = db.prepare("SELECT * FROM todos WHERE id = ?");
  const insert = db.prepare("INSERT INTO todos (title, priority) VALUES (?, ?)");

  const findTodo = (id: number): Todo | null => {
    const row = selectOne.get(id) as TodoRow | undefined;
    return row ? rowToTodo(row) : null;
  };

  app.get("/api/todos", (c) => {
    const rows = selectAll.all() as TodoRow[];
    return c.json(rows.map(rowToTodo));
  });

  app.post("/api/todos", async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const title = normaliseTitle(body.title);
    if (title === null) return c.json({ error: "title is required" }, 400);

    let priority: Priority = "medium";
    if ("priority" in body) {
      const parsed = normalisePriority(body.priority);
      if (parsed === null) return c.json({ error: "priority is invalid" }, 400);
      priority = parsed;
    }

    const result = insert.run(title, priority);
    return c.json(findTodo(Number(result.lastInsertRowid)), 201);
  });

  app.patch("/api/todos/:id", async (c) => {
    const id = Number(c.req.param("id"));
    const body = await c.req.json().catch(() => ({}));
    const hasDone = body !== null && typeof body === "object" && "done" in body;
    const hasTitle = body !== null && typeof body === "object" && "title" in body;
    const hasPriority =
      body !== null && typeof body === "object" && "priority" in body;
    if (!hasDone && !hasTitle && !hasPriority) {
      return c.json({ error: "done, title or priority is required" }, 400);
    }

    let title: string | null = null;
    if (hasTitle) {
      title = normaliseTitle(body.title);
      if (title === null) return c.json({ error: "title is invalid" }, 400);
    }
    if (hasDone && typeof body.done !== "boolean") {
      return c.json({ error: "done must be a boolean" }, 400);
    }
    let priority: Priority | null = null;
    if (hasPriority) {
      priority = normalisePriority(body.priority);
      if (priority === null) return c.json({ error: "priority is invalid" }, 400);
    }

    const sets: string[] = [];
    const values: (string | number)[] = [];
    if (hasTitle) {
      sets.push("title = ?");
      values.push(title as string);
    }
    if (hasDone) {
      sets.push("done = ?");
      values.push(body.done ? 1 : 0);
    }
    if (hasPriority) {
      sets.push("priority = ?");
      values.push(priority as string);
    }
    values.push(id);
    const result = db.prepare(`UPDATE todos SET ${sets.join(", ")} WHERE id = ?`).run(...values);
    if (result.changes === 0) return c.json({ error: "not found" }, 404);
    return c.json(findTodo(id));
  });

  return app;
}
