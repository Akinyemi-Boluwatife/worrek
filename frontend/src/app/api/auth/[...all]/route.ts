const HOP_BY_HOP_HEADERS = [
  "connection",
  "content-length",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
];

const STRIPPED_REQUEST_HEADERS = [...HOP_BY_HOP_HEADERS, "host"];

const STRIPPED_RESPONSE_HEADERS = [...HOP_BY_HOP_HEADERS, "content-encoding"];

function buildRequestHeaders(request: Request, apiUrl: string) {
  const headers = new Headers(request.headers);

  for (const header of STRIPPED_REQUEST_HEADERS) {
    headers.delete(header);
  }

  headers.set("accept-encoding", "identity");
  headers.set("origin", new URL(apiUrl).origin);

  return headers;
}

function buildResponseHeaders(response: Response) {
  const headers = new Headers(response.headers);

  for (const header of STRIPPED_RESPONSE_HEADERS) {
    headers.delete(header);
  }

  headers.delete("set-cookie");

  for (const cookie of response.headers.getSetCookie()) {
    headers.append("set-cookie", cookie);
  }

  return headers;
}

async function proxy(request: Request) {
  const apiUrl = process.env.API_URL;

  if (!apiUrl) {
    return Response.json(
      { message: "Authentication service is not configured." },
      { status: 500 },
    );
  }

  const { pathname, search } = new URL(request.url);
  const target = new URL(`${pathname}${search}`, apiUrl);

  try {
    const response = await fetch(target, {
      method: request.method,
      headers: buildRequestHeaders(request, apiUrl),
      body:
        request.method === "GET" || request.method === "HEAD"
          ? undefined
          : await request.arrayBuffer(),
      redirect: "manual",
    });

    return new Response(await response.arrayBuffer(), {
      status: response.status,
      headers: buildResponseHeaders(response),
    });
  } catch (error) {
    console.error(
      "Auth proxy request failed:",
      error instanceof Error ? error.message : "Unknown error",
    );

    return Response.json(
      { message: "Authentication service is unavailable." },
      { status: 502 },
    );
  }
}

export {
  proxy as DELETE,
  proxy as GET,
  proxy as PATCH,
  proxy as POST,
  proxy as PUT,
};
