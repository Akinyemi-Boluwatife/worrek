import { Hono } from "hono";
import { cors } from "hono/cors";

import { waitlistRoute } from "./routes/waitlist.route";
import { databaseHealthRoute } from "./routes/databaseHealth.route";
import { createAuth } from "./lib/better-auth";
import { trustedOrigins } from "./lib/better-auth/options";
import { requireAuth } from "./middleware/requireAuth.middleware";

export const app = new Hono<{ Bindings: CloudflareBindings }>();

app.use(
  "/api/auth/*",
  cors({
    origin: trustedOrigins,
    credentials: true,
  }),
);

app.all("/api/auth/*", async (c) => {
  const auth = await createAuth(c.env);

  return auth.handler(c.req.raw);
});

app.use(
  "/api/*",
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  }),
);

app.get("/", (c) => {
  return c.text("Hello Hono!, this is for testing");
});

app.get("/api/protected", requireAuth, (c) => {
  const user = c.get("user");

  return c.json({
    success: true,
    user,
  });
});

app.route("/api/waitlist", waitlistRoute);
app.route("/api/health/database", databaseHealthRoute);

export default app;
