"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { uploadDocument } from "@/_lib/document-client";

const MAX_DOCX_BYTES = 10 * 1024 * 1024;

export function DocumentsActions() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  async function onImport(file: File) {
    setMessage("");

    if (!file.name.toLowerCase().endsWith(".docx")) {
      setIsError(true);
      setMessage("Choose a .docx document to import.");
      return;
    }

    if (file.size === 0 || file.size > MAX_DOCX_BYTES) {
      setIsError(true);
      setMessage(
        file.size === 0
          ? "This document is empty. Choose another file."
          : "This document is larger than the 10 MiB limit.",
      );
      return;
    }

    setIsImporting(true);

    const formData = new FormData();
    formData.set("file", file);

    const result = await uploadDocument(formData);

    if (result.success) {
      router.refresh();
      router.push(`/editor/${result.document.id}`);
      return;
    }

    setIsImporting(false);
    setIsError(true);
    setMessage(result.message);
  }

  return (
    <div className="flex w-full flex-col items-start gap-3 sm:w-auto sm:items-end">
      <div className="flex w-full flex-wrap gap-3 sm:w-auto">
        <input
          ref={fileInputRef}
          type="file"
          accept=".docx"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void onImport(file);
            event.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isImporting}
          className="inline-flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#e2e8f0] bg-white px-4 text-sm font-medium text-[#334155] shadow-sm transition-colors hover:border-[#cbd5e1] hover:bg-[#f8fafc] focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-65 motion-reduce:transition-none sm:flex-none"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4 text-[#64748b]"><path d="M4 16v1a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-1M8 8l4-4 4 4M12 4v12" /></svg>
          {isImporting ? "Importing…" : "Import file document"}
        </button>
        <Link
          href="/editor/new"
          className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-brand px-5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-hover focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-brand motion-reduce:transition-none sm:flex-none"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4"><path d="M12 4v16M4 12h16" /></svg>
          New document
        </Link>
      </div>
      {message ? (
        <p
          role={isError ? "alert" : "status"}
          className={`text-[12px] leading-relaxed ${isError ? "text-[#9b4141]" : "text-[#317044]"}`}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
