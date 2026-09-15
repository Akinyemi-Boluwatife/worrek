import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";

import { createDb } from "../db";
import { waitlist } from "../db/schema";
import { joinWaitlistSchema } from "../validators/waitlist.validator";

type Bindings = {
  HYPERDRIVE: Hyperdrive;
};

export const waitlistRoute = new Hono<{ Bindings: Bindings }>();

waitlistRoute.get("/", async (c) => {
  try {
    const db = await createDb(c.env.HYPERDRIVE);

    const allWaitlist = await db.select().from(waitlist);

    return c.json({
      data: allWaitlist,
    });
  } catch (error) {
    console.error(
      JSON.stringify({
        message: "GET /api/waitlist failed",
        error: error instanceof Error ? error.message : "Unknown error",
      }),
    );

    return c.json(
      {
        message: "Failed to fetch waitlist",
      },
      500,
    );
  }
});

waitlistRoute.post("/", zValidator("json", joinWaitlistSchema), async (c) => {
  try {
    const db = await createDb(c.env.HYPERDRIVE);

    const data = c.req.valid("json");

    const [person] = await db
      .insert(waitlist)
      .values(data)
      .onConflictDoNothing({
        target: waitlist.email,
      })
      .returning();

    if (!person) {
      return c.json(
        {
          success: false,
          message: "This email is already on the waitlist.",
        },
        409,
      );
    }

    return c.json(
      {
        success: true,
        message: "You've joined the waitlist.",
      },
      201,
    );
  } catch (error) {
    console.error(
      JSON.stringify({
        message: "POST /api/waitlist failed",
        error: error instanceof Error ? error.message : "Unknown error",
      }),
    );

    return c.json(
      {
        success: false,
        message: "Failed to create waitlist",
      },
      500,
    );
  }
});
