import { normalisePriority, type Priority, type Todo } from "../shared/todo";

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

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  all<T>(): Promise<{ results: T[] }>;
  first<T>(): Promise<T | null>;
  run(): Promise<{ meta: { last_row_id: number; changes: number } }>;
}

export interface D1DatabaseBinding {
  prepare(query: string): D1PreparedStatement;
}

export function createD1TodoStore(db: D1DatabaseBinding): TodoStore {
  const findTodo = async (id: number): Promise<Todo | null> => {
    const row = await db
      .prepare("SELECT * FROM todos WHERE id = ?")
      .bind(id)
      .first<TodoRow>();
    return row ? rowToTodo(row) : null;
  };

  return {
    async list(): Promise<Todo[]> {
      const { results } = await db
        .prepare("SELECT * FROM todos ORDER BY id")
        .all<TodoRow>();
      return results.map(rowToTodo);
    },

    async create(input: { title: string; priority: Priority }): Promise<Todo> {
      const result = await db
        .prepare("INSERT INTO todos (title, priority) VALUES (?, ?)")
        .bind(input.title, input.priority)
        .run();
      return (await findTodo(Number(result.meta.last_row_id))) as Todo;
    },

    async update(id: number, patch: TodoPatch): Promise<Todo | null> {
      const sets: string[] = [];
      const values: unknown[] = [];
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
      const result = await db
        .prepare(`UPDATE todos SET ${sets.join(", ")} WHERE id = ?`)
        .bind(...values)
        .run();
      if (result.meta.changes === 0) return null;
      return findTodo(id);
    },
  };
}
