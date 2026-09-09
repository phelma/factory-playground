import { describe, expect, it } from "vitest";

import { createFakeD1 } from "./fake-d1";
import worker from "./worker";

describe("worker entry", () => {
  it("serves the Todo API from the DB binding", async () => {
    const fake = createFakeD1();

    const empty = await worker.request("/api/todos", {}, { DB: fake });
    expect(empty.status).toBe(200);
    expect(await empty.json()).toEqual([]);

    const created = await worker.request(
      "/api/todos",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: "Buy milk" }),
      },
      { DB: fake },
    );
    expect(created.status).toBe(201);
    expect(await created.json()).toMatchObject({ title: "Buy milk", priority: "medium" });
  });

  it("rejects invalid input through the Worker binding", async () => {
    const fake = createFakeD1();
    const res = await worker.request(
      "/api/todos",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: "   " }),
      },
      { DB: fake },
    );
    expect(res.status).toBe(400);
  });
});
