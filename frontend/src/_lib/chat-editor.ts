import type { DocxEditorInstance } from "@docx-editor.dev/core/editor";
import { createBrowserAutomationHost } from "@docx-editor.dev/core/editor";
import type { AutomationHandle, AutomationHost, AutomationOperation } from "@docx-editor.dev/core/automation";
import { segmentsOf, storyParagraphs } from "@docx-editor.dev/core/store";
import { buildNumberingIndex, readNumPr, resolveNumberingLevel } from "@docx-editor.dev/core/layout";

export type ChatParagraph = {
  id: string;
  text: string;
  heading: number;
  list: "none" | "bullet" | "number";
  marks: Array<{ start: number; end: number; bold: boolean; italic: boolean }>;
};
export type ChatSnapshot = {
  revision: string;
  paragraphs: ChatParagraph[];
  selection: { paragraphId: string; start: number; end: number } | null;
};
export type ChatOperation =
  | { type: "replaceParagraph"; paragraphId: string; expectedText: string; text: string }
  | { type: "replaceText"; paragraphId: string; expectedText: string; start: number; end: number; text: string }
  | { type: "insertParagraph"; id: string; afterId: string | null; text: string }
  | { type: "deleteParagraph"; paragraphId: string; expectedText: string }
  | { type: "formatText"; paragraphId: string; expectedText: string; start: number; end: number; bold: boolean | null; italic: boolean | null }
  | { type: "formatParagraph"; paragraphId: string; expectedText: string; heading: number | null; list: "none" | "bullet" | "number" | null };
export type ChatBatch = { revision: string; operations: ChatOperation[] };
export type PendingChatEdit = { toolCallId: string; batch: ChatBatch; expiresAt: string };
export type EditOutcome = { status: "applied" | "conflict" | "failed"; snapshot: ChatSnapshot; message?: string };

type Handle = AutomationHandle;

export class ChatEditor {
  private readonly editor: DocxEditorInstance;
  private readonly host: AutomationHost;
  private readonly sessionId = crypto.randomUUID();
  private readonly aliases = new Map<string, string>();
  private readonly handles = new Map<string, Handle>();
  private readonly canonicalToPublic = new Map<string, string>();
  private body: Handle | null = null;

  constructor(editor: DocxEditorInstance, host?: AutomationHost) {
    this.editor = editor;
    this.host = host ?? createBrowserAutomationHost(editor);
  }

  dispose() { this.host.dispose(); }

  private value(operation: AutomationOperation) {
    const response = this.host.execute({ operations: [operation] });
    const result = response.results[0];
    if (!response.ok || !result || result.status !== "ok") {
      throw new Error(result?.status === "error" ? result.error.message : "Could not read the document.");
    }
    return result.value;
  }

  private getBody() {
    if (this.body) return this.body;
    const document = this.value({ op: "getDocument" });
    if (document.kind !== "handle") throw new Error("Could not open the document.");
    const body = this.value({ op: "getBody", document: document.handle });
    if (body.kind !== "handle") throw new Error("Could not open the document body.");
    this.body = body.handle;
    return body.handle;
  }

  snapshot(): ChatSnapshot {
    this.editor.surface?.flushPendingInput();
    const surface = this.editor.surface;
    if (!surface) throw new Error("The document is not ready yet.");
    const body = this.getBody();
    const collection = this.value({ op: "getParagraphs", body });
    if (collection.kind !== "handles") throw new Error("Could not read the paragraphs.");
    const part = surface.session.part();
    const bodyNode = part.root.children.find((node) => node.kind === "body");
    if (!bodyNode) throw new Error("Could not read the document body.");
    const tree = storyParagraphs(bodyNode);
    if (tree.length !== collection.handles.length) throw new Error("Document paragraphs could not be matched safely.");
    const numbering = buildNumberingIndex(surface.session.numberingRoot());
    const paragraphs: ChatParagraph[] = [];
    this.handles.clear();
    this.canonicalToPublic.clear();

    for (const [index, handle] of collection.handles.entries()) {
      const idValue = this.value({ op: "getParagraphId", paragraph: handle });
      const textValue = this.value({ op: "getText", target: handle, projection: "model" });
      const formatValue = this.value({ op: "getParagraphFormat", paragraph: { paragraph: handle } });
      if (idValue.kind !== "text" || textValue.kind !== "text" || formatValue.kind !== "paragraphFormat") {
        throw new Error("Could not read document context.");
      }
      const id = this.aliases.get(idValue.text) ?? idValue.text;
      this.handles.set(id, handle);
      const node = tree[index];
      if (!node || node.kind !== "paragraph") throw new Error("Could not locate a document paragraph.");
      this.canonicalToPublic.set(node.id, id);
      const properties = node.children.find((child) => child.kind === "paragraphProperties");
      const reference = properties ? readNumPr([properties]) : null;
      const level = reference ? resolveNumberingLevel(numbering, reference.numId, reference.ilvl) : null;
      const list = level ? level.level.numFmt === "bullet" ? "bullet" : "number" : "none";
      const headingMatch = /^heading\s*([1-6])$/i.exec(formatValue.format.style ?? "");
      const heading = headingMatch ? Number(headingMatch[1]) : 0;
      const marks: ChatParagraph["marks"] = [];
      const segments = segmentsOf(node);
      if (segments.length > 10_000) throw new Error("This document has too many formatting runs for chat.");
      for (const segment of segments) {
        if (segment.end <= segment.start) continue;
        const font = this.value({ op: "getFont", span: { start: { paragraph: handle, offset: segment.start }, end: { paragraph: handle, offset: segment.end } } });
        if (font.kind !== "font") throw new Error("Could not read document formatting.");
        const bold = font.font.bold === true;
        const italic = font.font.italic === true;
        if (!bold && !italic) continue;
        const last = marks.at(-1);
        if (last && last.end === segment.start && last.bold === bold && last.italic === italic) last.end = segment.end;
        else marks.push({ start: segment.start, end: segment.end, bold, italic });
      }
      paragraphs.push({ id, text: textValue.text, heading, list, marks });
    }

    const selection = surface.state().selection;
    const start = selection.anchor;
    const end = selection.head;
    const selected = start.paragraphId === end.paragraphId
      ? { paragraphId: this.canonicalToPublic.get(start.paragraphId) ?? start.paragraphId, start: Math.min(start.offset, end.offset), end: Math.max(start.offset, end.offset) }
      : null;
    return {
      revision: `${this.sessionId}:${this.editor.getDocumentHandle().revision}`,
      paragraphs,
      selection: selected && paragraphs.some((paragraph) => paragraph.id === selected.paragraphId) ? selected : null,
    };
  }

  apply(batch: ChatBatch): EditOutcome {
    let before: ChatSnapshot;
    try { before = this.snapshot(); }
    catch (error) { throw error; }
    const conflict = (message: string): EditOutcome => ({ status: "conflict", snapshot: before, message });
    if (batch.revision !== before.revision) return conflict("The document changed since this suggestion was made.");
    const byId = new Map(before.paragraphs.map((paragraph) => [paragraph.id, paragraph]));
    const staged: AutomationOperation[] = [];
    const inserted: Array<{ id: string; index: number }> = [];
    const touched = new Set<string>();
    let listOperation: Extract<ChatOperation, { type: "formatParagraph" }> | null = null;

    for (const operation of batch.operations) {
      if (operation.type === "insertParagraph") {
        if (byId.has(operation.id) || inserted.some((entry) => entry.id === operation.id)) return conflict("The suggestion contains a duplicate paragraph.");
        const anchor = operation.afterId ? this.handles.get(operation.afterId) : null;
        if (operation.afterId && !anchor) return conflict("An insertion target is no longer available.");
        inserted.push({ id: operation.id, index: staged.length });
        staged.push({ op: "insertParagraph", anchor: anchor ? { paragraph: anchor } : { body: this.getBody(), at: "first" }, where: anchor ? "after" : "before", text: operation.text });
        continue;
      }
      const paragraph = byId.get(operation.paragraphId);
      const handle = this.handles.get(operation.paragraphId);
      if (!paragraph || !handle || paragraph.text !== operation.expectedText || touched.has(operation.paragraphId)) return conflict("The suggestion targets text that has changed.");
      touched.add(operation.paragraphId);
      if (operation.type === "replaceParagraph") {
        const start = { paragraph: handle, offset: 0 };
        staged.push(paragraph.text.length === 0
          ? { op: "insertText", at: start, text: operation.text }
          : { op: "replaceSpan", span: { start, end: { paragraph: handle, offset: paragraph.text.length } }, text: operation.text });
      } else if (operation.type === "replaceText") {
        if (operation.start > operation.end || operation.end > paragraph.text.length) return conflict("The suggested text range is invalid.");
        const start = { paragraph: handle, offset: operation.start };
        staged.push(operation.start === operation.end
          ? { op: "insertText", at: start, text: operation.text }
          : { op: "replaceSpan", span: { start, end: { paragraph: handle, offset: operation.end } }, text: operation.text });
      } else if (operation.type === "deleteParagraph") {
        staged.push({ op: "deleteParagraph", paragraph: handle });
      } else if (operation.type === "formatText") {
        if (operation.start >= operation.end || operation.end > paragraph.text.length) return conflict("The suggested formatting range is invalid.");
        staged.push({ op: "setFont", span: { start: { paragraph: handle, offset: operation.start }, end: { paragraph: handle, offset: operation.end } }, font: {
          ...(operation.bold === null ? {} : { bold: operation.bold }),
          ...(operation.italic === null ? {} : { italic: operation.italic }),
        } });
      } else if (operation.list !== null) {
        listOperation = operation;
      } else if (operation.heading !== null) {
        staged.push({ op: "setParagraphFormat", paragraph: { paragraph: handle }, format: { style: operation.heading === 0 ? "Normal" : `Heading ${operation.heading}` } });
      }
    }

    try {
      if (listOperation) {
        if (batch.operations.length !== 1 || listOperation.heading !== null) return conflict("List changes must be proposed separately.");
        const handle = this.handles.get(listOperation.paragraphId);
        if (!handle) return conflict("The list target is no longer available.");
        const current = byId.get(listOperation.paragraphId)?.list;
        const desired = listOperation.list;
        if (current === desired) return conflict("The list already has this format.");
        const kind = desired === "number" ? "ordered" : desired === "bullet" ? "bullet" : current === "number" ? "ordered" : "bullet";
        const previous = this.editor.surface?.state().selection;
        const selected = this.host.execute({ operations: [{ op: "selectSpan", span: { paragraph: handle }, mode: "select" }] });
        if (!selected.ok) return { status: "failed", snapshot: before, message: "The editor could not select this paragraph." };
        const result = this.editor.exec({ type: "toggleList", kind });
        if (previous) {
          const anchor = this.handles.get(this.canonicalToPublic.get(previous.anchor.paragraphId) ?? previous.anchor.paragraphId);
          const head = this.handles.get(this.canonicalToPublic.get(previous.head.paragraphId) ?? previous.head.paragraphId);
          if (anchor && head) this.host.execute({ operations: [{ op: "selectSpan", span: { start: { paragraph: anchor, offset: previous.anchor.offset }, end: { paragraph: head, offset: previous.head.offset } }, mode: "select" }] });
        }
        if (!result.ok || !result.changed) return { status: "failed", snapshot: this.snapshot(), message: "This list change is not supported by the document." };
      } else {
        if (staged.length !== batch.operations.length) return conflict("The suggestion includes an unsupported change.");
        const response = this.host.execute({ operations: staged, expectedRevision: this.host.revision() });
        if (!response.ok || !response.changed) {
          const failure = response.results.find((result) => result.status === "error");
          return { status: "failed", snapshot: this.snapshot(), message: failure?.status === "error" ? failure.error.message : "The editor could not apply this suggestion." };
        }
        for (const entry of inserted) {
          const result = response.results[entry.index];
          if (result?.status !== "ok" || result.value.kind !== "handle") throw new Error("The inserted paragraph could not be identified.");
          const id = this.value({ op: "getParagraphId", paragraph: result.value.handle });
          if (id.kind !== "text") throw new Error("The inserted paragraph could not be identified.");
          this.aliases.set(id.text, entry.id);
        }
      }
      const snapshot = this.snapshot();
      return { status: "applied", snapshot };
    } catch (error) {
      return { status: "failed", snapshot: this.snapshot(), message: error instanceof Error ? error.message : "The editor could not apply this suggestion." };
    }
  }
}
