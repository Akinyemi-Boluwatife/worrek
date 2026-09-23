import type { Metadata } from "next";

import { EditorPageContent } from "@/_components/document-editor/editor-page-content";

export const metadata: Metadata = {
  title: "Edit document — Worrek",
};

export default async function SavedDocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <EditorPageContent documentId={id} />;
}
