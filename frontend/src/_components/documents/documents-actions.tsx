"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { uploadDocument } from "@/_lib/documents";

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
          className="inline-flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-lg border border-[#d4d8de] bg-white px-5 text-[12px] font-[650] text-foreground transition-colors hover:border-[#b8cbed] hover:bg-brand-light focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-65 motion-reduce:transition-none sm:flex-none"
        >
          {isImporting ? "Importing…" : "Import file document"}
        </button>
        <Link
          href="/editor/new"
          className="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg bg-brand px-5 text-[12px] font-[650] text-white transition-colors hover:bg-brand-hover focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-brand motion-reduce:transition-none sm:flex-none"
        >
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
