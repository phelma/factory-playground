import { useEffect, useState, type FormEvent } from "react";

import { summarise, type Priority, type Todo } from "../shared/todo";
import {
  parseThemePreference,
  readThemePreference,
  resolveTheme,
  writeThemePreference,
  type ThemePreference,
} from "../shared/theme";
import { api } from "./api";

export function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [preference, setPreference] = useState<ThemePreference>(() =>
    readThemePreference(window.localStorage),
  );

  useEffect(() => {
    api.list().then(setTodos).catch((e: Error) => setError(e.message));
  }, []);

  useEffect(() => {
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      document.documentElement.dataset.theme = resolveTheme(
        preference,
        query.matches ? "dark" : "light",
      );
    };
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, [preference]);

  const handlePreferenceChange = (value: string) => {
    const next = parseThemePreference(value);
    setPreference(next);
    writeThemePreference(window.localStorage, next);
  };

  const addTodo = async (event: FormEvent) => {
    event.preventDefault();
    if (title.trim() === "") return;
    try {
      const created = await api.create(title, priority);
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

  const changePriority = async (todo: Todo, next: Priority) => {
    try {
      const updated = await api.setPriority(todo.id, next);
      setTodos((current) => current.map((t) => (t.id === updated.id ? updated : t)));
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const removeTodo = async (todo: Todo) => {
    try {
      await api.remove(todo.id);
      setTodos((current) => current.filter((t) => t.id !== todo.id));
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const summary = summarise(todos);

  return (
    <main>
      <header>
        <h1>Things to do</h1>
        <label htmlFor="theme-select">
          Theme{" "}
          <select
            id="theme-select"
            aria-label="Theme"
            value={preference}
            onChange={(e) => handlePreferenceChange(e.target.value)}
          >
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>
      </header>

      <form onSubmit={addTodo}>
        <input
          aria-label="New todo"
          placeholder="What needs doing?"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <select
          aria-label="Priority"
          value={priority}
          onChange={(e) => setPriority(e.target.value as Priority)}
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
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
                  <button type="button" onClick={() => setEditingId(null)}>
                    Cancel
                  </button>
                </form>
              ) : (
                <>
                  <label>
                    <input type="checkbox" checked={todo.done} onChange={() => toggle(todo)} />
                    <span style={{ textDecoration: todo.done ? "line-through" : "none" }}>
                      {todo.title}
                    </span>
                  </label>{" "}
                  <span>[{todo.priority}]</span>{" "}
                  <select
                    aria-label={`Priority for ${todo.title}`}
                    value={todo.priority}
                    onChange={(e) => changePriority(todo, e.target.value as Priority)}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>{" "}
                  <button type="button" onClick={() => startEditing(todo)}>
                    Edit
                  </button>{" "}
                  <button type="button" onClick={() => removeTodo(todo)}>
                    Delete
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
