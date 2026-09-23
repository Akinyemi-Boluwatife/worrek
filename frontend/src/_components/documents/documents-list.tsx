import Link from "next/link";

import type { DocumentListItem } from "@/_lib/documents";

function formatSize(size: number | null) {
  if (size === null) return "Word document";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function DocumentIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-6"
      aria-hidden="true"
    >
      <path d="M6.5 2.75h7l4 4v13.5a1 1 0 0 1-1 1h-10a1 1 0 0 1-1-1v-16.5a1 1 0 0 1 1-1Z" />
      <path d="M13.5 2.75v4h4M8.5 12h6M8.5 15.5h6" />
    </svg>
  );
}

export function DocumentsList({ documents }: { documents: DocumentListItem[] }) {
  if (documents.length === 0) {
    return (
      <div className="flex min-h-72 flex-col items-center justify-center rounded-xl border border-[#dce1e8] bg-white px-6 py-12 text-center shadow-[0_16px_40px_-32px_#35466852]">
        <div className="flex size-14 items-center justify-center rounded-xl bg-brand-light text-brand">
          <DocumentIcon />
        </div>
        <h2 className="mt-5 text-[18px] font-[650] tracking-[-0.4px]">
          No documents yet
        </h2>
        <p className="mt-2 max-w-sm text-[13px] leading-[1.7] text-muted">
          Create a new document or import a Word file to see it here.
        </p>
      </div>
    );
  }

  return (
    <ul className="overflow-hidden rounded-xl border border-[#dce1e8] bg-white shadow-[0_16px_40px_-32px_#35466852]">
      {documents.map((document) => (
        <li key={document.id} className="border-b border-[#e9ecf0] last:border-b-0">
          <Link
            href={`/editor/${document.id}`}
            className="flex min-w-0 items-center gap-4 px-5 py-5 transition-colors hover:bg-[#f7f9fc] focus-visible:outline-3 focus-visible:outline-offset-[-3px] focus-visible:outline-brand max-[651px]:gap-3 max-[651px]:px-4"
            aria-label={`Open ${document.title}`}
          >
            <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-brand-light text-brand">
              <DocumentIcon />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-[14px] font-[650] text-foreground">
                {document.title}
              </h3>
              <p className="mt-1 truncate text-[11px] text-muted">
                {document.fileName}
              </p>
            </div>
            <div className="shrink-0 text-right text-[11px] leading-[1.7] text-muted">
              <p>{formatDate(document.updatedAt)}</p>
              <p>{formatSize(document.size)}</p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
