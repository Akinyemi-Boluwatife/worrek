import { createMiddleware } from "hono/factory";
import { createDb, type Database } from "../db";
import { createAuth } from "../lib/better-auth";

type Auth = Awaited<ReturnType<typeof createAuth>>;
type AuthSession = Auth["$Infer"]["Session"];

export type AuthVariables = {
  user: AuthSession["user"];
  session: AuthSession["session"];
  db: Database;
  timings: Array<{ name: string; duration: number }>;
};

type RequireAuthEnv = {
  Bindings: CloudflareBindings;
  Variables: AuthVariables;
};

export const requireAuth = createMiddleware<RequireAuthEnv>(async (c, next) => {
  const connectStart = performance.now();
  const db = await createDb(c.env.HYPERDRIVE);
  const connectDuration = performance.now() - connectStart;
  const auth = await createAuth(c.env, db);
  const sessionStart = performance.now();
  const authSession = await auth.api.getSession({
    headers: c.req.raw.headers,
  });
  const sessionDuration = performance.now() - sessionStart;
  const timings = [
    { name: "connect", duration: connectDuration },
    { name: "session", duration: sessionDuration },
  ];

  if (!authSession) {
    c.header("Server-Timing", timings.map(({ name, duration }) =>
      `${name};dur=${duration.toFixed(1)}`).join(", "));
    return c.json({ message: "Unauthorized" }, 401);
  }

  c.set("db", db);
  c.set("timings", timings);
  c.set("user", authSession.user);
  c.set("session", authSession.session);

  await next();
  c.header("Server-Timing", timings.map(({ name, duration }) =>
    `${name};dur=${duration.toFixed(1)}`).join(", "));
});
