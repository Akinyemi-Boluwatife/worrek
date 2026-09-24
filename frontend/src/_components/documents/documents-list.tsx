"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { deleteDocumentForever, moveDocumentToTrash, renameDocument, restoreDocument } from "@/_lib/document-actions";
import type { DocumentListItem } from "@/_lib/document-client";
import { formatDate, formatSize } from "@/_lib/utils";

type View = "active" | "trash";
type Sort = "recent" | "oldest" | "name";
type Dialog = { type: "rename" | "delete"; document: DocumentListItem } | null;

function DocumentIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-6" aria-hidden="true"><path d="M6.5 2.75h7l4 4v13.5a1 1 0 0 1-1 1h-10a1 1 0 0 1-1-1v-16.5a1 1 0 0 1 1-1Z" /><path d="M13.5 2.75v4h4M8.5 12h6M8.5 15.5h6" /></svg>;
}

export function DocumentsList({ active, trash, error }: { active: DocumentListItem[]; trash: DocumentListItem[]; error: string }) {
  const [view, setView] = useState<View>("active");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("recent");
  const [menuId, setMenuId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [title, setTitle] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointer(event: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuId(null);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") { setMenuId(null); if (!pending) setDialog(null); }
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onPointer); document.removeEventListener("keydown", onKey); };
  }, [pending]);

  useEffect(() => {
    if (dialog) dialogRef.current?.querySelector<HTMLElement>("input, button")?.focus();
  }, [dialog]);

  useEffect(() => {
    if (menuId) menuRef.current?.querySelector<HTMLButtonElement>("[role=menuitem]")?.focus();
  }, [menuId]);

  function onDialogKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Tab") return;
    const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("input:not(:disabled), button:not(:disabled)"));
    const first = controls[0];
    const last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }

  const visible = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    return (view === "active" ? active : trash)
      .filter((item) => !term || item.title.toLocaleLowerCase().includes(term) || item.fileName.toLocaleLowerCase().includes(term))
      .toSorted((a, b) => sort === "name" ? a.title.localeCompare(b.title, undefined, { sensitivity: "base" }) : (sort === "recent" ? -1 : 1) * (new Date((view === "trash" ? a.deletedAt : a.updatedAt) ?? a.updatedAt).getTime() - new Date((view === "trash" ? b.deletedAt : b.updatedAt) ?? b.updatedAt).getTime()));
  }, [active, trash, query, sort, view]);

  async function runAction(action: "trash" | "restore" | "delete", id: string) {
    setPending(true); setMessage(""); setMenuId(null);
    const result = action === "trash" ? await moveDocumentToTrash(id) : action === "restore" ? await restoreDocument(id) : await deleteDocumentForever(id);
    setPending(false);
    if (!result.success) { setMessage(result.message); return; }
    setDialog(null);
  }

  async function submitRename(event: React.FormEvent) {
    event.preventDefault();
    if (!dialog || dialog.type !== "rename") return;
    const trimmed = title.trim();
    if (!trimmed || trimmed.length > 255) { setMessage("Enter a document name up to 255 characters."); return; }
    setPending(true); setMessage("");
    const result = await renameDocument(dialog.document.id, trimmed);
    setPending(false);
    if (!result.success) { setMessage(result.message); return; }
    setDialog(null);
  }

  return <section aria-label="Saved documents" className="mt-12 pb-16">
    <div className="flex flex-col gap-4 pb-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-baseline gap-3" aria-label="Document views">
        <button type="button" onClick={() => { setView("active"); setMenuId(null); setMessage(""); }} aria-current={view === "active" ? "page" : undefined} className={`text-xl font-bold tracking-tight focus-visible:outline-2 focus-visible:outline-brand ${view === "active" ? "text-[#0f172a]" : "text-slate-400 hover:text-[#0f172a]"}`}>Saved documents</button>
        <span className="text-sm font-medium text-slate-400">{active.length} {active.length === 1 ? "document" : "documents"}</span>
        <button type="button" onClick={() => { setView("trash"); setMenuId(null); setMessage(""); }} aria-current={view === "trash" ? "page" : undefined} className={`rounded-md px-2 py-1 text-sm font-medium focus-visible:outline-2 focus-visible:outline-brand ${view === "trash" ? "bg-brand-light text-brand" : "text-slate-500 hover:bg-white hover:text-brand"}`}>Trash{trash.length ? ` (${trash.length})` : ""}</button>
      </div>
      <div className="flex items-center gap-2">
        <label className="relative block min-w-0 flex-1 sm:flex-none"><span className="sr-only">Search documents</span><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8d95a4]"><circle cx="10.8" cy="10.8" r="6.6"/><path d="m16 16 4.5 4.5"/></svg><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search documents..." className="h-10 w-full rounded-lg border border-[#dfe3ea] bg-white pl-10 pr-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 sm:w-64" /></label>
        <label className="sr-only" htmlFor="document-sort">Sort documents</label><select id="document-sort" value={sort} onChange={(event) => setSort(event.target.value as Sort)} className="h-10 rounded-lg border border-[#dfe3ea] bg-white px-3 text-sm font-medium text-[#475569] shadow-sm focus:border-brand focus:outline-2 focus:outline-brand"><option value="recent">Recent</option><option value="oldest">Oldest</option><option value="name">Name</option></select>
      </div>
    </div>
    {message && !dialog ? <p role="alert" className="mt-4 text-sm text-[#a34141]">{message}</p> : null}
    {error ? <div role="alert" className="rounded-2xl border border-[#dce1e8] bg-white px-5 py-6 text-sm text-[#9b4141]">{error} Refresh the page to try again.</div> : visible.length === 0 ? <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-[#e4e8ee] bg-white px-6 py-12 text-center shadow-sm"><span className="flex size-14 items-center justify-center rounded-xl bg-brand-light text-brand"><DocumentIcon /></span><h2 className="mt-5 text-lg font-semibold">{query.trim() ? "No matching documents" : view === "trash" ? "Trash is empty" : "No documents yet"}</h2><p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">{query.trim() ? "Try a different title or filename." : view === "trash" ? "Documents you move to Trash will appear here." : "Create a new document or import a Word file to see it here."}</p></div> : <ul className="overflow-visible rounded-2xl border border-[#e2e8f0] bg-white shadow-sm">{visible.map((item) => <li key={item.id} className="relative flex min-w-0 items-center border-b border-[#f1f5f9] last:border-b-0 hover:bg-[#f8fafc]">
      {view === "active" ? <Link href={`/editor/${item.id}`} aria-label={`Open ${item.title}`} className="group flex min-w-0 flex-1 items-center gap-4 px-4 py-4 focus-visible:outline-2 focus-visible:outline-brand sm:px-5 sm:py-5"><span className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-[#dbe8fe] bg-[#eff5ff] text-brand"><DocumentIcon /></span><span className="min-w-0 flex-1"><strong className="block truncate text-base font-semibold text-[#334155] group-hover:text-brand">{item.title}</strong><span className="mt-0.5 block truncate text-sm text-[#64748b]">{item.fileName}</span></span><span className="hidden shrink-0 text-right text-sm leading-5 text-[#64748b] sm:block"><span className="block">{formatDate(item.updatedAt)}</span><span>{formatSize(item.size)}</span></span></Link> : <div className="flex min-w-0 flex-1 items-center gap-4 px-4 py-4 sm:px-5 sm:py-5"><span className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-[#e2e8f0] bg-[#f1f5f9] text-[#778293]"><DocumentIcon /></span><span className="min-w-0 flex-1"><strong className="block truncate text-base font-semibold text-[#334155] group-hover:text-brand">{item.title}</strong><span className="mt-0.5 block truncate text-sm text-[#64748b]">{item.fileName}</span></span><span className="hidden shrink-0 text-right text-sm leading-5 text-[#64748b] sm:block"><span className="block">{formatDate(item.deletedAt ?? item.updatedAt)}</span><span>{formatSize(item.size)}</span></span></div>}
      <div ref={menuId === item.id ? menuRef : undefined} className="relative mr-3 shrink-0 sm:mr-5"><button type="button" aria-label={`More options for ${item.title}`} aria-expanded={menuId === item.id} aria-haspopup="menu" onClick={() => setMenuId(menuId === item.id ? null : item.id)} disabled={pending} className="flex size-9 items-center justify-center rounded-lg text-[#94a3b8] hover:bg-[#f1f5f9] focus-visible:outline-2 focus-visible:outline-brand disabled:opacity-50"><svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="size-5"><circle cx="12" cy="5" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="12" cy="19" r="1.7"/></svg></button>{menuId === item.id ? <div role="menu" aria-label={`Options for ${item.title}`} className="absolute right-0 top-full z-20 mt-1 min-w-44 rounded-lg border border-[#dfe3ea] bg-white p-1 shadow-lg" onKeyDown={(event) => { if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("button")); const index = buttons.indexOf(document.activeElement as HTMLButtonElement); buttons[(index + (event.key === "ArrowDown" ? 1 : buttons.length - 1)) % buttons.length]?.focus(); } }}>
        {view === "active" ? <><button role="menuitem" type="button" onClick={() => { setTitle(item.title); setMessage(""); setDialog({ type: "rename", document: item }); setMenuId(null); }} className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-[#f2f5fa] focus:bg-[#f2f5fa]">Rename</button><button role="menuitem" type="button" onClick={() => void runAction("trash", item.id)} className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-[#f2f5fa] focus:bg-[#f2f5fa]">Move to Trash</button></> : <><button role="menuitem" type="button" onClick={() => void runAction("restore", item.id)} className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-[#f2f5fa] focus:bg-[#f2f5fa]">Restore</button><button role="menuitem" type="button" onClick={() => { setMessage(""); setDialog({ type: "delete", document: item }); setMenuId(null); }} className="block w-full rounded-md px-3 py-2 text-left text-sm text-[#a34141] hover:bg-[#fff3f3] focus:bg-[#fff3f3]">Delete forever</button></>}
      </div> : null}</div>
    </li>)}</ul>}
    {dialog ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#151d2a]/45 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !pending) setDialog(null); }}><div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="document-dialog-title" onKeyDown={onDialogKeyDown} className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"><h2 id="document-dialog-title" className="text-lg font-semibold">{dialog.type === "rename" ? "Rename document" : "Delete document forever?"}</h2>{dialog.type === "rename" ? <form onSubmit={(event) => void submitRename(event)}><label htmlFor="document-title" className="mt-5 block text-sm font-medium">Document name</label><input id="document-title" value={title} maxLength={255} onChange={(event) => setTitle(event.target.value)} className="mt-2 h-11 w-full rounded-lg border border-[#dfe3ea] px-3 text-sm focus:border-brand focus:outline-2 focus:outline-brand" />{message ? <p role="alert" className="mt-2 text-sm text-[#a34141]">{message}</p> : null}<div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setDialog(null)} disabled={pending} className="rounded-lg border border-[#dfe3ea] px-4 py-2 text-sm">Cancel</button><button type="submit" disabled={pending} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{pending ? "Saving…" : "Save name"}</button></div></form> : <><p className="mt-3 text-sm leading-relaxed text-muted">“{dialog.document.title}” and its Word file will be permanently removed. This cannot be undone.</p>{message ? <p role="alert" className="mt-3 text-sm text-[#a34141]">{message}</p> : null}<div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setDialog(null)} disabled={pending} className="rounded-lg border border-[#dfe3ea] px-4 py-2 text-sm">Cancel</button><button type="button" onClick={() => void runAction("delete", dialog.document.id)} disabled={pending} className="rounded-lg bg-[#a34141] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{pending ? "Deleting…" : "Delete forever"}</button></div></>}</div></div> : null}
  </section>;
}
