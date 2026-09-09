import { describe, expect, it } from "vitest";

import { createFakeD1 } from "./fake-d1";
import worker from "./worker";

describe("worker entry", () => {
  it("lists the managed-store contents as JSON (empty on first deploy)", async () => {
    const res = await worker.fetch(new Request("https://example.com/api/todos"), {
      DB: createFakeD1(),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");
    expect(await res.json()).toEqual([]);
  });

  it("never returns the client shell for API routes", async () => {
    const res = await worker.fetch(new Request("https://example.com/api/does-not-exist"), {
      DB: createFakeD1(),
    });
    expect(res.headers.get("content-type") ?? "").not.toContain("text/html");
    expect(await res.text()).not.toContain("<div id=\"root\">");
  });
});
