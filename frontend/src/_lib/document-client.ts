import { documentListChanged } from "./document-actions";

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

export async function openDocument(id: string): Promise<OpenDocumentResult> {
  performance.clearMarks("document-open:start");
  performance.clearMarks("document-open:headers");
  performance.clearMarks("document-open:body");
  performance.clearMarks("document-open:ready");
  performance.mark("document-open:start");

  try {
    const response = await fetch(`/api/documents/${encodeURIComponent(id)}/content`);
    performance.mark("document-open:headers");
    performance.measure("document-open:request", "document-open:start", "document-open:headers");

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
    performance.mark("document-open:body");
    performance.measure("document-open:transfer", {
      start: "document-open:headers",
      end: "document-open:body",
      detail: {
        bytes: content.byteLength,
        serverTiming: response.headers.get("server-timing"),
      },
    });

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
      await documentListChanged().catch(() => {});
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
      await documentListChanged().catch(() => {});
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
