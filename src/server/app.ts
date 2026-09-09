import { Hono, type Context } from "hono";

import { normalisePriority, normaliseTitle, type Priority } from "../shared/todo";
import type { TodoStore } from "./store";

export type StoreResolver = TodoStore | ((c: Context) => TodoStore | Promise<TodoStore>);

async function resolveStore(resolver: StoreResolver, c: Context): Promise<TodoStore> {
  return typeof resolver === "function" ? await resolver(c) : resolver;
}

export function createApp(store: StoreResolver) {
  const app = new Hono();

  app.get("/api/todos", async (c) => {
    return c.json(await (await resolveStore(store, c)).list());
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

    return c.json(await (await resolveStore(store, c)).create({ title, priority }), 201);
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

    const updated = await (await resolveStore(store, c)).update(id, {
      ...(hasTitle ? { title: title as string } : {}),
      ...(hasDone ? { done: body.done as boolean } : {}),
      ...(hasPriority ? { priority: priority as Priority } : {}),
    });
    if (updated === null) return c.json({ error: "not found" }, 404);
    return c.json(updated);
  });

  return app;
}
