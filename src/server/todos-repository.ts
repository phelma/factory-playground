import { normalisePriority, type Todo } from "../shared/todo";
import type { Database } from "./db";

export type TodoRow = {
  id: number;
  title: string;
  done: number;
  priority: string;
  created_at: string;
};

export function rowToTodo(row: TodoRow): Todo {
  return {
    id: row.id,
    title: row.title,
    done: row.done === 1,
    priority: normalisePriority(row.priority) ?? "medium",
    createdAt: row.created_at,
  };
}

export type TodosRepository = {
  list(): Todo[];
  find(id: number): Todo | null;
  create(title: string): Todo;
  setDone(id: number, done: boolean): Todo | null;
};

export function createTodosRepository(db: Database): TodosRepository {
  const selectAll = db.prepare("SELECT * FROM todos ORDER BY id");
  const selectOne = db.prepare("SELECT * FROM todos WHERE id = ?");
  const insert = db.prepare("INSERT INTO todos (title) VALUES (?)");
  const updateDone = db.prepare("UPDATE todos SET done = ? WHERE id = ?");

  const find = (id: number): Todo | null => {
    const row = selectOne.get(id) as TodoRow | undefined;
    return row ? rowToTodo(row) : null;
  };

  return {
    list(): Todo[] {
      const rows = selectAll.all() as TodoRow[];
      return rows.map(rowToTodo);
    },

    find,

    create(title: string): Todo {
      const result = insert.run(title);
      return find(Number(result.lastInsertRowid)) as Todo;
    },

    setDone(id: number, done: boolean): Todo | null {
      const result = updateDone.run(done ? 1 : 0, id);
      if (result.changes === 0) return null;
      return find(id);
    },
  };
}
