import { createMiddleware } from "hono/factory";
import { createAuth } from "../lib/better-auth";

type Auth = Awaited<ReturnType<typeof createAuth>>;
type AuthSession = Auth["$Infer"]["Session"];

export type AuthVariables = {
  user: AuthSession["user"];
  session: AuthSession["session"];
};

type RequireAuthEnv = {
  Bindings: CloudflareBindings;
  Variables: AuthVariables;
};

export const requireAuth = createMiddleware<RequireAuthEnv>(async (c, next) => {
  const auth = await createAuth(c.env);
  const authSession = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  if (!authSession) {
    return c.json({ message: "Unauthorized" }, 401);
  }

  c.set("user", authSession.user);
  c.set("session", authSession.session);

  await next();
});
