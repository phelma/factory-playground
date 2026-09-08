export type Todo = {
  id: number;
  title: string;
  done: boolean;
  createdAt: string;
};

export type TodoSummary = {
  total: number;
  remaining: number;
};

export const MAX_TITLE_LENGTH = 200;

export function normaliseTitle(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const title = raw.trim();
  if (title.length === 0 || title.length > MAX_TITLE_LENGTH) return null;
  return title;
}

export function summarise(todos: Todo[]): TodoSummary {
  return {
    total: todos.length,
    remaining: todos.filter((todo) => todo.done).length,
  };
}
