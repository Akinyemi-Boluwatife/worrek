"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { openDocument, type OpenDocumentResult } from "@/_lib/document-client";

export function EditorLoadingShell() {
  return (
    <div className="flex h-dvh min-w-0 flex-col overflow-hidden bg-[#eef1f6]" aria-busy="true">
      <span className="sr-only" role="status">Opening document…</span>
      <header className="grid h-11 shrink-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4 border-b border-[#e3e6eb] bg-white px-[18px] max-[950px]:grid-cols-[minmax(0,1fr)_auto]">
        <div className="flex min-w-0 items-center gap-2.5">
          <Link href="/documents" prefetch={true} className="flex shrink-0 items-center gap-2 text-[13px] font-bold text-[#192332]">
            <span className="grid size-8 place-items-center rounded-[9px] border border-[#e1e6ee] bg-[#f7f9fc] text-[#4274dc]" aria-hidden="true">
              <svg viewBox="0 0 36 36" fill="none" className="size-5"><path d="M4 9.5 10 27l8-13 8 13 6-17.5" stroke="currentColor" strokeWidth="5.3" strokeLinecap="round" strokeLinejoin="round" /><path d="m14 9 4 5.5L22 9" stroke="currentColor" strokeWidth="4.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </span>
            <span className="max-[650px]:hidden">Worrek</span>
          </Link>
          <span className="text-xl text-[#adb7c5]" aria-hidden="true">›</span>
          <span className="h-3 w-28 max-w-[30vw] rounded bg-[#e3e8ef] motion-safe:animate-pulse" aria-hidden="true" />
          <span className="h-5 w-24 rounded-full bg-[#f0f2f5] motion-safe:animate-pulse max-[950px]:hidden" aria-hidden="true" />
        </div>
        <div className="flex items-center gap-2 rounded-[9px] border border-[#e5e9ef] bg-[#f5f7fa] p-[3px] text-xs max-[950px]:hidden" aria-hidden="true">
          <span className="rounded-md bg-white px-3 py-1.5 font-bold text-[#202938] shadow-sm">Document</span>
          <span className="px-3 py-1.5 text-[#637083]">Files</span>
        </div>
        <div className="flex items-center justify-end gap-2" aria-hidden="true">
          <span className="size-7 rounded-md bg-[#eef1f4] motion-safe:animate-pulse max-[650px]:hidden" />
          <span className="size-7 rounded-md bg-[#eef1f4] motion-safe:animate-pulse max-[650px]:hidden" />
          <span className="h-8 w-28 rounded-lg bg-[#dce3ee] motion-safe:animate-pulse" />
        </div>
      </header>
      <div className="flex h-8 shrink-0 items-center gap-4 border-b border-[#e7eaf0] bg-white px-4 motion-safe:animate-pulse" aria-hidden="true">
        {[40, 32, 36, 44, 28].map((width) => <span key={width} className="h-3 rounded bg-[#e8ebf0]" style={{ width }} />)}
      </div>
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-[#e7eaf0] bg-white px-3 motion-safe:animate-pulse" aria-hidden="true">
        <span className="h-6 w-16 rounded bg-[#e8ebf0]" />
        <span className="h-6 w-28 rounded bg-[#e8ebf0]" />
        <span className="h-6 w-12 rounded bg-[#e8ebf0]" />
        <span className="h-6 w-28 rounded bg-[#e8ebf0] max-[650px]:hidden" />
        <span className="h-6 w-20 rounded bg-[#e8ebf0] max-[950px]:hidden" />
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_420px] bg-[#f7f8fa] max-[1200px]:grid-cols-[minmax(0,1fr)_360px] max-[950px]:grid-cols-[minmax(0,1fr)_300px] max-[650px]:grid-cols-1 max-[650px]:grid-rows-[auto_auto] max-[650px]:overflow-y-auto">
        <main className="flex min-h-0 min-w-0 flex-col max-[650px]:h-[60dvh]">
          <div className="h-6 shrink-0 border-b border-[#e3e6eb] bg-white" aria-hidden="true" />
          <div className="min-h-0 flex-1 overflow-hidden px-5 py-6">
            <div className="mx-auto h-full min-h-[420px] w-full max-w-[816px] bg-white px-[9%] py-12 shadow-sm">
              <p className="text-[13px] text-muted">Opening document…</p>
              <div className="mt-10 space-y-4 motion-safe:animate-pulse" aria-hidden="true">
                <div className="h-3 w-[82%] rounded bg-[#edf0f4]" />
                <div className="h-3 w-[94%] rounded bg-[#edf0f4]" />
                <div className="h-3 w-[67%] rounded bg-[#edf0f4]" />
              </div>
            </div>
          </div>
          <div className="flex h-7 shrink-0 items-center gap-6 border-t border-[#e3e6eb] bg-white px-4 text-[11px] text-muted" aria-hidden="true">
            <span className="h-3 w-12 rounded bg-[#e8ebf0]" /><span>English (US)</span>
          </div>
        </main>
        <aside className="flex min-h-0 min-w-0 flex-col border-l border-[#e3e6eb] bg-white max-[650px]:min-h-[420px] max-[650px]:border-l-0 max-[650px]:border-t">
          <div className="flex min-h-16 items-center border-b border-[#e9edf2] px-[15px] text-[13px] font-semibold text-[#293547]">
            AI Assistant
          </div>
          <div className="flex-1 p-[15px] motion-safe:animate-pulse" aria-hidden="true">
            <div className="max-w-80 space-y-3 rounded-xl border border-[#e1e7ef] p-4">
              <div className="h-4 w-24 rounded bg-[#e8ebf0]" />
              <div className="h-3 w-36 rounded bg-[#e8ebf0]" />
              <div className="h-3 w-full rounded bg-[#eef1f4]" />
              <div className="h-12 rounded-lg bg-[#f5f7fa]" />
            </div>
          </div>
          <div className="border-t border-[#e8edf3] p-3" aria-hidden="true">
            <div className="h-24 rounded-[11px] border border-[#dfe6ef] bg-[#fbfcfe]" />
          </div>
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
      pendingLoad.current = {
        id: documentId,
        promise: openDocument(documentId),
      };
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
