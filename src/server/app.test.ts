import { beforeEach, describe, expect, it } from "vitest";

import { createApp } from "./app";
import { createFakeD1 } from "./fake-d1";
import { createD1TodoStore, type D1DatabaseBinding } from "./store";

describe("todos API", () => {
  let app: ReturnType<typeof createApp>;
  let fake: D1DatabaseBinding;

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
    fake = createFakeD1();
    // Per-request async store resolution, mirroring src/server/worker.ts
    // which builds the D1 store from the Worker's DB binding.
    app = createApp(() => createD1TodoStore(fake));
  });

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

  it("trims the title when creating", async () => {
    const created = await post("  Buy milk  ");
    expect(created.status).toBe(201);
    expect(await created.json()).toMatchObject({ title: "Buy milk" });
  });

  it("rejects a blank title", async () => {
    const res = await post("   ");
    expect(res.status).toBe(400);
  });

  it("rejects an empty or missing title", async () => {
    expect((await post("")).status).toBe(400);
    const missing = await app.request("/api/todos", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(missing.status).toBe(400);
  });

  it("rejects a non-string title", async () => {
    expect((await post(42)).status).toBe(400);
  });

  it("rejects an over-long title", async () => {
    expect((await post("x".repeat(201))).status).toBe(400);
  });

  it("accepts a title at the length limit", async () => {
    const created = await post("x".repeat(200));
    expect(created.status).toBe(201);
  });

  it("leaves the store unchanged after a rejected create", async () => {
    expect((await post("   ")).status).toBe(400);
    expect(await (await app.request("/api/todos")).json()).toEqual([]);
  });

  it("marks a todo as done and un-done", async () => {
    await post("Buy milk");
    const done = await patch(1, { done: true });
    expect(done.status).toBe(200);
    expect(await done.json()).toMatchObject({ id: 1, done: true });

    const undone = await patch(1, { done: false });
    expect(undone.status).toBe(200);
    expect(await undone.json()).toMatchObject({ id: 1, done: false });
  });

  it("rejects a non-boolean done flag", async () => {
    await post("Buy milk");
    expect((await patch(1, { done: "yes" })).status).toBe(400);
    expect((await patch(1, { done: 1 })).status).toBe(400);
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

  it("rejects an over-long or non-string title when renaming", async () => {
    await post("Buy milk");
    expect((await patch(1, { title: "x".repeat(201) })).status).toBe(400);
    expect((await patch(1, { title: 42 })).status).toBe(400);
  });

  it("returns 404 for an unknown todo", async () => {
    const res = await patch(99, { done: true });
    expect(res.status).toBe(404);
  });

  it("returns 404 when renaming or reprioritising an unknown todo", async () => {
    expect((await patch(99, { title: "Nope" })).status).toBe(404);
    expect((await patch(99, { priority: "low" })).status).toBe(404);
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

  it("creates todos with low and medium priorities", async () => {
    expect(await (await post("Low", "low")).json()).toMatchObject({ priority: "low" });
    expect(await (await post("Medium", "medium")).json()).toMatchObject({ priority: "medium" });
  });

  it("rejects an invalid priority when creating", async () => {
    const res = await post("Buy milk", "urgent");
    expect(res.status).toBe(400);
  });

  it("rejects an empty or non-string priority when creating", async () => {
    expect((await post("Buy milk", "")).status).toBe(400);
    expect((await post("Buy milk", 1)).status).toBe(400);
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

  it("rejects an empty patch", async () => {
    await post("Buy milk");
    expect((await patch(1, {})).status).toBe(400);
  });

  it("shares writes across requests on the same store", async () => {
    await post("First", "low");
    await post("Second", "high");
    await patch(1, { done: true });

    const list = await (await app.request("/api/todos")).json();
    expect(list).toMatchObject([
      { id: 1, title: "First", done: true, priority: "low" },
      { id: 2, title: "Second", done: false, priority: "high" },
    ]);
  });
});
