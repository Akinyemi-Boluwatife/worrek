import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";
import { drizzle } from "drizzle-orm/node-postgres";

import { betterAuthOptions } from "./src/lib/better-auth/options";

export const auth = betterAuth({
  ...betterAuthOptions,

  database: drizzleAdapter(drizzle.mock(), {
    provider: "pg",
  }),

  advanced: {
    database: {
      validateSchema: false,
    },
  },
});
