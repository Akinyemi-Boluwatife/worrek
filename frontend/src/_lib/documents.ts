export type DocumentMetadata = {
  id: string;
  userId: string;
  title: string;
  fileName: string;
  storageKey: string;
  size: number | null;
  createdAt: string;
  updatedAt: string;
};

export type UploadDocumentResult =
  | { success: true; document: DocumentMetadata }
  | { success: false; message: string };

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
