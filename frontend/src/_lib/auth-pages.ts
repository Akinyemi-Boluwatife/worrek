import { notFound } from "next/navigation";

export function requireAuthPagesEnabled() {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.ENABLE_AUTH_PAGES !== "true"
  ) {
    notFound();
  }
}
