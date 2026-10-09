import "server-only";

function request(path: string, init?: RequestInit) {
  const apiUrl = process.env.API_URL;

  if (!apiUrl) {
    throw new Error("API_URL is not configured");
  }

  return fetch(new URL(path, apiUrl), init);
}

export const api = {
  databaseHealth: () => request("/api/health/database"),

  uploadDocument: (body: FormData, cookie?: string) =>
    request("/api/documents", {
      method: "POST",
      headers: cookie ? { cookie } : undefined,
      body,
    }),

  listDocuments: (cookie: string, view: "active" | "trash" = "active") =>
    request(view === "trash" ? "/api/documents?view=trash" : "/api/documents", {
      headers: { cookie },
    }),

  renameDocument: (id: string, title: string, cookie: string) =>
    request(`/api/documents/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { cookie, "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    }),

  trashDocument: (id: string, cookie: string) =>
    request(`/api/documents/${encodeURIComponent(id)}/trash`, {
      method: "POST", headers: { cookie },
    }),

  restoreDocument: (id: string, cookie: string) =>
    request(`/api/documents/${encodeURIComponent(id)}/restore`, {
      method: "POST", headers: { cookie },
    }),

  deleteDocumentForever: (id: string, cookie: string) =>
    request(`/api/documents/${encodeURIComponent(id)}`, {
      method: "DELETE", headers: { cookie },
    }),

  getDocumentContent: (id: string, cookie: string) =>
    request(`/api/documents/${encodeURIComponent(id)}/content`, {
      headers: { cookie },
    }),

  saveDocumentContent: (id: string, body: ArrayBuffer, cookie: string) =>
    request(`/api/documents/${encodeURIComponent(id)}/content`, {
      method: "PUT",
      headers: {
        cookie,
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      },
      body,
    }),
};
