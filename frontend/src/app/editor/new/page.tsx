import type { Metadata } from "next";

import { EditorPageContent } from "@/_components/document-editor/editor-page-content";

export const metadata: Metadata = {
  title: "New document — Worrek",
};

export default function NewDocumentPage() {
  return <EditorPageContent newDocument />;
}
