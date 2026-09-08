import { useEffect, useState, type FormEvent } from "react";

import { summarise, type Todo } from "../shared/todo";
import { api } from "./api";

export function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.list().then(setTodos).catch((e: Error) => setError(e.message));
  }, []);

  const addTodo = async (event: FormEvent) => {
    event.preventDefault();
    if (title.trim() === "") return;
    try {
      const created = await api.create(title);
      setTodos((current) => [...current, created]);
      setTitle("");
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const toggle = async (todo: Todo) => {
    try {
      const updated = await api.setDone(todo.id, !todo.done);
      setTodos((current) => current.map((t) => (t.id === updated.id ? updated : t)));
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const summary = summarise(todos);

  return (
    <main>
      <h1>Things to do</h1>

      <form onSubmit={addTodo}>
        <input
          aria-label="New todo"
          placeholder="What needs doing?"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <button type="submit">Add</button>
      </form>

      {error && <p role="alert">{error}</p>}

      {todos.length === 0 ? (
        <p>Nothing to do yet.</p>
      ) : (
        <ul>
          {todos.map((todo) => (
            <li key={todo.id}>
              <label>
                <input type="checkbox" checked={todo.done} onChange={() => toggle(todo)} />
                <span style={{ textDecoration: todo.done ? "line-through" : "none" }}>
                  {todo.title}
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}

      <footer>
        {summary.remaining} of {summary.total} remaining
      </footer>
    </main>
  );
}
