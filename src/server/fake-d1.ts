import type { D1Database, D1PreparedStatement, D1Row } from "./d1-store";

type StoredRow = {
  id: number;
  title: string;
  done: number;
  priority: string;
  created_at: string;
};

function toRow(row: StoredRow): D1Row {
  return {
    id: row.id,
    title: row.title,
    done: row.done,
    priority: row.priority,
    created_at: row.created_at,
  };
}

/**
 * In-memory fake that honours the async prepare-bind-run contract of the
 * real D1 binding, so store and Worker tests exercise the same seam that
 * runs against the managed store in production.
 */
export function createFakeD1(): D1Database {
  const rows: StoredRow[] = [];
  let nextId = 1;

  const select = (values: unknown[]): D1Row[] => {
    if (values.length > 0) {
      const id = values[0] as number;
      const row = rows.find((candidate) => candidate.id === id);
      return row ? [toRow(row)] : [];
    }
    return [...rows].sort((a, b) => a.id - b.id).map(toRow);
  };

  const makeBound = (query: string, values: unknown[]): D1PreparedStatement => ({
    bind(...more: unknown[]): D1PreparedStatement {
      return makeBound(query, [...values, ...more]);
    },
    async all<T extends D1Row = D1Row>(): Promise<{ results: T[] }> {
      if (!query.trim().toUpperCase().startsWith("SELECT")) {
        throw new Error(`fake D1: all() does not support ${query}`);
      }
      return { results: select(values) as T[] };
    },
    async first<T extends D1Row = D1Row>(): Promise<T | null> {
      if (!query.trim().toUpperCase().startsWith("SELECT")) {
        throw new Error(`fake D1: first() does not support ${query}`);
      }
      const found = select(values);
      const row = found.length > 0 ? found[0] : undefined;
      return (row ?? null) as T | null;
    },
    async run(): Promise<{ meta: { last_row_id: number; changes: number } }> {
      const normalised = query.trim().toUpperCase();
      if (normalised.startsWith("INSERT")) {
        const title = values[0] as string;
        const priority = values[1] as string;
        const row: StoredRow = {
          id: nextId,
          title,
          done: 0,
          priority,
          created_at: new Date().toISOString(),
        };
        nextId += 1;
        rows.push(row);
        return { meta: { last_row_id: row.id, changes: 1 } };
      }
      if (normalised.startsWith("UPDATE")) {
        const id = values[values.length - 1] as number;
        const row = rows.find((candidate) => candidate.id === id);
        if (!row) return { meta: { last_row_id: 0, changes: 0 } };
        const setClause = query.slice(
          normalised.indexOf("SET") + 3,
          normalised.indexOf("WHERE"),
        );
        const columns = setClause.split(",").map((part) => part.split("=")[0]?.trim().toLowerCase());
        columns.forEach((column, index) => {
          const value = values[index];
          if (column === "title") row.title = value as string;
          else if (column === "done") row.done = value as number;
          else if (column === "priority") row.priority = value as string;
        });
        return { meta: { last_row_id: id, changes: 1 } };
      }
      throw new Error(`fake D1: run() does not support ${query}`);
    },
  });

  return {
    prepare(query: string): D1PreparedStatement {
      return makeBound(query, []);
    },
  };
}
