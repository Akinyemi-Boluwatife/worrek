import { useState, useTransition } from "react";
import { renameEditorDocument } from "@/_lib/editorPage";
import { useEditorStore } from "@/_stores/editor.store";

export function useEditorRename(fileName: string) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [isSavingName, startNameTransition] = useTransition();
  const [renameError, setRenameError] = useState("");
  const currentDocumentId = useEditorStore((state) => state.currentDocumentId);
  const currentDocumentTitle = useEditorStore((state) => state.currentDocumentTitle);
  const setDocumentTitle = useEditorStore((state) => state.setDocumentTitle);

  function beginRename() {
    setDraftTitle(currentDocumentTitle || fileName.replace(/\.docx$/i, ""));
    setRenameError("");
    setIsRenaming(true);
  }

  function resetRename() {
    setIsRenaming(false);
    setRenameError("");
  }

  function onSaveName(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = draftTitle.trim();
    if (!title || title.length > 255) {
      setRenameError("Enter a document name up to 255 characters.");
      return;
    }

    if (currentDocumentId) {
      startNameTransition(() =>
        renameEditorDocument(currentDocumentId, title).then((result) => {
          if (!result.success) {
            setRenameError(result.message);
            return;
          }
          setDocumentTitle(result.title);
          resetRename();
        }),
      );
      return;
    }

    setDocumentTitle(title);
    resetRename();
  }

  return {
    isRenaming, setIsRenaming, draftTitle, setDraftTitle, isSavingName,
    renameError, setRenameError, beginRename, resetRename, onSaveName,
  };
}
