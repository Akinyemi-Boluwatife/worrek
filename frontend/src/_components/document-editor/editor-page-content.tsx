"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

import { openDocument, type OpenDocumentResult } from "@/_lib/document-client";

const Editor = dynamic(
  () => import("./editor").then((module) => module.Editor),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-dvh items-center justify-center bg-[#eef1f6] text-[13px] text-muted">
        Loading editor…
      </div>
    ),
  },
);

export function EditorPageContent({
  newDocument = false,
  documentId,
}: {
  newDocument?: boolean;
  documentId?: string;
}) {
  const pendingLoad = useRef<{
    id: string;
    promise: Promise<OpenDocumentResult>;
  } | null>(null);
  const [load, setLoad] = useState<{
    id: string;
    promise: Promise<OpenDocumentResult>;
  } | null>(null);

  useEffect(() => {
    if (!documentId) return;

    if (pendingLoad.current?.id !== documentId) {
      pendingLoad.current = { id: documentId, promise: openDocument(documentId) };
    }
    setLoad(pendingLoad.current);
  }, [documentId]);

  const documentLoad = load?.id === documentId ? load?.promise : undefined;
  if (documentId && !documentLoad) {
    return (
      <div className="flex h-dvh items-center justify-center bg-[#eef1f6] text-[13px] text-muted">
        Opening document…
      </div>
    );
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
