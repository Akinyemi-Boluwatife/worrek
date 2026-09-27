import { useEffect, useRef, useState } from "react";
import type { DocxEditorInstance } from "@docx-editor.dev/core/editor";

import { openDocument, type OpenDocumentResult } from "@/_lib/document-client";
import { useEditorStore } from "@/_stores/editor.store";

export function useEditorDocumentLoad({
  newDocument,
  documentId,
  documentLoad,
}: {
  newDocument: boolean;
  documentId?: string;
  documentLoad?: Promise<OpenDocumentResult>;
}) {
  const editorRef = useRef<DocxEditorInstance | null>(null);
  const loadSequenceRef = useRef(0);
  const [buffer, setBuffer] = useState<ArrayBuffer | null>(null);
  const [isLoadingDocument, setIsLoadingDocument] = useState(Boolean(documentId));
  const [isEditorReady, setIsEditorReady] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [fileName, setFileName] = useState(
    newDocument ? "Untitled document.docx" : "document.docx",
  );
  const setCurrentDocument = useEditorStore((state) => state.setCurrentDocument);
  const resetDocument = useEditorStore((state) => state.resetDocument);

  useEffect(() => {
    resetDocument();
    if (!documentId) return;

    let cancelled = false;
    const sequence = ++loadSequenceRef.current;
    editorRef.current = null;
    void (documentLoad ?? openDocument(documentId)).then((result) => {
      if (cancelled || sequence !== loadSequenceRef.current) return;
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

    return () => {
      cancelled = true;
    };
  }, [documentId, documentLoad, resetDocument, setCurrentDocument]);

  return {
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
  };
}
