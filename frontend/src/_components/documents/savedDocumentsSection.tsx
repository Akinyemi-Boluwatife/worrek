import { cacheLife, cacheTag } from "next/cache";

import { DocumentsList } from "@/_components/documents/documentsList";
import { listDocuments } from "@/_lib/documentList";

export async function SavedDocumentsSection() {
  "use cache: private";
  cacheLife({ stale: 60 * 60 * 2 });
  cacheTag("documents");

  const { active, trash, error } = await listDocuments();

  return (
    <DocumentsList active={active} trash={trash} error={error} />
  );
}
