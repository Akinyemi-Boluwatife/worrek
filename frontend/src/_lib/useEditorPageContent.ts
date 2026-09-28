import { useEffect, useRef, useState } from "react";

import { openDocument, type OpenDocumentResult } from "@/_lib/documentClient";

type PendingDocumentLoad = {
  id: string;
  promise: Promise<OpenDocumentResult>;
};

export function useEditorPageContent(documentId?: string) {
  const pendingLoadRef = useRef<PendingDocumentLoad | null>(null);
  const [load, setLoad] = useState<PendingDocumentLoad | null>(null);

  useEffect(() => {
    if (!documentId) return;

    if (pendingLoadRef.current?.id !== documentId) {
      pendingLoadRef.current = {
        id: documentId,
        promise: openDocument(documentId),
      };
    }
    setLoad(pendingLoadRef.current);
  }, [documentId]);

  return load?.id === documentId ? load?.promise : undefined;
}
