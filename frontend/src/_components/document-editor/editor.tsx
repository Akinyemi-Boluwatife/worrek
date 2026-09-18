"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import {
  DocxEditor,
  LocaleProvider,
  useDocxEditor,
  useEditorSnapshot,
} from "@docx-editor.dev/react";
import type { DocxEditorInstance } from "@docx-editor.dev/core/editor";
import en from "@docx-editor.dev/i18n/en";
import "@docx-editor.dev/core/styles/editor.css";
import styles from "./editor.module.css";

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

export function Editor() {
  const editor = useDocxEditor();
  const [buffer, setBuffer] = useState<ArrayBuffer | null>(null);
  const [fileName, setFileName] = useState("document.docx");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isBlank = buffer === null;

  async function onFileSelect(file: File) {
    setBuffer(await file.arrayBuffer());
    setFileName(file.name);
  }

  function onFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void onFileSelect(file);
    e.target.value = "";
  }

  async function onSave() {
    const out = await editor?.save();
    if (!out) return;
    const blob = new Blob([out], {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
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
        <Link href="/" className="text-[13px] font-[650] text-foreground">
          Worrek
        </Link>
        <div className="flex min-w-0 items-center gap-2">
          <span className="max-w-48 truncate text-[12px] text-muted max-[650px]:max-w-28">
            {fileName}
          </span>
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
            onClick={() => void onSave()}
            className="shrink-0 cursor-pointer rounded-md border border-brand bg-brand px-2.5 py-1.5 text-[12px] font-[650] text-white hover:border-brand-hover hover:bg-brand-hover"
          >
            Save .docx
          </button>
        </div>
      </header>

      <LocaleProvider i18n={en}>
        <DocxEditor.Root document={buffer ?? "blank"}>
          <DocxEditor.Menu
            className={`${styles.menuBar} flex shrink-0 items-center gap-0.5 border-b border-[#eef0f4] bg-white px-2.5 font-sans text-[11px] h-[37px] print:hidden`}
            fileName={fileName.replace(/\.docx$/i, "")}
            onOpen={() => fileInputRef.current?.click()}
            onSave={() => void onSave()}
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
                    {fileName}
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-[15px] font-normal text-[#a1a8b4]" aria-hidden="true">
                    ＋ <span>···</span>
                  </span>
                )}
              </div>
              {isBlank ? (
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
