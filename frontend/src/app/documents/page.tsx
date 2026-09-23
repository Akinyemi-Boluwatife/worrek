import type { Metadata } from "next";
import { Suspense } from "react";

import { LogoutButton } from "@/_components/auth/logout-button";
import { DocumentsActions } from "@/_components/documents/documents-actions";
import { SavedDocumentsSection } from "@/_components/documents/saved-documents-section";
import { SavedDocumentsSkeleton } from "@/_components/documents/saved-documents-skeleton";
import { Brand } from "@/_components/landing/brand";

export const metadata: Metadata = {
  title: "My documents — Worrek",
  description: "Your saved documents in Worrek.",
};

export default function DocumentsPage() {
  return (
    <>
      <header className="page-wrap flex h-28 items-center justify-between max-[651px]:h-[86px]">
        <Brand />
        <LogoutButton />
      </header>

      <main className="page-wrap flex-1 pb-20 pt-10 max-[651px]:pt-5">
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-6">
          <div>
            <p className="text-[11px] font-[650] tracking-[0.12em] text-brand uppercase">
              Your workspace
            </p>
            <h1 className="mt-3 text-[clamp(34px,4vw,52px)] leading-[1.12] font-[650] tracking-[-2px]">
              My documents
            </h1>
            <p className="mt-4 text-[14px] leading-[1.8] text-muted">
              Your writing, all in one place.
            </p>
          </div>
          <DocumentsActions />
        </div>

        <Suspense fallback={<SavedDocumentsSkeleton />}>
          <SavedDocumentsSection />
        </Suspense>
      </main>
    </>
  );
}
