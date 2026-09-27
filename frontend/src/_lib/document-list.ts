import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { cookies } from "next/headers";
import { unstable_rethrow } from "next/navigation";

import { api } from "./apiConstants";
import type { DocumentListItem } from "./document-client";

type DocumentList = {
  active: DocumentListItem[];
  trash: DocumentListItem[];
  error: string;
};

export async function listDocuments(): Promise<DocumentList> {
  try {
    return await getCachedDocuments();
  } catch (error) {
    unstable_rethrow(error);
    return {
      active: [],
      trash: [],
      error: "We couldn't load your documents right now.",
    };
  }
}

async function getCachedDocuments(): Promise<DocumentList> {
  "use cache: private";
  cacheLife({ stale: 60 * 60 * 2 });
  cacheTag("documents");

  const cookie = (await cookies()).toString();
  const responses = await Promise.all([
    api.listDocuments(cookie, "active"),
    api.listDocuments(cookie, "trash"),
  ]);
  if (responses.some((response) => !response.ok))
    throw new Error("Document list failed");

  const [activeBody, trashBody] = (await Promise.all(
    responses.map((response) => response.json()),
  )) as [{ data?: DocumentListItem[] }, { data?: DocumentListItem[] }];
  if (!Array.isArray(activeBody.data) || !Array.isArray(trashBody.data)) {
    throw new Error("Invalid documents response");
  }

  return { active: activeBody.data, trash: trashBody.data, error: "" };
}
