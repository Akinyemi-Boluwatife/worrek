import "server-only";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function proxyDocumentChat(request: Request, id: string, suffix = "") {
  if (!UUID.test(id)) return Response.json({ message: "Document not found." }, { status: 404 });
  const apiUrl = process.env.API_URL;
  if (!apiUrl) return Response.json({ message: "Chat service is not configured." }, { status: 503 });

  const target = new URL(`/api/documents/${id}/chat${suffix}`, apiUrl);
  if (!suffix && request.method === "GET") target.search = new URL(request.url).search;
  const headers = new Headers({
    cookie: request.headers.get("cookie") ?? "",
    accept: request.method === "POST" ? "text/event-stream, application/json" : "application/json",
  });
  if (request.method === "POST") headers.set("content-type", "application/json");

  try {
    const response = await fetch(target, {
      method: request.method,
      headers,
      body: request.method === "POST" ? request.body : undefined,
      // Required by Node's fetch when forwarding a stream.
      duplex: "half",
      signal: request.signal,
      cache: "no-store",
    } as RequestInit & { duplex: "half" });
    const forwarded = new Headers({ "Cache-Control": "private, no-store" });
    for (const name of ["content-type", "server-timing"]) {
      const value = response.headers.get(name);
      if (value) forwarded.set(name, value);
    }
    return new Response(response.body, { status: response.status, headers: forwarded });
  } catch {
    return Response.json({ message: "Chat service is unavailable." }, { status: 502 });
  }
}
