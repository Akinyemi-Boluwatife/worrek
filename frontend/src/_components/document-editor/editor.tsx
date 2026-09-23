"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  DocxEditor,
  LocaleProvider,
  useDocxEditor,
  useEditorSnapshot,
} from "@docx-editor.dev/react";
import type { DocxEditorInstance } from "@docx-editor.dev/core/editor";
import en from "@docx-editor.dev/i18n/en";
import "@docx-editor.dev/core/styles/editor.css";
import { LogoutButton } from "@/_components/auth/logout-button";
import { renameDocument } from "@/_lib/document-actions";
import { openDocument, saveDocument, uploadDocument, type OpenDocumentResult } from "@/_lib/documents";
import { useEditorStore } from "@/_stores/editor.store";
import styles from "./editor.module.css";

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function WordCount() {
  const editor = useDocxEditor();
  useEditorSnapshot(editor);

  const count = countWords(editor);
  return <span>{count} words</span>;
}

function countWords(editor: DocxEditorInstance | null): number {
  if (!editor) return 0;
  const paragraphs = editor.query({ type: "paragraphs" });
  return paragraphs.reduce(
    (total, paragraph) =>
      total + paragraph.text.trim().split(/\s+/).filter(Boolean).length,
    0,
  );
}

export function Editor({
  newDocument = false,
  documentId,
  documentLoad,
}: {
  newDocument?: boolean;
  documentId?: string;
  documentLoad?: Promise<OpenDocumentResult>;
}) {
  const router = useRouter();
  const editorRef = useRef<{ save: () => Promise<ArrayBuffer> } | null>(null);
  const loadSequence = useRef(0);
  const [buffer, setBuffer] = useState<ArrayBuffer | null>(null);
  const [isLoadingDocument, setIsLoadingDocument] = useState(Boolean(documentId));
  const [isEditorReady, setIsEditorReady] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [isSavingName, startNameTransition] = useTransition();
  const [renameError, setRenameError] = useState("");
  const [fileName, setFileName] = useState(
    newDocument ? "Untitled document.docx" : "document.docx",
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isBlank = buffer === null && !newDocument;
  const currentDocumentId = useEditorStore((state) => state.currentDocumentId);

  const currentDocumentTitle = useEditorStore(
    (state) => state.currentDocumentTitle,
  );
  const isDocumentSaved = useEditorStore((state) => state.isDocumentSaved);
  const saveStatus = useEditorStore((state) => state.saveStatus);
  const saveError = useEditorStore((state) => state.saveError);
  const setCurrentDocument = useEditorStore(
    (state) => state.setCurrentDocument,
  );
  const setDocumentTitle = useEditorStore((state) => state.setDocumentTitle);
  const setSaveStatus = useEditorStore((state) => state.setSaveStatus);
  const resetDocument = useEditorStore((state) => state.resetDocument);

  useEffect(() => {
    resetDocument();
    if (!documentId) return;

    let cancelled = false;
    const sequence = ++loadSequence.current;
    editorRef.current = null;
    void (documentLoad ?? openDocument(documentId)).then((result) => {
      if (cancelled || sequence !== loadSequence.current) return;
      if (result.success) {
        editorRef.current = null;
        setIsEditorReady(false);
        setBuffer(result.content);
        setFileName(result.document.fileName);
        setCurrentDocument({
          id: result.document.id,
          title: result.document.title,
        });
      } else {
        setLoadError(result.message);
      }
      setIsLoadingDocument(false);
    });

    return () => { cancelled = true; };
  }, [documentId, documentLoad, resetDocument, setCurrentDocument]);

  const isSaving = saveStatus === "saving";
  const saveLabel = isSaving
    ? "Saving…"
    : isDocumentSaved
      ? "Saved to Worrek"
      : currentDocumentId
        ? "Save changes"
        : "Save to Worrek";

  async function onFileSelect(file: File) {
    ++loadSequence.current;
    editorRef.current = null;
    setIsEditorReady(false);
    setIsRenaming(false);
    setRenameError("");
    setBuffer(await file.arrayBuffer());
    setFileName(file.name);
    setLoadError("");
    setIsLoadingDocument(false);
    resetDocument();
    setDocumentTitle(file.name.replace(/\.docx$/i, ""));
  }

  function onFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void onFileSelect(file);
    e.target.value = "";
  }

  function onSaveName(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = draftTitle.trim();
    if (!title || title.length > 255) {
      setRenameError("Enter a document name up to 255 characters.");
      return;
    }

    if (currentDocumentId) {
      startNameTransition(async () => {
        const result = await renameDocument(currentDocumentId, title);
        if (!result.success) {
          setRenameError(result.message);
          return;
        }
        setDocumentTitle(result.title);
        setRenameError("");
        setIsRenaming(false);
      });
      return;
    }

    setDocumentTitle(title);
    setRenameError("");
    setIsRenaming(false);
  }

  async function onSaveToWorrek() {
    if (isBlank || isLoadingDocument || !isEditorReady || isSaving) return;

    setSaveStatus("saving");

    try {
      const out = await editorRef.current?.save();

      if (!out) {
        setSaveStatus(
          "error",
          "We couldn't read this document. Please try again.",
        );
        return;
      }

      let result;
      if (currentDocumentId) {
        result = await saveDocument(currentDocumentId, out);
      } else {
        const file = new File([out], fileName, { type: DOCX_MIME });
        const formData = new FormData();
        formData.set("file", file);
        formData.set("title", currentDocumentTitle || fileName.replace(/\.docx$/i, ""));
        result = await uploadDocument(formData);
      }

      if (result.success) {
        setCurrentDocument({
          id: result.document.id,
          title: result.document.title,
        });
        if (!currentDocumentId) router.replace(`/editor/${result.document.id}`);
        return;
      }

      setSaveStatus("error", result.message);
    } catch (error) {
      console.error(
        "Saving document to Worrek failed:",
        error instanceof Error ? error.message : "Unknown error",
      );

      setSaveStatus(
        "error",
        "We couldn't save this document right now. Please try again.",
      );
    }
  }

  async function onSaveDocx() {
    if (!isEditorReady) return;
    const out = await editorRef.current?.save();
    if (!out) return;
    const blob = new Blob([out], { type: DOCX_MIME });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className={`${styles.frame} flex h-dvh min-w-0 flex-col overflow-hidden bg-[#eef1f6]`}>
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[#e3e6eb] bg-white px-4 py-2 print:hidden">
        <Link href="/documents" className="text-[13px] font-[650] text-foreground">
          Worrek
        </Link>
        <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
          {isRenaming ? (
            <form onSubmit={onSaveName} className="flex min-w-0 items-center gap-1.5">
              <input
                autoFocus
                aria-label="Document name"
                maxLength={255}
                value={draftTitle}
                onChange={(event) => {
                  setDraftTitle(event.target.value);
                  setRenameError("");
                }}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    setIsRenaming(false);
                    setRenameError("");
                  }
                }}
                disabled={isSavingName}
                className="w-40 min-w-0 rounded-md border border-[#d9dde4] px-2 py-1 text-[12px] text-foreground outline-none focus:border-brand"
              />
              <button type="submit" disabled={isSavingName} className="cursor-pointer rounded-md bg-brand px-2.5 py-1.5 text-[12px] font-[650] text-white disabled:opacity-65">
                {isSavingName ? "Saving…" : "Save name"}
              </button>
              <button type="button" disabled={isSavingName} onClick={() => { setIsRenaming(false); setRenameError(""); }} className="cursor-pointer rounded-md border border-[#d9dde4] px-2.5 py-1.5 text-[12px] font-[650] text-foreground disabled:opacity-65">
                Cancel
              </button>
            </form>
          ) : (
            <>
              <span className="max-w-48 truncate text-[12px] text-muted max-[650px]:max-w-28">
                {currentDocumentTitle || fileName}
              </span>
              {!isBlank && !isLoadingDocument ? (
                <button
                  type="button"
                  onClick={() => {
                    setDraftTitle(currentDocumentTitle || fileName.replace(/\.docx$/i, ""));
                    setRenameError("");
                    setIsRenaming(true);
                  }}
                  disabled={isSaving}
                  className="shrink-0 cursor-pointer rounded-md border border-[#d9dde4] bg-white px-2.5 py-1.5 text-[12px] font-[650] text-foreground hover:border-[#b8cbed] disabled:opacity-65"
                >
                  Rename
                </button>
              ) : null}
            </>
          )}
          {renameError ? <span role="alert" className="max-w-48 text-[11px] text-[#9b4141]">{renameError}</span> : null}
          {saveStatus === "error" && saveError ? (
            <span
              className="max-w-48 truncate text-[11px] text-[#9b4141] max-[650px]:max-w-28"
              role="alert"
              title={saveError}
            >
              {saveError}
            </span>
          ) : null}
          <input
            ref={fileInputRef}
            type="file"
            accept=".docx"
            className="hidden"
            onChange={onFileInputChange}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="shrink-0 cursor-pointer rounded-md border border-[#d9dde4] bg-white px-2.5 py-1.5 text-[12px] font-[650] text-foreground hover:border-[#b8cbed]"
          >
            Open .docx
          </button>
          <button
            type="button"
            onClick={() => void onSaveDocx()}
            className="shrink-0 cursor-pointer rounded-md border border-[#d9dde4] bg-white px-2.5 py-1.5 text-[12px] font-[650] text-foreground hover:border-[#b8cbed]"
          >
            Save .docx
          </button>
          <button
            type="button"
            onClick={() => void onSaveToWorrek()}
            disabled={isBlank || isLoadingDocument || !isEditorReady || isSaving || isRenaming}
            className="shrink-0 cursor-pointer rounded-md border border-brand bg-brand px-2.5 py-1.5 text-[12px] font-[650] text-white hover:border-brand-hover hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-65"
          >
            {saveLabel}
          </button>
          <LogoutButton />
        </div>
      </header>

      <LocaleProvider i18n={en}>
        <DocxEditor.Root
          document={buffer ?? (newDocument ? "blank" : undefined)}
          onReady={(instance) => {
            editorRef.current = instance;
            setIsEditorReady(buffer !== null || newDocument);
            if (documentId && buffer && performance.getEntriesByName("document-open:body", "mark").length) {
              performance.mark("document-open:ready");
              performance.measure("document-open:editor-ready", "document-open:body", "document-open:ready");
              performance.measure("document-open:total", "document-open:start", "document-open:ready");
              performance.clearMarks("document-open:body");
            }
          }}
          onChange={() => {
            if (currentDocumentId && saveStatus === "saved") setSaveStatus("idle");
          }}
        >
          <DocxEditor.Menu
            className={`${styles.menuBar} flex shrink-0 items-center gap-0.5 border-b border-[#eef0f4] bg-white px-2.5 font-sans text-[11px] h-[37px] print:hidden`}
            fileName={currentDocumentTitle || fileName.replace(/\.docx$/i, "")}
            onOpen={() => fileInputRef.current?.click()}
            onSave={() => void onSaveDocx()}
          />

          <DocxEditor.Toolbar
            preset={false}
            overflow={false}
            className={`${styles.ribbon} border-b border-[#e3e6eb] px-2.5 py-1.5 gap-0.5 print:hidden`}
          >
            <DocxEditor.Toolbar.Undo />
            <DocxEditor.Toolbar.Redo />
            <DocxEditor.Toolbar.Separator />
            <DocxEditor.Toolbar.FontFamily />
            <DocxEditor.Toolbar.FontSize />
            <DocxEditor.Toolbar.Separator />
            <DocxEditor.Toolbar.Bold />
            <DocxEditor.Toolbar.Italic />
            <DocxEditor.Toolbar.Underline />
            <DocxEditor.Toolbar.Strike />
            <DocxEditor.Toolbar.FontColor />
            <DocxEditor.Toolbar.Highlight />
            <DocxEditor.Toolbar.Separator />
            <DocxEditor.Toolbar.StylePicker />
            <DocxEditor.Toolbar.Alignment />
            <DocxEditor.Toolbar.BulletList />
            <DocxEditor.Toolbar.NumberedList />
            <DocxEditor.Toolbar.Outdent />
            <DocxEditor.Toolbar.Indent />
            <DocxEditor.Toolbar.LineSpacing />
            <DocxEditor.Toolbar.Separator />
            <DocxEditor.Toolbar.Link />
            <DocxEditor.Toolbar.ClearFormatting />
            <DocxEditor.Toolbar.Button slot="format.painter" />
            <span className="ml-auto" />
            <DocxEditor.Toolbar.EditingMode />
            <DocxEditor.Toolbar.Zoom />
          </DocxEditor.Toolbar>

          <div
            className={`${styles.workspace} relative grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_324px] grid-rows-[minmax(0,1fr)] bg-[#f7f8fa] max-[950px]:grid-cols-[minmax(0,1fr)_242px] max-[650px]:grid-cols-1 max-[650px]:grid-rows-[auto_auto] max-[650px]:overflow-y-auto`}
          >
            <section
              className={`${styles.documentStage} flex min-h-0 min-w-0 flex-col overflow-hidden max-[650px]:h-[60dvh]`}
            >
              <DocxEditor.HorizontalRuler className="print:hidden" />
              <div className={`${styles.scrollArea} relative min-h-0 min-w-0 flex-1 overflow-hidden`}>
                <DocxEditor.Navigation />
                <DocxEditor.Viewport>
                  <DocxEditor.VerticalRuler className="print:hidden" />
                  <DocxEditor.Loading>
                    <DocxEditor.Loading.Spinner />
                    <span className="ml-2.5 text-[13px] text-muted">
                      Opening document…
                    </span>
                  </DocxEditor.Loading>
                  <DocxEditor.Content />
                  <DocxEditor.HyperLink />
                  <DocxEditor.ContextMenu />
                  <DocxEditor.HeaderFooterChrome />
                  <DocxEditor.PageNumber />
                </DocxEditor.Viewport>
              </div>
              <div className="flex shrink-0 items-center gap-6 border-t border-[#e3e6eb] bg-white px-4 py-1 text-[11px] text-muted print:hidden">
                <span className="shrink-0">
                  <WordCount />
                </span>
                <span className="shrink-0">English (US)</span>
                <DocxEditor.Toolbar
                  preset={false}
                  overflow={false}
                  className={`${styles.statusZoom} ml-auto shrink-0`}
                >
                  <DocxEditor.Toolbar.Zoom />
                </DocxEditor.Toolbar>
              </div>
            </section>

            <aside
              className={`${styles.aiPanel} flex min-h-0 min-w-0 flex-col border-l border-[#e3e6eb] bg-white max-[650px]:border-l-0 max-[650px]:border-t`}
            >
              <div className="flex h-[47px] shrink-0 items-center justify-between border-b border-[#eef0f4] px-[17px] text-[11px] font-semibold text-[#454f60]">
                <span>Worrek AI Agent</span>
                {!isBlank ? (
                  <span className="max-w-44 truncate text-[10px] font-medium text-[#98a1af]">
                    {currentDocumentTitle || fileName}
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-[15px] font-normal text-[#a1a8b4]" aria-hidden="true">
                    ＋ <span>···</span>
                  </span>
                )}
              </div>
              {isBlank && (isLoadingDocument || loadError) ? (
                <div className="m-auto px-6 text-center text-[13px] text-muted" role={loadError ? "alert" : "status"}>
                  {loadError || "Opening document…"}
                  {loadError ? <p className="mt-3"><Link href="/documents" className="text-brand underline">Back to documents</Link></p> : null}
                </div>
              ) : isBlank ? (
                <button
                  type="button"
                  className="m-auto flex w-[min(240px,calc(100%-48px))] cursor-pointer flex-col items-center justify-center gap-2 rounded-[14px] border-2 border-dashed border-[#ccd4e0] bg-[#fafbfd] px-5 py-[26px] text-center transition-colors hover:border-[#a8bce6] hover:bg-[#f4f8ff] max-[650px]:my-4"
                  onClick={() => fileInputRef.current?.click()}
                  onMouseDown={(e) => e.preventDefault()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files?.[0];
                    if (file) void onFileSelect(file);
                  }}
                >
                  <span
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-[#eaf1ff] text-[26px] font-light leading-none text-brand"
                    aria-hidden="true"
                  >
                    ＋
                  </span>
                  <span className="text-[14px] font-[650] text-[#454f60]">
                    Open a Word document
                  </span>
                  <span className="max-w-60 text-[11px] leading-relaxed text-[#98a1af]">
                    Drop a .docx here or browse to start editing with AI
                  </span>
                </button>
              ) : (
                <>
                  <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 max-[650px]:px-[18px] max-[650px]:py-[17px]">
                    <div className="rounded-[10px] border border-[#e4e8ee] bg-[#f7f8fa] px-3.5 py-3 text-[12px] leading-relaxed text-[#79818f]">
                      Ask me anything about this document — edits, rewrites, or
                      summaries.
                    </div>
                  </div>
                  <div className="mx-3 mt-auto mb-0 shrink-0 rounded-[12px] border border-[#dde3ed] bg-white p-2.5">
                    <div className="flex items-end gap-2">
                      <input
                        className="min-w-0 flex-1 border-0 bg-transparent p-2 font-sans text-[13px] leading-snug text-[#454f60] outline-none placeholder:text-[#a3aab5]"
                        placeholder="What can I help you with this document?"
                        aria-label="Ask Worrek AI about this document"
                      />
                      <button
                        type="button"
                        className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-brand text-[15px] text-white hover:bg-brand-hover"
                        aria-label="Send"
                      >
                        ↑
                      </button>
                    </div>
                  </div>
                  <div className="shrink-0 px-[17px] pb-3 pt-2 text-center text-[8px] text-[#a3aab5]">
                    You’re in control of every edit.
                  </div>
                </>
              )}
            </aside>
          </div>
        </DocxEditor.Root>
      </LocaleProvider>
    </div>
  );
}
