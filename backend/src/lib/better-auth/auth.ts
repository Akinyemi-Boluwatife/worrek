import { betterAuth } from "better-auth/minimal";
import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";

import { createDb } from "../../db";
import { betterAuthOptions } from "./options";
import * as schema from "../../db/auth-schema";

export const createAuth = async (env: CloudflareBindings) => {
  const db = await createDb(env.HYPERDRIVE);

  return betterAuth({
    ...betterAuthOptions,

    database: drizzleAdapter(db, {
      provider: "pg",
      schema,
    }),

    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
  });
};
