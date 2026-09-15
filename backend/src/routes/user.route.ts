import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";

import { createDb } from "../db";
import { users } from "../db/schema";
import { createUserSchema } from "../validators/user.validator";

type Bindings = {
  HYPERDRIVE: Hyperdrive;
};

export const usersRoute = new Hono<{ Bindings: Bindings }>();

usersRoute.get("/api/users", async (c) => {
  try {
    const db = await createDb(c.env.HYPERDRIVE);

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
  }
});

usersRoute.post(
  "/api/users",
  zValidator("json", createUserSchema),
  async (c) => {
    try {
      const db = await createDb(c.env.HYPERDRIVE);

      const data = c.req.valid("json");

      const [newUser] = await db.insert(users).values(data).returning();

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
    }
  },
);
