import type { BetterAuthOptions } from "better-auth";

export const trustedOrigins = [
  "http://localhost:8787",
  "https://worrek.site",
];

export const betterAuthOptions: BetterAuthOptions = {
  appName: "Worrek",

  basePath: "/api/auth",

  emailAndPassword: {
    enabled: true,
  },

  trustedOrigins,
};
