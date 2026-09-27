export type DocumentMetadata = {
  id: string;
  userId: string;
  title: string;
  fileName: string;
  storageKey: string;
  size: number | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
};

export type DocumentListItem = Pick<
  DocumentMetadata,
  "id" | "title" | "fileName" | "updatedAt" | "deletedAt" | "size"
>;

export type UploadDocumentResult =
  | { success: true; document: DocumentMetadata }
  | { success: false; message: string };

export type OpenDocumentResult =
  | {
      success: true;
      document: Pick<DocumentMetadata, "id" | "title" | "fileName">;
      content: ArrayBuffer;
    }
  | { success: false; message: string };

const prefetchedDocuments = new Map<
  string,
  {
    promise: Promise<OpenDocumentResult>;
    controller: AbortController;
    timeout: ReturnType<typeof setTimeout>;
  }
>();

export function forgetPrefetchedDocument(id: string) {
  const entry = prefetchedDocuments.get(id);
  if (!entry) return;
  clearTimeout(entry.timeout);
  entry.controller.abort();
  prefetchedDocuments.delete(id);
}

export function prefetchDocument(id: string) {
  if (prefetchedDocuments.has(id)) return;

  const controller = new AbortController();
  const promise = fetchDocument(id, false, controller.signal);
  const timeout = setTimeout(() => forgetPrefetchedDocument(id), 30_000);
  prefetchedDocuments.set(id, { promise, controller, timeout });
  void promise.then((result) => {
    if (!result.success && prefetchedDocuments.get(id)?.promise === promise) {
      forgetPrefetchedDocument(id);
    }
  });

  if (prefetchedDocuments.size > 2) {
    const oldestId = prefetchedDocuments.keys().next().value;
    if (oldestId) forgetPrefetchedDocument(oldestId);
  }
}

export async function openDocument(id: string): Promise<OpenDocumentResult> {
  performance.clearMarks("document-open:start");
  performance.clearMarks("document-open:headers");
  performance.clearMarks("document-open:body");
  performance.clearMarks("document-open:ready");
  performance.mark("document-open:start");

  const prefetched = prefetchedDocuments.get(id);
  if (prefetched) {
    clearTimeout(prefetched.timeout);
    prefetchedDocuments.delete(id);
    const result = await prefetched.promise;
    if (result.success) {
      performance.mark("document-open:body");
      return result;
    }
  }

  return fetchDocument(id, true);
}

async function fetchDocument(
  id: string,
  measure: boolean,
  signal?: AbortSignal,
): Promise<OpenDocumentResult> {
  try {
    const response = await fetch(`/api/documents/${encodeURIComponent(id)}/content`, { signal });
    if (measure) {
      performance.mark("document-open:headers");
      performance.measure("document-open:request", "document-open:start", "document-open:headers");
    }

    if (response.status === 404) {
      return { success: false, message: "This document could not be found." };
    }
    if (!response.ok) {
      return {
        success: false,
        message: "We couldn't open this document right now.",
      };
    }

    const encodedTitle = response.headers.get("X-Document-Title");
    const encodedFileName = response.headers.get("X-Document-File-Name");
    if (!encodedTitle || !encodedFileName) {
      return {
        success: false,
        message: "We couldn't open this document right now.",
      };
    }

    const content = await response.arrayBuffer();
    if (measure) {
      performance.mark("document-open:body");
      performance.measure("document-open:transfer", {
        start: "document-open:headers",
        end: "document-open:body",
        detail: {
          bytes: content.byteLength,
          serverTiming: response.headers.get("server-timing"),
        },
      });
    }

    return {
      success: true,
      document: {
        id,
        title: decodeURIComponent(encodedTitle),
        fileName: decodeURIComponent(encodedFileName),
      },
      content,
    };
  } catch {
    return {
      success: false,
      message: "We couldn't open this document right now.",
    };
  }
}

export async function saveDocument(
  id: string,
  content: ArrayBuffer,
): Promise<UploadDocumentResult> {
  try {
    const response = await fetch(
      `/api/documents/${encodeURIComponent(id)}/content`,
      {
        method: "PUT",
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        },
        body: content,
      },
    );

    if (response.ok) {
      const body = (await response.json()) as { data: DocumentMetadata };
      forgetPrefetchedDocument(id);
      return { success: true, document: body.data };
    }

    const body = (await response.json().catch(() => null)) as {
      message?: string;
    } | null;
    return {
      success: false,
      message: body?.message ?? "We couldn't save this document right now.",
    };
  } catch {
    return {
      success: false,
      message: "We couldn't save this document right now.",
    };
  }
}

export async function uploadDocument(
  formData: FormData,
): Promise<UploadDocumentResult> {
  try {
    const response = await fetch("/api/documents", {
      method: "POST",
      body: formData,
    });

    if (response.ok) {
      const body = (await response.json()) as { data: DocumentMetadata };
      return { success: true, document: body.data };
    }

    if (response.status === 401) {
      return {
        success: false,
        message: "Please sign in to upload documents.",
      };
    }

    if (response.status === 413) {
      return {
        success: false,
        message: "This file is larger than the 10 MiB limit.",
      };
    }

    if (response.status === 400) {
      const body = (await response.json().catch(() => null)) as {
        message?: string;
      } | null;

      return {
        success: false,
        message: body?.message ?? "That file couldn't be uploaded.",
      };
    }

    if (response.status >= 500) {
      const body = (await response.json().catch(() => null)) as {
        message?: string;
      } | null;

      return {
        success: false,
        message:
          body?.message ??
          "We couldn't upload this document right now. Please try again.",
      };
    }

    console.error(`Document upload returned ${response.status}.`);
  } catch (error) {
    console.error(
      "Document upload failed:",
      error instanceof Error ? error.message : "Unknown error",
    );
  }

  return {
    success: false,
    message: "We couldn't upload this document right now. Please try again.",
  };
}
