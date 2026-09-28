"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { DocxEditor, LocaleProvider } from "@docx-editor.dev/react";
import type { DocxEditorInstance } from "@docx-editor.dev/core/editor";
import en from "@docx-editor.dev/i18n/en";
import "@docx-editor.dev/core/styles/editor.css";
import {
  downloadEditorDocument,
  readEditorFile,
  saveEditorDocument,
} from "@/_lib/editorPage";
import type { OpenDocumentResult } from "@/_lib/documentClient";
import { useEditorDocumentLoad } from "@/_lib/useEditorDocumentLoad";
import { useEditorRename } from "@/_lib/useEditorRename";
import { useEditorStore } from "@/_stores/editor.store";
import styles from "./editor.module.css";
import { EditorHeader } from "./editorHeader";
import { EditorWorkspace } from "./editorWorkspace";

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
  const [editorInstance, setEditorInstance] =
    useState<DocxEditorInstance | null>(null);
  const {
    editorRef,
    loadSequenceRef,
    buffer,
    setBuffer,
    isLoadingDocument,
    setIsLoadingDocument,
    isEditorReady,
    setIsEditorReady,
    loadError,
    setLoadError,
    fileName,
    setFileName,
  } = useEditorDocumentLoad({ newDocument, documentId, documentLoad });
  const {
    isRenaming, setIsRenaming, draftTitle, setDraftTitle, isSavingName,
    renameError, setRenameError, beginRename, resetRename, onSaveName,
  } = useEditorRename(fileName);
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

  async function onFileSelect(file: File) {
    const sequence = ++loadSequenceRef.current;
    setIsLoadingDocument(true);

    try {
      const { content, fileName } = await readEditorFile(file);
      if (sequence !== loadSequenceRef.current) return;

      editorRef.current = null;
      setEditorInstance(null);
      setIsEditorReady(false);
      resetRename();
      setBuffer(content);
      setFileName(fileName);
      setLoadError("");
      resetDocument();
      setDocumentTitle(file.name.replace(/\.docx$/i, ""));
    } catch {
      if (sequence !== loadSequenceRef.current) return;
      const message = "We couldn't open this document. Please try again.";
      setLoadError(message);
      setSaveStatus("error", message);
    } finally {
      if (sequence === loadSequenceRef.current) setIsLoadingDocument(false);
    }
  }

  function onFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void onFileSelect(file);
    e.target.value = "";
  }

  function onSaveToWorrek() {
    if (isBlank || isLoadingDocument || !isEditorReady || isSaving) return;

    setSaveStatus("saving");

    const editor = editorRef.current;
    void saveEditorDocument({
      editor,
      documentId: currentDocumentId,
      fileName,
      title: currentDocumentTitle,
    })
      .then(({ result, revisionAtSave }) => {
        if (!result) {
          setSaveStatus(
            "error",
            "We couldn't read this document. Please try again.",
          );
          return;
        }

        if (result.success) {
          router.refresh();
          setCurrentDocument({
            id: result.document.id,
            title: result.document.title,
          });
          if (editor?.getDocumentHandle().revision !== revisionAtSave)
            setSaveStatus("idle");
          if (!currentDocumentId)
            router.replace(`/editor/${result.document.id}`);
          return;
        }

        setSaveStatus("error", result.message);
      })
      .catch((error) => {
        console.error(
          "Saving document to Worrek failed:",
          error instanceof Error ? error.message : "Unknown error",
        );

        setSaveStatus(
          "error",
          "We couldn't save this document right now. Please try again.",
        );
      });
  }

  function onSaveDocx() {
    if (!isEditorReady) return;
    void downloadEditorDocument(editorRef.current, fileName);
  }

  return (
    <div
      className={`${styles.frame} flex h-dvh min-w-0 flex-col overflow-hidden bg-[#eef1f6]`}
    >
      <EditorHeader
        isRenaming={isRenaming}
        setIsRenaming={setIsRenaming}
        draftTitle={draftTitle}
        setDraftTitle={setDraftTitle}
        isSavingName={isSavingName}
        renameError={renameError}
        setRenameError={setRenameError}
        isBlank={isBlank}
        isLoadingDocument={isLoadingDocument}
        isEditorReady={isEditorReady}
        isSaving={isSaving}
        currentDocumentTitle={currentDocumentTitle}
        fileName={fileName}
        saveStatus={saveStatus}
        saveError={saveError}
        statusLabel={statusLabel}
        saveLabel={saveLabel}
        fileInputRef={fileInputRef}
        moreMenuRef={moreMenuRef}
        beginRename={beginRename}
        onSaveName={onSaveName}
        onFileInputChange={onFileInputChange}
        onSaveDocx={onSaveDocx}
        onSaveToWorrek={onSaveToWorrek}
      />
      <LocaleProvider i18n={en}>
        <DocxEditor.Root
          document={buffer ?? (newDocument ? "blank" : undefined)}
          onReady={(instance) => {
            const liveEditor = instance as DocxEditorInstance;
            editorRef.current = liveEditor;
            setEditorInstance(liveEditor);
            setIsEditorReady(buffer !== null || newDocument);
            if (
              documentId &&
              buffer &&
              performance.getEntriesByName("document-open:body", "mark").length
            ) {
              performance.mark("document-open:ready");
              performance.measure(
                "document-open:editor-ready",
                "document-open:body",
                "document-open:ready",
              );
              performance.measure(
                "document-open:total",
                "document-open:start",
                "document-open:ready",
              );
              performance.clearMarks("document-open:body");
            }
          }}
          onChange={() => {
            if (currentDocumentId && saveStatus === "saved")
              setSaveStatus("idle");
          }}
        >
          <EditorWorkspace
            currentDocumentTitle={currentDocumentTitle}
            fileName={fileName}
            fileInputRef={fileInputRef}
            onSaveDocx={onSaveDocx}
            onFileSelect={onFileSelect}
            isBlank={isBlank}
            isLoadingDocument={isLoadingDocument}
            loadError={loadError}
            currentDocumentId={currentDocumentId}
            isEditorReady={isEditorReady}
            editorInstance={editorInstance}
          />
        </DocxEditor.Root>
      </LocaleProvider>
    </div>
  );
}
