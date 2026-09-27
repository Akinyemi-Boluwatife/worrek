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
import { openDocument, saveDocument, uploadDocument, type OpenDocumentResult } from "@/_lib/document-client";
import { useEditorStore } from "@/_stores/editor.store";
import styles from "./editor.module.css";
import { ChatPanel } from "./chat-panel";

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
  const editorRef = useRef<DocxEditorInstance | null>(null);
  const [editorInstance, setEditorInstance] = useState<DocxEditorInstance | null>(null);
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
  const moreMenuRef = useRef<HTMLDetailsElement>(null);
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
    : currentDocumentId
      ? "Save changes"
      : "Save to Worrek";
  const statusLabel = isSaving
    ? "Saving…"
    : isDocumentSaved
      ? "Saved to Worrek"
      : currentDocumentId
        ? "Unsaved changes"
        : "Not saved yet";

  function beginRename() {
    setDraftTitle(currentDocumentTitle || fileName.replace(/\.docx$/i, ""));
    setRenameError("");
    setIsRenaming(true);
  }

  async function onFileSelect(file: File) {
    ++loadSequence.current;
    editorRef.current = null;
    setEditorInstance(null);
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
      const editor = editorRef.current;
      const revisionAtSave = editor?.getDocumentHandle().revision;
      const out = await editor?.save();

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
        router.refresh();
        setCurrentDocument({
          id: result.document.id,
          title: result.document.title,
        });
        if (editor?.getDocumentHandle().revision !== revisionAtSave) setSaveStatus("idle");
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
      <header className={styles.topBar}>
        <div className={`${styles.identityGroup} ${isRenaming ? styles.identityRenaming : ""}`}>
          <Link href="/documents" prefetch={true} className={styles.brandLink} aria-label="Worrek documents">
            <span className={styles.brandMark} aria-hidden="true">
              <svg viewBox="0 0 36 36" fill="none"><path d="M4 9.5 10 27l8-13 8 13 6-17.5" stroke="currentColor" strokeWidth="5.3" strokeLinecap="round" strokeLinejoin="round" /><path d="m14 9 4 5.5L22 9" stroke="currentColor" strokeWidth="4.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </span>
            <span className={styles.brandName}>Worrek</span>
          </Link>
          <span className={styles.breadcrumbArrow} aria-hidden="true">›</span>
          {isRenaming ? (
            <form onSubmit={onSaveName} className={styles.renameForm}>
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
                className={styles.renameInput}
              />
              <button type="submit" disabled={isSavingName} className={styles.renameConfirm}>
                {isSavingName ? "Saving…" : "Save name"}
              </button>
              <button type="button" disabled={isSavingName} onClick={() => { setIsRenaming(false); setRenameError(""); }} className={styles.renameCancel}>
                Cancel
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={beginRename}
              disabled={isBlank || isLoadingDocument || isSaving}
              className={styles.documentTitle}
              title="Rename document"
              aria-label={`Rename ${currentDocumentTitle || fileName}`}
            >
              <span>{currentDocumentTitle || fileName.replace(/\.docx$/i, "")}</span>
              <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m5 7.5 5 5 5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          )}
          <span className={`${styles.saveStatus} ${saveStatus === "error" || renameError ? styles.saveStatusError : ""}`} role={saveStatus === "error" || renameError ? "alert" : "status"} title={renameError || saveError || statusLabel}>
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m4 10 4 4 8-8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <span>{renameError || (saveStatus === "error" ? saveError : statusLabel)}</span>
          </span>
        </div>

        <nav className={styles.workspaceTabs} aria-label="Workspace">
          <span aria-current="page" className={styles.activeTab}>Document</span>
          <Link href="/documents" prefetch={true} className={styles.inactiveTab}>Files</Link>
        </nav>

        <div className={styles.topActions}>
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
            className={`${styles.iconAction} ${styles.desktopAction}`}
            title="Open .docx"
            aria-label="Open .docx"
          >
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M3 16V5.5A1.5 1.5 0 0 1 4.5 4H8l1.5 2H15a1.5 1.5 0 0 1 1.5 1.5V16H3Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /><path d="M3 9h13.5" stroke="currentColor" strokeWidth="1.5" /></svg>
          </button>
          <button
            type="button"
            onClick={() => void onSaveDocx()}
            className={`${styles.iconAction} ${styles.desktopAction}`}
            title="Download .docx"
            aria-label="Download .docx"
          >
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M10 3v9m0 0 3-3m-3 3L7 9M4 14v2h12v-2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <button
            type="button"
            onClick={() => void onSaveToWorrek()}
            disabled={isBlank || isLoadingDocument || !isEditorReady || isSaving || isRenaming}
            className={styles.primaryAction}
          >
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M4 15.5V4.5h10l2 2v9H4Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /><path d="M7 4.5v4h6v-4M7 15.5v-5h6v5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /></svg>
            {saveLabel}
          </button>
          <details ref={moreMenuRef} className={styles.moreMenu}>
            <summary className={styles.iconAction} aria-label="More document actions" title="More document actions">
              <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><circle cx="4" cy="10" r="1.3" /><circle cx="10" cy="10" r="1.3" /><circle cx="16" cy="10" r="1.3" /></svg>
            </summary>
            <div className={styles.morePanel}>
              <button type="button" className={styles.mobileMenuAction} onClick={() => { if (moreMenuRef.current) moreMenuRef.current.open = false; fileInputRef.current?.click(); }}>Open .docx</button>
              <button type="button" className={styles.mobileMenuAction} onClick={() => { if (moreMenuRef.current) moreMenuRef.current.open = false; void onSaveDocx(); }}>Download .docx</button>
              <div className={styles.logoutItem}><LogoutButton /></div>
            </div>
          </details>
        </div>
      </header>

      <LocaleProvider i18n={en}>
        <DocxEditor.Root
          document={buffer ?? (newDocument ? "blank" : undefined)}
          onReady={(instance) => {
            const liveEditor = instance as DocxEditorInstance;
            editorRef.current = liveEditor;
            setEditorInstance(liveEditor);
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
            className={`${styles.menuBar} flex h-8 shrink-0 items-center border-b border-[#e7eaf0] bg-white px-4 font-sans text-[12px] print:hidden`}
            fileName={currentDocumentTitle || fileName.replace(/\.docx$/i, "")}
            onOpen={() => fileInputRef.current?.click()}
            onSave={() => void onSaveDocx()}
          />

          <DocxEditor.Toolbar
            preset={false}
            overflow
            className={`${styles.ribbon} h-10 border-b border-[#e7eaf0] px-3 py-1 gap-0.5 print:hidden`}
          >
            <DocxEditor.Toolbar.Undo />
            <DocxEditor.Toolbar.Redo />
            <DocxEditor.Toolbar.Separator />
            <DocxEditor.Toolbar.StylePicker />
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
            className={`${styles.workspace} relative grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_420px] grid-rows-[minmax(0,1fr)] bg-[#f7f8fa] max-[1200px]:grid-cols-[minmax(0,1fr)_360px] max-[950px]:grid-cols-[minmax(0,1fr)_300px] max-[650px]:grid-cols-1 max-[650px]:grid-rows-[auto_auto] max-[650px]:overflow-y-auto`}
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
              {isBlank ? <div className={styles.inspectorHeader}><strong>Document assistant</strong></div> : null}
              {isBlank && (isLoadingDocument || loadError) ? (
                <div className={styles.inspectorMessage} role={loadError ? "alert" : "status"}>
                  {loadError || "Opening document…"}
                  {loadError ? <p className="mt-3"><Link href="/documents" prefetch={true} className="text-brand underline">Back to documents</Link></p> : null}
                </div>
              ) : isBlank ? (
                <button
                  type="button"
                  className={styles.openDocumentCard}
                  onClick={() => fileInputRef.current?.click()}
                  onMouseDown={(e) => e.preventDefault()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files?.[0];
                    if (file) void onFileSelect(file);
                  }}
                >
                  <span className={styles.openDocumentIcon} aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none"><path d="M4 19V7a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v10H4Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /><path d="M4 10h16" stroke="currentColor" strokeWidth="1.6" /></svg>
                  </span>
                  <strong>Open a Word document</strong>
                  <span>
                    Drop a .docx here or browse to start editing.
                  </span>
                </button>
              ) : <ChatPanel key={currentDocumentId ?? "unsaved"} documentId={currentDocumentId} editor={isEditorReady ? editorInstance : null} />}
            </aside>
          </div>
        </DocxEditor.Root>
      </LocaleProvider>
    </div>
  );
}
