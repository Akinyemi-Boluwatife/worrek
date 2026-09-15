import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Client } from "pg";

import { waitlistRoute } from "./routes/waitlist.route";
import { usersRoute } from "./routes/user.route";
import { databaseHealthRoute } from "./routes/databaseHealth.route";

export const app = new Hono<{ Bindings: CloudflareBindings }>();

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

app.route("/api/waitlist", waitlistRoute);
app.route("/api/users", usersRoute);
app.route("/api/health/database", databaseHealthRoute);

export default app;
