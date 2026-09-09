import { createApp } from "./app";
import { createD1TodoStore, type D1Database } from "./d1-store";

export type WorkerEnv = {
  DB: D1Database;
};

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const app = createApp(createD1TodoStore(env.DB));
    return app.fetch(request, env);
  },
};
