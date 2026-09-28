import { DocxEditor } from "@docx-editor.dev/react";
import styles from "./editor.module.css";

export function EditorToolbar() {
  return (          <DocxEditor.Toolbar
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
  );
}
