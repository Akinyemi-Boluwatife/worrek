import "server-only";

import { cookies } from "next/headers";

import { api } from "./apiConstants";
import type { DocumentListItem } from "./document-client";

export async function loadDocuments(view: "active" | "trash" = "active"): Promise<{
  documents: DocumentListItem[];
  error: string;
}> {
  try {
    const requestStart = performance.now();
    const response = await api.listDocuments((await cookies()).toString(), view);
    const headersAt = performance.now();
    const payload = await response.text();
    const bodyAt = performance.now();

    if (process.env.DOCUMENT_PERF === "1") {
      console.info("Document list request", {
        status: response.status,
        upstreamMs: Math.round(headersAt - requestStart),
        bodyMs: Math.round(bodyAt - headersAt),
        payloadBytes: Buffer.byteLength(payload, "utf8"),
        serverTiming: response.headers.get("server-timing"),
      });
    }

    if (!response.ok) {
      return {
        documents: [],
        error: "We couldn't load your documents right now.",
      };
    }

    const body = JSON.parse(payload) as { data?: DocumentListItem[] };
    if (!Array.isArray(body.data))
      throw new Error("Invalid documents response");

    return { documents: body.data, error: "" };
  } catch {
    return {
      documents: [],
      error: "We couldn't load your documents right now.",
    };
  }
}
