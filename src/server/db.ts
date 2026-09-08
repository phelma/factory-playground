import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";

export type Database = DatabaseSync;

const DEFAULT_PATH = "data/todos.db";

export function openDatabase(path = process.env.DATABASE_PATH ?? DEFAULT_PATH): Database {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });

  const db = new DatabaseSync(path);
  db.exec(`
    CREATE TABLE IF NOT EXISTS todos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      done INTEGER NOT NULL DEFAULT 0,
      priority TEXT NOT NULL DEFAULT 'medium',
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    )
  `);
  const columns = db.prepare("PRAGMA table_info(todos)").all() as { name: string }[];
  if (!columns.some((column) => column.name === "priority")) {
    db.exec("ALTER TABLE todos ADD COLUMN priority TEXT NOT NULL DEFAULT 'medium'");
  }
  return db;
}
