import { DocumentsList } from "@/_components/documents/documents-list";
import { listDocuments } from "@/_lib/document-list";

export async function SavedDocumentsSection() {
  const { active, trash, error } = await listDocuments();

  return (
    <DocumentsList active={active} trash={trash} error={error} />
  );
}
