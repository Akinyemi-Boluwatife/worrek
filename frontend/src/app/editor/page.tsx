"use client";

import dynamic from "next/dynamic";

const Editor = dynamic(
  () =>
    import("@/_components/document-editor/editor").then((m) => m.Editor),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-dvh items-center justify-center bg-[#eef1f6] text-[13px] text-muted">
        Loading editor…
      </div>
    ),
  },
);

export default function EditorPage() {
  return <Editor />;
}
