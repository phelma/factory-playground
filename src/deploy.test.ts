import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const root = new URL("../", import.meta.url);

function readRepo(relative: string): string {
  return readFileSync(new URL(relative, root), "utf8");
}

describe("deploy slice", () => {
  it("declares the Worker entry, client assets, and managed store binding", () => {
    const wrangler = readRepo("wrangler.toml");
    expect(wrangler).toContain('main = "src/server/worker.ts"');
    expect(wrangler).toContain('directory = "./dist"');
    expect(wrangler).toContain("single-page-application");
    expect(wrangler).toContain('"/api/*"');
    expect(wrangler).toContain('binding = "DB"');
    expect(wrangler).toContain('migrations_dir = "migrations"');
    expect(wrangler).toContain("nodejs_compat");
  });

  it("runs local development against the simulated store without the legacy serve path", () => {
    const pkg = JSON.parse(readRepo("package.json")) as {
      scripts: Record<string, string>;
      dependencies: Record<string, string>;
    };
    expect(pkg.scripts.dev ?? "").toContain("wrangler dev");
    expect(pkg.scripts.dev ?? "").toContain("migrate");
    expect(pkg.scripts.migrate ?? "").toContain("--local");
    expect(JSON.stringify(pkg.scripts)).not.toContain("src/server/index.ts");
    expect(Object.keys(pkg.dependencies)).not.toContain("@hono/node-server");
    expect(existsSync(new URL("src/server/index.ts", root))).toBe(false);
    expect(existsSync(new URL("src/server/db.ts", root))).toBe(false);
  });

  it("records the hosting and store decision alongside the domain docs", () => {
    const decision = readRepo("docs/adr-001-workers-d1.md");
    expect(decision).toContain("Cloudflare Workers");
    expect(decision).toContain("D1");
    expect(decision).toContain("Fly");
    expect(decision).toContain("Render");
    expect(decision.toLowerCase()).toContain("lock-in");
    const domain = readRepo("docs/domain.md");
    expect(domain).toContain("Priority");
  });
});
