import type { DocxEditorInstance } from "@docx-editor.dev/core/editor";

import { renameDocument } from "@/_lib/documentActions";
import { saveDocument, uploadDocument } from "@/_lib/documentClient";

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export async function readEditorFile(file: File) {
  return { content: await file.arrayBuffer(), fileName: file.name };
}

export async function renameEditorDocument(documentId: string, title: string) {
  return renameDocument(documentId, title);
}

export async function saveEditorDocument({
  editor,
  documentId,
  fileName,
  title,
}: {
  editor: DocxEditorInstance | null;
  documentId: string | null;
  fileName: string;
  title: string;
}) {
  const revisionAtSave = editor?.getDocumentHandle().revision;
  const content = await editor?.save();
  if (!content) return { result: null, revisionAtSave };

  if (documentId) {
    return {
      result: await saveDocument(documentId, content),
      revisionAtSave,
    };
  }

  const formData = new FormData();
  formData.set("file", new File([content], fileName, { type: DOCX_MIME }));
  formData.set("title", title || fileName.replace(/\.docx$/i, ""));
  return { result: await uploadDocument(formData), revisionAtSave };
}

export async function downloadEditorDocument(
  editor: DocxEditorInstance | null,
  fileName: string,
) {
  const content = await editor?.save();
  if (!content) return;
  const url = URL.createObjectURL(new Blob([content], { type: DOCX_MIME }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
