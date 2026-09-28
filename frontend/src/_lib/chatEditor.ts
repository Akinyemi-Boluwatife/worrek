import type { DocxEditorInstance } from "@docx-editor.dev/core/editor";
import { createBrowserAutomationHost } from "@docx-editor.dev/core/editor";
import type {
  AutomationHandle,
  AutomationHost,
  AutomationOperation,
  AutomationParagraphFormatWrite,
} from "@docx-editor.dev/core/automation";
import { segmentsOf, storyParagraphs } from "@docx-editor.dev/core/store";
import {
  buildNumberingIndex,
  readNumPr,
  resolveNumberingLevel,
} from "@docx-editor.dev/core/layout";

export type ChatParagraph = {
  id: string;
  text: string;
  heading: number;
  list: "none" | "bullet" | "number";
  marks: Array<{ start: number; end: number; bold: boolean; italic: boolean }>;
  formatting: Array<{ start: number; end: number; font: ChatFont }>;
  paragraphFormat: Partial<ChatParagraphFormat>;
};
export type ChatFont = Partial<{
  name: string;
  size: number;
  color: string;
  underline: string;
  highlightColor: string;
  strikeThrough: boolean;
  subscript: boolean;
  superscript: boolean;
}>;
export type ChatParagraphFormat = {
  style: string | null;
  alignment: "Mixed" | "Unknown" | "Left" | "Centered" | "Right" | "Justified";
  firstLineIndent: number | null;
  leftIndent: number | null;
  rightIndent: number | null;
  lineSpacing: number | null;
  spaceBefore: number | null;
  spaceAfter: number | null;
  widowControl: boolean | null;
};
export type ChatSnapshot = {
  revision: string;
  paragraphs: ChatParagraph[];
  selection: { paragraphId: string; start: number; end: number } | null;
};
export type ChatOperation =
  | {
      type: "replaceParagraph";
      paragraphId: string;
      expectedText: string;
      text: string;
    }
  | {
      type: "replaceText";
      paragraphId: string;
      expectedText: string;
      start: number;
      end: number;
      text: string;
    }
  | {
      type: "insertParagraph";
      id: string;
      afterId: string | null;
      text: string;
    }
  | { type: "deleteParagraph"; paragraphId: string; expectedText: string }
  | {
      type: "formatText";
      paragraphId: string;
      expectedText: string;
      start: number;
      end: number;
      bold: boolean | null;
      italic: boolean | null;
      name?: string;
      size?: number;
      color?: string;
      underline?: string;
      highlightColor?: string | null;
      strikeThrough?: boolean;
      subscript?: boolean;
      superscript?: boolean;
    }
  | {
      type: "formatParagraph";
      paragraphId: string;
      expectedText: string;
      heading: number | null;
      list: "none" | "bullet" | "number" | null;
      alignment?: "Left" | "Centered" | "Right" | "Justified";
      firstLineIndent?: number;
      leftIndent?: number;
      rightIndent?: number;
      lineSpacing?: number;
      spaceBefore?: number;
      spaceAfter?: number;
      widowControl?: boolean;
    };
export type ChatBatch = { revision: string; operations: ChatOperation[] };
export type PendingChatEdit = {
  toolCallId: string;
  batch: ChatBatch;
  expiresAt: string;
};
export type EditOutcome = {
  status: "applied" | "conflict" | "failed";
  snapshot: ChatSnapshot;
  message?: string;
};
export type ChatInspectionRequest =
  | {
      type: "findText";
      revision: string;
      query: string;
      offset?: number;
      matchCase?: boolean;
      matchWholeWord?: boolean;
    }
  | { type: "listTables"; revision: string }
  | { type: "inspectTable"; revision: string; tableId: string };
export type ChatInspectionData =
  | {
      type: "findText";
      query: string;
      totalMatches: number;
      offset: number;
      matches: Array<{
        paragraphId: string;
        start: number;
        end: number;
        context: string;
      }>;
      nextOffset: number | null;
      truncated: boolean;
    }
  | {
      type: "listTables";
      totalTables: number;
      tables: Array<{
        id: string;
        rowCount: number;
        columnCount: number;
        preview: string;
      }>;
      selectedTableId: string | null;
      truncated: boolean;
    }
  | {
      type: "inspectTable";
      tableId: string;
      rowCount: number;
      columnCount: number;
      headerRowCount: number;
      style: string;
      values: string[][];
      truncated: boolean;
    };
export type PendingChatInspection = {
  kind: "inspection";
  toolCallId: string;
  request: ChatInspectionRequest;
  expiresAt: string;
};
export type InspectionOutcome = {
  status: "ok" | "conflict" | "failed";
  snapshot: ChatSnapshot;
  result?: ChatInspectionData;
  message?: string;
};

type Handle = AutomationHandle;

function paragraphFormatting(
  operation: Extract<ChatOperation, { type: "formatParagraph" }>,
): AutomationParagraphFormatWrite {
  return {
    ...(operation.alignment === undefined
      ? {}
      : { alignment: operation.alignment }),
    ...(operation.firstLineIndent === undefined
      ? {}
      : { firstLineIndent: operation.firstLineIndent }),
    ...(operation.leftIndent === undefined
      ? {}
      : { leftIndent: operation.leftIndent }),
    ...(operation.rightIndent === undefined
      ? {}
      : { rightIndent: operation.rightIndent }),
    ...(operation.lineSpacing === undefined
      ? {}
      : { lineSpacing: operation.lineSpacing }),
    ...(operation.spaceBefore === undefined
      ? {}
      : { spaceBefore: operation.spaceBefore }),
    ...(operation.spaceAfter === undefined
      ? {}
      : { spaceAfter: operation.spaceAfter }),
    ...(operation.widowControl === undefined
      ? {}
      : { widowControl: operation.widowControl }),
  };
}

function authoredParagraphFormat(
  format: ChatParagraphFormat,
): Partial<ChatParagraphFormat> {
  return {
    ...(format.style === null ? {} : { style: format.style }),
    ...(format.alignment === "Unknown" || format.alignment === "Mixed"
      ? {}
      : { alignment: format.alignment }),
    ...(format.firstLineIndent === null
      ? {}
      : { firstLineIndent: format.firstLineIndent }),
    ...(format.leftIndent === null ? {} : { leftIndent: format.leftIndent }),
    ...(format.rightIndent === null ? {} : { rightIndent: format.rightIndent }),
    ...(format.lineSpacing === null ? {} : { lineSpacing: format.lineSpacing }),
    ...(format.spaceBefore === null ? {} : { spaceBefore: format.spaceBefore }),
    ...(format.spaceAfter === null ? {} : { spaceAfter: format.spaceAfter }),
    ...(format.widowControl === null
      ? {}
      : { widowControl: format.widowControl }),
  };
}

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

  dispose() {
    this.host.dispose();
  }

  private value(operation: AutomationOperation) {
    const response = this.host.execute({ operations: [operation] });
    const result = response.results[0];
    if (!response.ok || !result || result.status !== "ok") {
      throw new Error(
        result?.status === "error"
          ? result.error.message
          : "Could not read the document.",
      );
    }
    return result.value;
  }

  private getBody() {
    if (this.body) return this.body;
    const document = this.value({ op: "getDocument" });
    if (document.kind !== "handle")
      throw new Error("Could not open the document.");
    const body = this.value({ op: "getBody", document: document.handle });
    if (body.kind !== "handle")
      throw new Error("Could not open the document body.");
    this.body = body.handle;
    return body.handle;
  }

  snapshot(): ChatSnapshot {
    this.editor.surface?.flushPendingInput();
    const surface = this.editor.surface;
    if (!surface) throw new Error("The document is not ready yet.");
    const body = this.getBody();
    const collection = this.value({ op: "getParagraphs", body });
    if (collection.kind !== "handles")
      throw new Error("Could not read the paragraphs.");
    const part = surface.session.part();
    const bodyNode = part.root.children.find((node) => node.kind === "body");
    if (!bodyNode) throw new Error("Could not read the document body.");
    const tree = storyParagraphs(bodyNode);
    if (tree.length !== collection.handles.length)
      throw new Error("Document paragraphs could not be matched safely.");
    const numbering = buildNumberingIndex(surface.session.numberingRoot());
    const paragraphs: ChatParagraph[] = [];
    this.handles.clear();
    this.canonicalToPublic.clear();

    for (const [index, handle] of collection.handles.entries()) {
      const idValue = this.value({ op: "getParagraphId", paragraph: handle });
      const textValue = this.value({
        op: "getText",
        target: handle,
        projection: "model",
      });
      const formatValue = this.value({
        op: "getParagraphFormat",
        paragraph: { paragraph: handle },
      });
      if (
        idValue.kind !== "text" ||
        textValue.kind !== "text" ||
        formatValue.kind !== "paragraphFormat"
      ) {
        throw new Error("Could not read document context.");
      }
      const id = this.aliases.get(idValue.text) ?? idValue.text;
      this.handles.set(id, handle);
      const node = tree[index];
      if (!node || node.kind !== "paragraph")
        throw new Error("Could not locate a document paragraph.");
      this.canonicalToPublic.set(node.id, id);
      const properties = node.children.find(
        (child) => child.kind === "paragraphProperties",
      );
      const reference = properties ? readNumPr([properties]) : null;
      const level = reference
        ? resolveNumberingLevel(numbering, reference.numId, reference.ilvl)
        : null;
      const list = level
        ? level.level.numFmt === "bullet"
          ? "bullet"
          : "number"
        : "none";
      const headingMatch = /^heading\s*([1-6])$/i.exec(
        formatValue.format.style ?? "",
      );
      const heading = headingMatch ? Number(headingMatch[1]) : 0;
      const marks: ChatParagraph["marks"] = [];
      const formatting: ChatParagraph["formatting"] = [];
      const segments = segmentsOf(node);
      if (segments.length > 10_000)
        throw new Error("This document has too many formatting runs for chat.");
      for (const segment of segments) {
        if (segment.end <= segment.start) continue;
        const font = this.value({
          op: "getFont",
          span: {
            start: { paragraph: handle, offset: segment.start },
            end: { paragraph: handle, offset: segment.end },
          },
        });
        if (font.kind !== "font")
          throw new Error("Could not read document formatting.");
        const bold = font.font.bold === true;
        const italic = font.font.italic === true;
        if (bold || italic) {
          const last = marks.at(-1);
          if (
            last &&
            last.end === segment.start &&
            last.bold === bold &&
            last.italic === italic
          )
            last.end = segment.end;
          else
            marks.push({
              start: segment.start,
              end: segment.end,
              bold,
              italic,
            });
        }
        const authored: ChatFont = {
          ...(font.font.name === null ? {} : { name: font.font.name }),
          ...(font.font.size === null ? {} : { size: font.font.size }),
          ...(font.font.color === null ? {} : { color: font.font.color }),
          ...(font.font.underline === null
            ? {}
            : { underline: font.font.underline }),
          ...(font.font.highlightColor === null
            ? {}
            : { highlightColor: font.font.highlightColor }),
          ...(font.font.strikeThrough === null
            ? {}
            : { strikeThrough: font.font.strikeThrough }),
          ...(font.font.subscript === null
            ? {}
            : { subscript: font.font.subscript }),
          ...(font.font.superscript === null
            ? {}
            : { superscript: font.font.superscript }),
        };
        if (Object.keys(authored).length)
          formatting.push({
            start: segment.start,
            end: segment.end,
            font: authored,
          });
      }
      paragraphs.push({
        id,
        text: textValue.text,
        heading,
        list,
        marks,
        formatting,
        paragraphFormat: authoredParagraphFormat(formatValue.format),
      });
    }

    const selection = surface.state().selection;
    const start = selection.anchor;
    const end = selection.head;
    const selected =
      start.paragraphId === end.paragraphId
        ? {
            paragraphId:
              this.canonicalToPublic.get(start.paragraphId) ??
              start.paragraphId,
            start: Math.min(start.offset, end.offset),
            end: Math.max(start.offset, end.offset),
          }
        : null;
    return {
      revision: `${this.sessionId}:${this.editor.getDocumentHandle().revision}`,
      paragraphs,
      selection:
        selected &&
        paragraphs.some((paragraph) => paragraph.id === selected.paragraphId)
          ? selected
          : null,
    };
  }

  inspect(request: ChatInspectionRequest): InspectionOutcome {
    const snapshot = this.snapshot();
    if (snapshot.revision !== request.revision)
      return {
        status: "conflict",
        snapshot,
        message: "The document changed before inspection.",
      };
    try {
      const body = this.getBody();
      if (request.type === "findText") {
        const found = this.value({
          op: "search",
          scope: { body },
          text: request.query,
          options: {
            matchCase: request.matchCase ?? false,
            matchWholeWord: request.matchWholeWord ?? false,
            projection: "model",
          },
        });
        if (found.kind !== "spans")
          throw new Error("Could not search the document.");
        const ids = new Map(
          [...this.handles].map(([id, handle]) => [handle.ref, id]),
        );
        const paragraphs = new Map(
          snapshot.paragraphs.map((paragraph) => [paragraph.id, paragraph]),
        );
        const allMatches: Extract<
          ChatInspectionData,
          { type: "findText" }
        >["matches"] = [];
        for (const span of found.spans) {
          const paragraphId = ids.get(span.start.paragraph.ref);
          if (
            !paragraphId ||
            span.start.paragraph.ref !== span.end.paragraph.ref
          )
            continue;
          const paragraph = paragraphs.get(paragraphId);
          if (
            !paragraph ||
            span.start.offset < 0 ||
            span.end.offset > paragraph.text.length
          )
            continue;
          allMatches.push({
            paragraphId,
            start: span.start.offset,
            end: span.end.offset,
            context: paragraph.text
              .slice(
                Math.max(0, span.start.offset - 60),
                Math.min(paragraph.text.length, span.end.offset + 60),
              )
              .slice(0, 200),
          });
        }
        const offset = request.offset ?? 0;
        const matches = allMatches.slice(offset, offset + 100);
        const nextOffset =
          offset + matches.length < allMatches.length
            ? offset + matches.length
            : null;
        return {
          status: "ok",
          snapshot,
          result: {
            type: "findText",
            query: request.query,
            totalMatches: allMatches.length,
            offset,
            matches,
            nextOffset,
            truncated: nextOffset !== null,
          },
        };
      }

      const tablesValue = this.value({ op: "getTables", scope: { body } });
      if (tablesValue.kind !== "handles")
        throw new Error("Could not locate document tables.");
      const part = this.editor.surface?.session.part();
      const bodyNode = part?.root.children.find((node) => node.kind === "body");
      if (!bodyNode) throw new Error("Could not read the document body.");
      const tableNodes: string[] = [];
      const selectedParagraphId =
        this.editor.surface?.state().selection.anchor.paragraphId;
      let selectedTableId: string | null = null;
      const visit = (value: unknown, parentTableId: string | null = null) => {
        if (!value || typeof value !== "object") return;
        const node = value as {
          kind?: string;
          id?: string;
          children?: readonly unknown[];
        };
        if (node.kind === "table" && node.id) tableNodes.push(node.id);
        const tableId =
          node.kind === "table" && node.id ? `table:${node.id}` : parentTableId;
        if (node.kind === "paragraph" && node.id === selectedParagraphId)
          selectedTableId = tableId;
        for (const child of node.children ?? []) visit(child, tableId);
      };
      visit(bodyNode);
      if (tableNodes.length !== tablesValue.handles.length)
        throw new Error("Document tables could not be matched safely.");
      const tables = tablesValue.handles.map((handle, index) => ({
        id: `table:${tableNodes[index]}`,
        handle,
      }));
      if (request.type === "listTables") {
        const listed = tables.slice(0, 20).map(({ id, handle }) => {
          const value = this.value({ op: "getTable", table: handle });
          if (value.kind !== "table")
            throw new Error("Could not inspect a table.");
          return {
            id,
            rowCount: value.table.rowCount,
            columnCount: value.table.columnCount,
            preview: (value.table.values[0] ?? []).join(" | ").slice(0, 200),
          };
        });
        return {
          status: "ok",
          snapshot,
          result: {
            type: "listTables",
            totalTables: tables.length,
            tables: listed,
            selectedTableId,
            truncated: listed.length < tables.length,
          },
        };
      }
      const target = tables.find((table) => table.id === request.tableId);
      if (!target)
        return {
          status: "failed",
          snapshot,
          message: "That table was not found in the current document.",
        };
      const value = this.value({ op: "getTable", table: target.handle });
      if (value.kind !== "table")
        throw new Error("Could not inspect the table.");
      const rows = value.table.values
        .slice(0, 20)
        .map((row) => row.slice(0, 12).map((cell) => cell.slice(0, 500)));
      return {
        status: "ok",
        snapshot,
        result: {
          type: "inspectTable",
          tableId: request.tableId,
          rowCount: value.table.rowCount,
          columnCount: value.table.columnCount,
          headerRowCount: value.table.headerRowCount,
          style: value.table.style.slice(0, 200),
          values: rows,
          truncated:
            value.table.rowCount > 20 ||
            value.table.columnCount > 12 ||
            value.table.values.some((row) =>
              row.some((cell) => cell.length > 500),
            ),
        },
      };
    } catch (cause) {
      return {
        status: "failed",
        snapshot,
        message: (cause instanceof Error
          ? cause.message
          : "Could not inspect the document."
        ).slice(0, 1000),
      };
    }
  }

  apply(batch: ChatBatch): EditOutcome {
    let before: ChatSnapshot;
    try {
      before = this.snapshot();
    } catch (error) {
      throw error;
    }
    const conflict = (message: string): EditOutcome => ({
      status: "conflict",
      snapshot: before,
      message,
    });
    if (batch.revision !== before.revision)
      return conflict("The document changed since this suggestion was made.");
    const byId = new Map(
      before.paragraphs.map((paragraph) => [paragraph.id, paragraph]),
    );
    const staged: AutomationOperation[] = [];
    const inserted: Array<{ id: string; index: number }> = [];
    const touched = new Set<string>();
    let listOperation: Extract<
      ChatOperation,
      { type: "formatParagraph" }
    > | null = null;

    for (const operation of batch.operations) {
      if (operation.type === "insertParagraph") {
        if (
          byId.has(operation.id) ||
          inserted.some((entry) => entry.id === operation.id)
        )
          return conflict("The suggestion contains a duplicate paragraph.");
        const anchor = operation.afterId
          ? this.handles.get(operation.afterId)
          : null;
        if (operation.afterId && !anchor)
          return conflict("An insertion target is no longer available.");
        inserted.push({ id: operation.id, index: staged.length });
        staged.push({
          op: "insertParagraph",
          anchor: anchor
            ? { paragraph: anchor }
            : { body: this.getBody(), at: "first" },
          where: anchor ? "after" : "before",
          text: operation.text,
        });
        continue;
      }
      const paragraph = byId.get(operation.paragraphId);
      const handle = this.handles.get(operation.paragraphId);
      if (
        !paragraph ||
        !handle ||
        paragraph.text !== operation.expectedText ||
        touched.has(operation.paragraphId)
      )
        return conflict("The suggestion targets text that has changed.");
      touched.add(operation.paragraphId);
      if (operation.type === "replaceParagraph") {
        const start = { paragraph: handle, offset: 0 };
        staged.push(
          paragraph.text.length === 0
            ? { op: "insertText", at: start, text: operation.text }
            : {
                op: "replaceSpan",
                span: {
                  start,
                  end: { paragraph: handle, offset: paragraph.text.length },
                },
                text: operation.text,
              },
        );
      } else if (operation.type === "replaceText") {
        if (
          operation.start > operation.end ||
          operation.end > paragraph.text.length
        )
          return conflict("The suggested text range is invalid.");
        const start = { paragraph: handle, offset: operation.start };
        staged.push(
          operation.start === operation.end
            ? { op: "insertText", at: start, text: operation.text }
            : {
                op: "replaceSpan",
                span: {
                  start,
                  end: { paragraph: handle, offset: operation.end },
                },
                text: operation.text,
              },
        );
      } else if (operation.type === "deleteParagraph") {
        staged.push({ op: "deleteParagraph", paragraph: handle });
      } else if (operation.type === "formatText") {
        if (
          operation.start >= operation.end ||
          operation.end > paragraph.text.length
        )
          return conflict("The suggested formatting range is invalid.");
        staged.push({
          op: "setFont",
          span: {
            start: { paragraph: handle, offset: operation.start },
            end: { paragraph: handle, offset: operation.end },
          },
          font: {
            ...(operation.bold === null ? {} : { bold: operation.bold }),
            ...(operation.italic === null ? {} : { italic: operation.italic }),
            ...(operation.name === undefined ? {} : { name: operation.name }),
            ...(operation.size === undefined ? {} : { size: operation.size }),
            ...(operation.color === undefined
              ? {}
              : { color: operation.color }),
            ...(operation.underline === undefined
              ? {}
              : { underline: operation.underline }),
            ...(operation.highlightColor === undefined
              ? {}
              : { highlightColor: operation.highlightColor }),
            ...(operation.strikeThrough === undefined
              ? {}
              : { strikeThrough: operation.strikeThrough }),
            ...(operation.subscript === undefined
              ? {}
              : { subscript: operation.subscript }),
            ...(operation.superscript === undefined
              ? {}
              : { superscript: operation.superscript }),
          },
        });
      } else if (operation.list !== null) {
        listOperation = operation;
      } else if (operation.heading !== null) {
        staged.push({
          op: "setParagraphFormat",
          paragraph: { paragraph: handle },
          format: {
            style:
              operation.heading === 0
                ? "Normal"
                : `Heading ${operation.heading}`,
            ...paragraphFormatting(operation),
          },
        });
      } else if (Object.keys(paragraphFormatting(operation)).length) {
        staged.push({
          op: "setParagraphFormat",
          paragraph: { paragraph: handle },
          format: paragraphFormatting(operation),
        });
      }
    }

    try {
      if (listOperation) {
        if (
          batch.operations.length !== 1 ||
          listOperation.heading !== null ||
          Object.keys(paragraphFormatting(listOperation)).length
        )
          return conflict("List changes must be proposed separately.");
        const handle = this.handles.get(listOperation.paragraphId);
        if (!handle) return conflict("The list target is no longer available.");
        const current = byId.get(listOperation.paragraphId)?.list;
        const desired = listOperation.list;
        if (current === desired)
          return conflict("The list already has this format.");
        const kind =
          desired === "number"
            ? "ordered"
            : desired === "bullet"
              ? "bullet"
              : current === "number"
                ? "ordered"
                : "bullet";
        const previous = this.editor.surface?.state().selection;
        const selected = this.host.execute({
          operations: [
            { op: "selectSpan", span: { paragraph: handle }, mode: "select" },
          ],
        });
        if (!selected.ok)
          return {
            status: "failed",
            snapshot: before,
            message: "The editor could not select this paragraph.",
          };
        const result = this.editor.exec({ type: "toggleList", kind });
        if (previous) {
          const anchor = this.handles.get(
            this.canonicalToPublic.get(previous.anchor.paragraphId) ??
              previous.anchor.paragraphId,
          );
          const head = this.handles.get(
            this.canonicalToPublic.get(previous.head.paragraphId) ??
              previous.head.paragraphId,
          );
          if (anchor && head)
            this.host.execute({
              operations: [
                {
                  op: "selectSpan",
                  span: {
                    start: {
                      paragraph: anchor,
                      offset: previous.anchor.offset,
                    },
                    end: { paragraph: head, offset: previous.head.offset },
                  },
                  mode: "select",
                },
              ],
            });
        }
        if (!result.ok || !result.changed)
          return {
            status: "failed",
            snapshot: this.snapshot(),
            message: "This list change is not supported by the document.",
          };
      } else {
        if (staged.length !== batch.operations.length)
          return conflict("The suggestion includes an unsupported change.");
        const response = this.host.execute({
          operations: staged,
          expectedRevision: this.host.revision(),
        });
        if (!response.ok || !response.changed) {
          const failure = response.results.find(
            (result) => result.status === "error",
          );
          return {
            status: "failed",
            snapshot: this.snapshot(),
            message:
              failure?.status === "error"
                ? failure.error.message
                : "The editor could not apply this suggestion.",
          };
        }
        for (const entry of inserted) {
          const result = response.results[entry.index];
          if (result?.status !== "ok" || result.value.kind !== "handle")
            throw new Error("The inserted paragraph could not be identified.");
          const id = this.value({
            op: "getParagraphId",
            paragraph: result.value.handle,
          });
          if (id.kind !== "text")
            throw new Error("The inserted paragraph could not be identified.");
          this.aliases.set(id.text, entry.id);
        }
      }
      const snapshot = this.snapshot();
      return { status: "applied", snapshot };
    } catch (error) {
      return {
        status: "failed",
        snapshot: this.snapshot(),
        message:
          error instanceof Error
            ? error.message
            : "The editor could not apply this suggestion.",
      };
    }
  }
}
