import type { Todo } from "../shared/todo";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers },
  });
  if (!res.ok) throw new Error(`${init?.method ?? "GET"} ${path} failed with ${res.status}`);
  return res.json() as Promise<T>;
}

export const api = {
  list: () => request<Todo[]>("/api/todos"),
  create: (title: string) =>
    request<Todo>("/api/todos", { method: "POST", body: JSON.stringify({ title }) }),
  setDone: (id: number, done: boolean) =>
    request<Todo>(`/api/todos/${id}`, { method: "PATCH", body: JSON.stringify({ done }) }),
};
