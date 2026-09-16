import "server-only";

function request(path: string, init?: RequestInit) {
  const apiUrl = process.env.API_URL;

  if (!apiUrl) {
    throw new Error("API_URL is not configured");
  }

  return fetch(new URL(path, apiUrl), init);
}

export const api = {
  databaseHealth: () =>
    request("/api/health/database", { cache: "no-store" }),

  joinWaitlist: (body: {
    firstName: string;
    lastName: string;
    email: string;
    referralPlatform: string;
    marketingConsent: boolean;
  }) =>
    request("/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    }),
};
