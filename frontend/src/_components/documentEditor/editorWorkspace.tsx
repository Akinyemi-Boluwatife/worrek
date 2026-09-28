import Link from "next/link";
import { DocxEditor, useDocxEditor, useEditorSnapshot } from "@docx-editor.dev/react";
import type { DocxEditorInstance } from "@docx-editor.dev/core/editor";
import type { RefObject } from "react";
import { ChatPanel } from "./chatPanel";
import { EditorToolbar } from "./editorToolbar";
import styles from "./editor.module.css";

function WordCount() {
  const editor = useDocxEditor();
  useEditorSnapshot(editor);
  return <span>{countWords(editor)} words</span>;
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

type EditorWorkspaceProps = {
  currentDocumentTitle: string;
  fileName: string;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onSaveDocx: () => void;
  onFileSelect: (file: File) => Promise<void>;
  isBlank: boolean;
  isLoadingDocument: boolean;
  loadError: string;
  currentDocumentId: string | null;
  isEditorReady: boolean;
  editorInstance: DocxEditorInstance | null;
};

export function EditorWorkspace({
  currentDocumentTitle, fileName, fileInputRef, onSaveDocx, onFileSelect,
  isBlank, isLoadingDocument, loadError, currentDocumentId, isEditorReady,
  editorInstance,
}: EditorWorkspaceProps) {
  return (
    <>
          <DocxEditor.Menu
            className={`${styles.menuBar} flex h-8 shrink-0 items-center border-b border-[#e7eaf0] bg-white px-4 font-sans text-[12px] print:hidden`}
            fileName={currentDocumentTitle || fileName.replace(/\.docx$/i, "")}
            onOpen={() => fileInputRef.current?.click()}
            onSave={() => void onSaveDocx()}
          />

          <EditorToolbar />

          <div
            className={`${styles.workspace} relative grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_420px] grid-rows-[minmax(0,1fr)] bg-[#f7f8fa] max-[1200px]:grid-cols-[minmax(0,1fr)_360px] max-[950px]:grid-cols-[minmax(0,1fr)_300px] max-[650px]:grid-cols-1 max-[650px]:grid-rows-[auto_auto] max-[650px]:overflow-y-auto`}
          >
            <section
              className={`${styles.documentStage} flex min-h-0 min-w-0 flex-col overflow-hidden max-[650px]:h-[60dvh]`}
            >
              <DocxEditor.HorizontalRuler className="print:hidden" />
              <div
                className={`${styles.scrollArea} relative min-h-0 min-w-0 flex-1 overflow-hidden`}
              >
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
              {isBlank ? (
                <div className={styles.inspectorHeader}>
                  <strong>AI Agent</strong>
                </div>
              ) : null}
              {isBlank && (isLoadingDocument || loadError) ? (
                <div
                  className={styles.inspectorMessage}
                  role={loadError ? "alert" : "status"}
                >
                  {loadError || "Opening document…"}
                  {loadError ? (
                    <p className="mt-3">
                      <Link
                        href="/documents"
                        prefetch={true}
                        className="text-brand underline"
                      >
                        Back to documents
                      </Link>
                    </p>
                  ) : null}
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
                    <svg viewBox="0 0 24 24" fill="none">
                      <path
                        d="M4 19V7a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v10H4Z"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M4 10h16"
                        stroke="currentColor"
                        strokeWidth="1.6"
                      />
                    </svg>
                  </span>
                  <strong>Open a Word document</strong>
                  <span>Drop a .docx here or browse to start editing.</span>
                </button>
              ) : (
                <ChatPanel
                  key={currentDocumentId ?? "unsaved"}
                  documentId={currentDocumentId}
                  editor={isEditorReady ? editorInstance : null}
                />
              )}
            </aside>
          </div>
    </>
  );
}
