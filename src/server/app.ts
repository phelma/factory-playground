import { Hono } from "hono";

import { normaliseTitle, type Todo } from "../shared/todo";
import type { Database } from "./db";

type TodoRow = {
  id: number;
  title: string;
  done: number;
  created_at: string;
};

function rowToTodo(row: TodoRow): Todo {
  return {
    id: row.id,
    title: row.title,
    done: row.done === 1,
    createdAt: row.created_at,
  };
}

export function createApp(db: Database) {
  const app = new Hono();

  const selectAll = db.prepare("SELECT * FROM todos ORDER BY id");
  const selectOne = db.prepare("SELECT * FROM todos WHERE id = ?");
  const insert = db.prepare("INSERT INTO todos (title) VALUES (?)");
  const updateDone = db.prepare("UPDATE todos SET done = ? WHERE id = ?");

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

    const result = insert.run(title);
    return c.json(findTodo(Number(result.lastInsertRowid)), 201);
  });

  app.patch("/api/todos/:id", async (c) => {
    const id = Number(c.req.param("id"));
    const body = await c.req.json().catch(() => ({}));
    if (typeof body.done !== "boolean") return c.json({ error: "done must be a boolean" }, 400);

    const result = updateDone.run(body.done ? 1 : 0, id);
    if (result.changes === 0) return c.json({ error: "not found" }, 404);
    return c.json(findTodo(id));
  });

  return app;
}
