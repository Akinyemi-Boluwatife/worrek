"use client";

import dynamic from "next/dynamic";
import { EditorLoadingShell } from "./editorLoadingShell";
import { useEditorPageContent } from "@/_lib/useEditorPageContent";

const Editor = dynamic(
  () => import("./editor").then((module) => module.Editor),
  {
    ssr: false,
    loading: EditorLoadingShell,
  },
);

export function EditorPageContent({
  newDocument = false,
  documentId,
}: {
  newDocument?: boolean;
  documentId?: string;
}) {
  const documentLoad = useEditorPageContent(documentId);
  if (documentId && !documentLoad) {
    return <EditorLoadingShell />;
  }

  return (
    <Editor
      key={documentId ?? (newDocument ? "new" : "blank")}
      newDocument={newDocument}
      documentId={documentId}
      documentLoad={documentLoad}
    />
  );
}
