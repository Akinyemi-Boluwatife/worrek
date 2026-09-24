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

  uploadDocument: (body: FormData, cookie?: string) =>
    request("/api/documents", {
      method: "POST",
      headers: cookie ? { cookie } : undefined,
      body,
      cache: "no-store",
    }),

  listDocuments: (cookie: string, view: "active" | "trash" = "active") =>
    request(view === "trash" ? "/api/documents?view=trash" : "/api/documents", {
      headers: { cookie },
      cache: "no-store",
    }),

  renameDocument: (id: string, title: string, cookie: string) =>
    request(`/api/documents/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { cookie, "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
      cache: "no-store",
    }),

  trashDocument: (id: string, cookie: string) =>
    request(`/api/documents/${encodeURIComponent(id)}/trash`, {
      method: "POST", headers: { cookie }, cache: "no-store",
    }),

  restoreDocument: (id: string, cookie: string) =>
    request(`/api/documents/${encodeURIComponent(id)}/restore`, {
      method: "POST", headers: { cookie }, cache: "no-store",
    }),

  deleteDocumentForever: (id: string, cookie: string) =>
    request(`/api/documents/${encodeURIComponent(id)}`, {
      method: "DELETE", headers: { cookie }, cache: "no-store",
    }),

  getDocumentContent: (id: string, cookie: string) =>
    request(`/api/documents/${encodeURIComponent(id)}/content`, {
      headers: { cookie },
      cache: "no-store",
    }),

  saveDocumentContent: (id: string, body: ArrayBuffer, cookie: string) =>
    request(`/api/documents/${encodeURIComponent(id)}/content`, {
      method: "PUT",
      headers: {
        cookie,
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      },
      body,
      cache: "no-store",
    }),
};
