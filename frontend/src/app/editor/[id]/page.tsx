import type { Metadata } from "next";
import { Suspense } from "react";

import { EditorLoadingShell, EditorPageContent } from "@/_components/document-editor/editor-page-content";

export const metadata: Metadata = {
  title: "Edit document — Worrek",
};

export default function SavedDocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<EditorLoadingShell />}>
      <SavedDocumentContent params={params} />
    </Suspense>
  );
}

async function SavedDocumentContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EditorPageContent documentId={id} />;
}
