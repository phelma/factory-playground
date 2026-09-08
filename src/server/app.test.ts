import { beforeEach, describe, expect, it } from "vitest";

import { createApp } from "./app";
import { openDatabase } from "./db";

let app: ReturnType<typeof createApp>;

const post = (title: unknown, priority?: unknown) =>
  app.request("/api/todos", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(
      priority === undefined ? { title } : { title, priority },
    ),
  });

const patch = (id: number, body: unknown) =>
  app.request(`/api/todos/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  app = createApp(openDatabase(":memory:"));
});

describe("todos API", () => {
  it("starts empty", async () => {
    const res = await app.request("/api/todos");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it("creates a todo and lists it", async () => {
    const created = await post("Buy milk");
    expect(created.status).toBe(201);
    expect(await created.json()).toMatchObject({ id: 1, title: "Buy milk", done: false });

    const list = await (await app.request("/api/todos")).json();
    expect(list).toHaveLength(1);
  });

  it("rejects a blank title", async () => {
    const res = await post("   ");
    expect(res.status).toBe(400);
  });

  it("marks a todo as done", async () => {
    await post("Buy milk");
    const res = await patch(1, { done: true });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ id: 1, done: true });
  });

  it("renames a todo", async () => {
    await post("Buy milk");
    const res = await patch(1, { title: "Buy oat milk" });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ id: 1, title: "Buy oat milk", done: false });
  });

  it("rejects an invalid title when renaming", async () => {
    await post("Buy milk");
    const res = await patch(1, { title: "   " });
    expect(res.status).toBe(400);
  });

  it("returns 404 for an unknown todo", async () => {
    const res = await patch(99, { done: true });
    expect(res.status).toBe(404);
  });

  it("defaults to medium priority", async () => {
    const created = await post("Buy milk");
    expect(created.status).toBe(201);
    expect(await created.json()).toMatchObject({ priority: "medium" });
  });

  it("creates a todo with a given priority", async () => {
    const created = await post("Buy milk", "high");
    expect(created.status).toBe(201);
    expect(await created.json()).toMatchObject({ title: "Buy milk", priority: "high" });
  });

  it("rejects an invalid priority when creating", async () => {
    const res = await post("Buy milk", "urgent");
    expect(res.status).toBe(400);
  });

  it("updates a todo's priority", async () => {
    await post("Buy milk");
    const res = await patch(1, { priority: "low" });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ id: 1, priority: "low" });
  });

  it("rejects an invalid priority when updating", async () => {
    await post("Buy milk");
    const res = await patch(1, { priority: "urgent" });
    expect(res.status).toBe(400);
  });

  it("rejects a patch with no known fields", async () => {
    await post("Buy milk");
    const res = await patch(1, { colour: "red" });
    expect(res.status).toBe(400);
  });
});
