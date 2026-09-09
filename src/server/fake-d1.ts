import type { D1DatabaseBinding, D1PreparedStatement } from "./store";

type FakeRow = {
  id: number;
  title: string;
  done: number;
  priority: string;
  created_at: string;
};

export function createFakeD1(): D1DatabaseBinding {
  const rows = new Map<number, FakeRow>();
  let nextId = 1;

  return {
    prepare(sql: string): D1PreparedStatement {
      const params: unknown[] = [];
      const stmt: D1PreparedStatement = {
        bind(...values: unknown[]) {
          params.push(...values);
          return stmt;
        },
        async all<T>() {
          if (sql.includes("ORDER BY id")) {
            const results = [...rows.values()].sort((a, b) => a.id - b.id);
            return { results: results as unknown as T[] };
          }
          throw new Error(`unsupported query: ${sql}`);
        },
        async first<T>() {
          const row = rows.get(params[0] as number) ?? null;
          return (row as unknown as T | null) ?? null;
        },
        async run() {
          if (sql.startsWith("INSERT INTO todos")) {
            const id = nextId++;
            rows.set(id, {
              id,
              title: params[0] as string,
              done: 0,
              priority: params[1] as string,
              created_at: new Date().toISOString(),
            });
            return { meta: { last_row_id: id, changes: 1 } };
          }
          if (sql.startsWith("UPDATE todos SET")) {
            const id = params[params.length - 1] as number;
            const row = rows.get(id);
            if (!row) return { meta: { last_row_id: 0, changes: 0 } };
            const setClause = sql.slice("UPDATE todos SET ".length, sql.indexOf(" WHERE id"));
            const columns = setClause.split(", ").map((part) => part.split(" = ")[0]);
            columns.forEach((column, index) => {
              const value = params[index];
              if (column === "title") row.title = value as string;
              else if (column === "done") row.done = value as number;
              else if (column === "priority") row.priority = value as string;
            });
            return { meta: { last_row_id: id, changes: 1 } };
          }
          throw new Error(`unsupported query: ${sql}`);
        },
      };
      return stmt;
    },
  };
}
