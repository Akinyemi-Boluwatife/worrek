import { revalidateTag } from "next/cache";

import { api } from "@/_lib/apiConstants";

const MAX_DOCX_BYTES = 10 * 1024 * 1024;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const response = await api.getDocumentContent(
      id,
      request.headers.get("cookie") ?? "",
    );
    const headers = new Headers({
      "Content-Type": response.headers.get("content-type") ?? "application/json",
      "Cache-Control": "private, no-store",
    });
    for (const name of ["X-Document-Title", "X-Document-File-Name", "Server-Timing"]) {
      const value = response.headers.get(name);
      if (value) headers.set(name, value);
    }
    return new Response(response.body, {
      status: response.status,
      headers,
    });
  } catch {
    return Response.json({ message: "Failed to open document." }, { status: 502 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const contentLength = Number(request.headers.get("content-length"));
  if (contentLength > MAX_DOCX_BYTES) {
    return Response.json({ message: "Document exceeds the 10 MiB limit." }, { status: 413 });
  }

  const body = await request.arrayBuffer();
  if (body.byteLength > MAX_DOCX_BYTES) {
    return Response.json({ message: "Document exceeds the 10 MiB limit." }, { status: 413 });
  }

  try {
    const response = await api.saveDocumentContent(
      id,
      body,
      request.headers.get("cookie") ?? "",
    );
    if (response.ok) revalidateTag("documents", { expire: 0 });
    return new Response(response.body, {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("content-type") ?? "application/json",
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return Response.json({ message: "Failed to save document." }, { status: 502 });
  }
}
