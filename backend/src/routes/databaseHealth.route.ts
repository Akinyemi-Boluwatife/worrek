import { sql } from "drizzle-orm";
import { Hono } from "hono";

import { createDb } from "../db";

type Bindings = {
  HYPERDRIVE: Hyperdrive;
};

export const databaseHealthRoute = new Hono<{ Bindings: Bindings }>();

databaseHealthRoute.get("/api/health/database", async (c) => {
  try {
    const db = await createDb(c.env.HYPERDRIVE);

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
  }
});
