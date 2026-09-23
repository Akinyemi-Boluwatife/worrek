import { cookies } from "next/headers";

import { DocumentsList } from "@/_components/documents/documents-list";
import { api } from "@/_lib/apiConstants";
import type { DocumentListItem } from "@/_lib/documents";

async function loadDocuments(): Promise<{
  documents: DocumentListItem[];
  error: string;
}> {
  try {
    const requestStart = performance.now();
    const response = await api.listDocuments((await cookies()).toString());
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

export async function SavedDocumentsSection() {
  const { documents, error } = await loadDocuments();

  return (
    <section aria-label="Saved documents" className="mt-12 max-[651px]:mt-9">
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h2 className="text-[16px] font-[650] tracking-[-0.3px]">
          Saved documents
        </h2>
        {!error ? (
          <span className="text-[12px] text-muted">
            {documents.length} {documents.length === 1 ? "document" : "documents"}
          </span>
        ) : null}
      </div>
      {error ? (
        <div
          role="alert"
          className="rounded-xl border border-[#dce1e8] bg-white px-5 py-6 text-[13px] text-[#9b4141]"
        >
          {error} Refresh the page to try again.
        </div>
      ) : (
        <DocumentsList documents={documents} />
      )}
    </section>
  );
}
