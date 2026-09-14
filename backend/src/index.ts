import { Hono } from "hono";
import { cors } from "hono/cors";
import { sql } from "drizzle-orm";
import type { Client } from "pg";

import { users } from "./db/schema";
import { createDb } from "./db";

const app = new Hono<{ Bindings: CloudflareBindings }>();

async function closeClient(client: Client | undefined) {
  if (!client) {
    return;
  }

  try {
    await client.end();
  } catch (error) {
    console.error(
      JSON.stringify({
        message: "Failed to close database client",
        error: error instanceof Error ? error.message : "Unknown error",
      }),
    );
  }
}

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

app.get("/api/health", (c) => {
  return c.json({
    status: "ok",
  });
});

app.get("/api/users", async (c) => {
  let client: Client | undefined;

  try {
    const connection = await createDb(c.env.HYPERDRIVE);

    client = connection.client;
    const db = connection.db;

    const allUsers = await db.select().from(users);

    return c.json({
      data: allUsers,
    });
  } catch (error) {
    console.error(
      JSON.stringify({
        message: "GET /api/users failed",
        error: error instanceof Error ? error.message : "Unknown error",
      }),
    );

    return c.json(
      {
        message: "Failed to fetch users",
      },
      500,
    );
  } finally {
    await closeClient(client);
  }
});

app.post("/api/users", async (c) => {
  let client: Client | undefined;

  try {
    const connection = await createDb(c.env.HYPERDRIVE);

    client = connection.client;
    const db = connection.db;

    const body = await c.req.json<{
      name: string;
      email: string;
    }>();

    const [newUser] = await db
      .insert(users)
      .values({
        name: body.name,
        email: body.email,
      })
      .returning();

    return c.json(
      {
        message: "User created successfully",
        data: newUser,
      },
      201,
    );
  } catch (error) {
    console.error(
      JSON.stringify({
        message: "POST /api/users failed",
        error: error instanceof Error ? error.message : "Unknown error",
      }),
    );

    return c.json(
      {
        message: "Failed to create user",
      },
      500,
    );
  } finally {
    await closeClient(client);
  }
});

app.get("/api/health/database", async (c) => {
  let client: Client | undefined;

  try {
    const connection = await createDb(c.env.HYPERDRIVE);

    client = connection.client;
    const db = connection.db;

    await db.execute(sql`SELECT 1`);

    return c.json({
      status: "ok",
      database: "connected",
    });
  } catch (error) {
    console.error(
      JSON.stringify({
        message: "Database health check failed",
        error: error instanceof Error ? error.message : "Unknown error",
      }),
    );

    return c.json(
      {
        status: "error",
        database: "unavailable",
      },
      503,
    );
  } finally {
    await closeClient(client);
  }
});

export default app;
