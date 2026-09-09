import { createApp } from "./app";
import { createD1TodoStore, type D1DatabaseBinding } from "./store";

export type WorkerEnv = {
  DB: D1DatabaseBinding;
};

const app = createApp((c) => createD1TodoStore((c.env as WorkerEnv).DB));

export default app;
