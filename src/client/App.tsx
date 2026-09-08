import { useEffect, useState, type FormEvent } from "react";

import { summarise, type Todo } from "../shared/todo";
import { api } from "./api";

export function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState("");

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

  const startEditing = (todo: Todo) => {
    setEditingId(todo.id);
    setDraft(todo.title);
  };

  const saveEdit = async (event: FormEvent, todo: Todo) => {
    event.preventDefault();
    try {
      const updated = await api.rename(todo.id, draft);
      setTodos((current) => current.map((t) => (t.id === updated.id ? updated : t)));
      setEditingId(null);
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
              {editingId === todo.id ? (
                <form onSubmit={(e) => saveEdit(e, todo)}>
                  <input
                    aria-label="Todo title"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") setEditingId(null);
                    }}
                  />
                  <button type="submit">Save</button>
                </form>
              ) : (
                <>
                  <label>
                    <input type="checkbox" checked={todo.done} onChange={() => toggle(todo)} />
                    <span style={{ textDecoration: todo.done ? "line-through" : "none" }}>
                      {todo.title}
                    </span>
                  </label>{" "}
                  <button type="button" onClick={() => startEditing(todo)}>
                    Edit
                  </button>
                </>
              )}
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
