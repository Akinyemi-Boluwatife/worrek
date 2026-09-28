import type { Metadata } from "next";
import { Suspense } from "react";

import { LogoutButton } from "@/_components/auth/logoutButton";
import { DocumentsActions } from "@/_components/documents/documentsActions";
import { SavedDocumentsSection } from "@/_components/documents/savedDocumentsSection";
import { Brand } from "@/_components/landing/brand";
import { SavedDocumentsSkeleton } from "@/_components/documents/savedDocumentsSkeleton";

export const prefetch = "partial";

export const metadata: Metadata = {
  title: "My documents — Worrek",
  description: "Your saved documents in Worrek.",
};

export default function DocumentsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#fafbfc]">
      <header className="sticky top-0 z-40 border-b border-[#e2e8f0] bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-20 w-full max-w-6xl items-center justify-between px-6 max-[651px]:h-[70px]">
          <Brand />
          <LogoutButton />
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 pb-20 pt-14 max-[651px]:pt-10">
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-6">
          <div>
            <p className="text-xs font-semibold tracking-widest text-brand uppercase">
              Your workspace
            </p>
            <h1 className="mt-3 text-[clamp(36px,4vw,48px)] leading-[1.1] font-extrabold tracking-tight text-[#0f172a]">
              My documents
            </h1>
            <p className="mt-2 text-base text-[#64748b]">
              Your writing, all in one place.
            </p>
          </div>
          <DocumentsActions />
        </div>

        <Suspense fallback={<SavedDocumentsSkeleton />}>
          <SavedDocumentsSection />
        </Suspense>
      </main>
    </div>
  );
}
