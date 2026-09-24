"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { openDocument, type OpenDocumentResult } from "@/_lib/document-client";

function EditorLoadingShell() {
  return (
    <div className="flex h-dvh flex-col bg-[#eef1f6]">
      <header className="flex h-11 shrink-0 items-center border-b border-[#e3e6eb] bg-white px-5">
        <Link href="/documents" className="text-[13px] font-semibold text-[#192332]">Worrek</Link>
      </header>
      <div className="h-12 shrink-0 border-b border-[#e3e6eb] bg-white" aria-hidden="true" />
      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_420px] max-[950px]:grid-cols-[minmax(0,1fr)_300px] max-[650px]:grid-cols-1">
        <main className="flex min-w-0 justify-center overflow-hidden p-6">
          <div className="flex w-full max-w-[816px] items-center justify-center bg-white text-[13px] text-muted shadow-sm" role="status">
            Opening document…
          </div>
        </main>
        <aside className="border-l border-[#e3e6eb] bg-white max-[650px]:hidden">
          <div className="border-b border-[#e9edf2] px-4 py-5 text-[13px] font-semibold text-[#293547]">AI Assistant</div>
        </aside>
      </div>
    </div>
  );
}

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
