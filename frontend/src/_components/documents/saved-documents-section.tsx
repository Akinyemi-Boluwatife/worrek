import { DocumentsList } from "@/_components/documents/documents-list";
import { loadDocuments } from "@/_lib/documents";

export async function SavedDocumentsSection() {
  const [activeResult, trashResult] = await Promise.all([loadDocuments("active"), loadDocuments("trash")]);

  return (
    <DocumentsList active={activeResult.documents} trash={trashResult.documents} error={activeResult.error || trashResult.error} />
  );
}
