import { normalisePriority, type Priority, type Todo } from "../shared/todo";
import type { Database } from "./db";

type TodoRow = {
  id: number;
  title: string;
  done: number;
  priority: string;
  created_at: string;
};

function rowToTodo(row: TodoRow): Todo {
  return {
    id: row.id,
    title: row.title,
    done: row.done === 1,
    priority: normalisePriority(row.priority) ?? "medium",
    createdAt: row.created_at,
  };
}

export type TodoPatch = {
  title?: string;
  done?: boolean;
  priority?: Priority;
};

export interface TodoStore {
  list(): Promise<Todo[]>;
  create(input: { title: string; priority: Priority }): Promise<Todo>;
  update(id: number, patch: TodoPatch): Promise<Todo | null>;
}

export function createSqliteTodoStore(db: Database): TodoStore {
  const selectAll = db.prepare("SELECT * FROM todos ORDER BY id");
  const selectOne = db.prepare("SELECT * FROM todos WHERE id = ?");
  const insert = db.prepare("INSERT INTO todos (title, priority) VALUES (?, ?)");

  const findTodo = (id: number): Todo | null => {
    const row = selectOne.get(id) as TodoRow | undefined;
    return row ? rowToTodo(row) : null;
  };

  return {
    async list(): Promise<Todo[]> {
      const rows = selectAll.all() as TodoRow[];
      return rows.map(rowToTodo);
    },

    async create(input: { title: string; priority: Priority }): Promise<Todo> {
      const result = insert.run(input.title, input.priority);
      return findTodo(Number(result.lastInsertRowid)) as Todo;
    },

    async update(id: number, patch: TodoPatch): Promise<Todo | null> {
      const sets: string[] = [];
      const values: (string | number)[] = [];
      if (patch.title !== undefined) {
        sets.push("title = ?");
        values.push(patch.title);
      }
      if (patch.done !== undefined) {
        sets.push("done = ?");
        values.push(patch.done ? 1 : 0);
      }
      if (patch.priority !== undefined) {
        sets.push("priority = ?");
        values.push(patch.priority);
      }
      if (sets.length === 0) return findTodo(id);
      values.push(id);
      const result = db.prepare(`UPDATE todos SET ${sets.join(", ")} WHERE id = ?`).run(...values);
      if (result.changes === 0) return null;
      return findTodo(id);
    },
  };
}
