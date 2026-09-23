"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { api } from "./apiConstants";

type RenameDocumentResult =
  | { success: true; title: string }
  | { success: false; message: string };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function renameDocument(
  id: string,
  title: string,
): Promise<RenameDocumentResult> {
  if (typeof id !== "string" || !UUID_PATTERN.test(id)) {
    return { success: false, message: "This document could not be found." };
  }

  if (typeof title !== "string" || !title.trim() || title.trim().length > 255) {
    return { success: false, message: "Enter a document name up to 255 characters." };
  }

  try {
    const response = await api.renameDocument(
      id,
      title.trim(),
      (await cookies()).toString(),
    );

    if (!response.ok) {
      if (response.status === 401) {
        return { success: false, message: "Please sign in again." };
      }
      if (response.status === 404) {
        return { success: false, message: "This document could not be found." };
      }

      const body = (await response.json().catch(() => null)) as { message?: string } | null;
      return {
        success: false,
        message: body?.message ?? "We couldn't rename this document right now.",
      };
    }

    const body = (await response.json()) as { data?: { title?: unknown } };
    if (typeof body.data?.title !== "string") {
      return { success: false, message: "We couldn't rename this document right now." };
    }

    revalidatePath("/documents");
    return { success: true, title: body.data.title };
  } catch {
    return { success: false, message: "We couldn't rename this document right now." };
  }
}
