import assert from "node:assert/strict";
import test from "node:test";
import { blankDocumentBytes } from "@docx-editor.dev/core/editor";
import { createServerAutomationHost } from "@docx-editor.dev/core/automation";
import { readOoxmlPackage, storyParagraphs } from "@docx-editor.dev/core/store";
import { ChatEditor } from "../src/_lib/chatEditor.ts";
import { inspectionDataSchema, inspectionResultSchema, snapshotSchema, validateAppliedResult } from "../../backend/src/lib/chat/contracts.ts";

function fixture() {
  const opened = createServerAutomationHost(blankDocumentBytes());
  assert.equal(opened.ok, true);
  const host = opened.host;
  let cachedRevision = -1;
  let cachedPackage;
  function currentPackage() {
    if (host.revision() !== cachedRevision) {
      const saved = host.save();
      assert.equal(saved.ok, true);
      const parsed = readOoxmlPackage(saved.bytes);
      assert.equal(parsed.ok, true);
      cachedPackage = parsed.package;
      cachedRevision = host.revision();
    }
    return cachedPackage;
  }
  function part() {
    const pkg = currentPackage();
    return pkg.parts.get(pkg.mainDocumentPart);
  }
  const editor = {
    getDocumentHandle: () => ({ revision: host.revision() }),
    surface: {
      flushPendingInput() {},
      session: {
        part,
        numberingRoot() { return currentPackage().parts.get("/word/numbering.xml")?.root ?? null; },
      },
      state() {
        const body = part().root.children.find((node) => node.kind === "body");
        const paragraph = storyParagraphs(body)[0];
        const position = { paragraphId: paragraph.id, offset: 0 };
        return { selection: { anchor: position, head: position } };
      },
    },
  };
  return { chat: new ChatEditor(editor, host), host, editor };
}

test("chat edits use live text, one undoable transaction, and reject stale proposals", () => {
  const { chat, host } = fixture();
  const original = chat.snapshot();
  assert.equal(original.paragraphs.length, 1);
  assert.equal(original.paragraphs[0].text, "");
  const paragraphId = original.paragraphs[0].id;
  const applied = chat.apply({ revision: original.revision, operations: [
    { type: "replaceText", paragraphId, expectedText: "", start: 0, end: 0, text: "Hello world" },
  ] });
  assert.equal(applied.status, "applied");
  assert.equal(applied.snapshot.paragraphs[0].text, "Hello world");
  assert.equal(snapshotSchema.safeParse(applied.snapshot).success, true);
  validateAppliedResult({ toolCallId: "call-1", expiresAt: new Date(Date.now() + 60_000).toISOString(), batch: {
    revision: original.revision,
    operations: [{ type: "replaceText", paragraphId, expectedText: "", start: 0, end: 0, text: "Hello world" }],
  } }, original, applied.snapshot);
  assert.equal(host.revision(), 1);
  assert.equal(chat.apply({ revision: original.revision, operations: [
    { type: "replaceText", paragraphId, expectedText: "", start: 0, end: 0, text: "Wrong" },
  ] }).status, "conflict");
  assert.equal(host.revision(), 1);

  const formatted = chat.apply({ revision: applied.snapshot.revision, operations: [
    { type: "formatText", paragraphId, expectedText: "Hello world", start: 0, end: 5, bold: true, italic: null },
  ] });
  assert.equal(formatted.status, "applied");
  assert.deepEqual(formatted.snapshot.paragraphs[0].marks, [{ start: 0, end: 5, bold: true, italic: false }]);
  validateAppliedResult({ toolCallId: "call-2", expiresAt: new Date(Date.now() + 60_000).toISOString(), batch: {
    revision: applied.snapshot.revision,
    operations: [{ type: "formatText", paragraphId, expectedText: "Hello world", start: 0, end: 5, bold: true, italic: null }],
  } }, applied.snapshot, formatted.snapshot);
  chat.dispose();
});

test("targeted inspection finds exact spans and reads one table without changing the document", () => {
  const { chat, host, editor } = fixture();
  const initial = chat.snapshot();
  const paragraphId = initial.paragraphs[0].id;
  const seeded = chat.apply({ revision: initial.revision, operations: [
    { type: "replaceText", paragraphId, expectedText: "", start: 0, end: 0, text: "Project budget and project timeline" },
  ] });
  assert.equal(seeded.status, "applied");
  const revision = host.revision();
  const matches = chat.inspect({ type: "findText", revision: seeded.snapshot.revision, query: "project", matchCase: false });
  assert.equal(matches.status, "ok", matches.message);
  assert.equal(matches.result.totalMatches, 2);
  assert.deepEqual(matches.result.matches.map(({ paragraphId: id, start, end }) => ({ id, start, end })), [
    { id: paragraphId, start: 0, end: 7 }, { id: paragraphId, start: 19, end: 26 },
  ]);
  assert.equal(inspectionDataSchema.safeParse(matches.result).success, true);
  assert.equal(inspectionResultSchema.safeParse({ kind: "inspection", requestId: crypto.randomUUID(), turnId: crypto.randomUUID(), toolCallId: "find-1", status: matches.status, snapshot: matches.snapshot, result: matches.result }).success, true);
  assert.equal(host.revision(), revision);
  assert.equal(chat.inspect({ type: "findText", revision: initial.revision, query: "project" }).status, "conflict");

  const document = host.execute({ operations: [{ op: "getDocument" }] }).results[0].value.handle;
  const body = host.execute({ operations: [{ op: "getBody", document }] }).results[0].value.handle;
  const paragraph = host.execute({ operations: [{ op: "getParagraphs", body }] }).results[0].value.handles[0];
  const created = host.execute({ operations: [{ op: "insertTable", span: { paragraph }, location: "After", rowCount: 2, columnCount: 2, values: [["Item", "Cost"], ["Desk", "$100"]] }] });
  assert.equal(created.ok, true);
  const current = chat.snapshot();
  const listed = chat.inspect({ type: "listTables", revision: current.revision });
  assert.equal(listed.status, "ok", listed.message);
  assert.equal(listed.result.totalTables, 1);
  assert.equal(inspectionDataSchema.safeParse(listed.result).success, true);
  const tableId = listed.result.tables[0].id;
  const bodyNode = editor.surface.session.part().root.children.find((node) => node.kind === "body");
  const cellParagraphId = storyParagraphs(bodyNode)[1].id;
  editor.surface.state = () => ({ selection: { anchor: { paragraphId: cellParagraphId, offset: 0 }, head: { paragraphId: cellParagraphId, offset: 0 } } });
  const selected = chat.inspect({ type: "listTables", revision: current.revision });
  assert.equal(selected.result.selectedTableId, tableId);
  assert.equal(inspectionDataSchema.safeParse(selected.result).success, true);
  const detail = chat.inspect({ type: "inspectTable", revision: current.revision, tableId });
  assert.equal(detail.status, "ok", detail.message);
  assert.deepEqual(detail.result.values, [["Item", "Cost"], ["Desk", "$100"]]);
  assert.equal(inspectionDataSchema.safeParse(detail.result).success, true);
  assert.equal(host.revision(), created.revision);
  chat.dispose();
});

test("search results cover every occurrence through pages", () => {
  const { chat } = fixture();
  const initial = chat.snapshot();
  const seeded = chat.apply({ revision: initial.revision, operations: [
    { type: "replaceText", paragraphId: initial.paragraphs[0].id, expectedText: "", start: 0, end: 0, text: "item ".repeat(125).trim() },
  ] });
  assert.equal(seeded.status, "applied");
  const result = chat.inspect({ type: "findText", revision: seeded.snapshot.revision, query: "item", matchWholeWord: true });
  assert.equal(result.status, "ok", result.message);
  assert.equal(result.result.totalMatches, 125);
  assert.equal(result.result.matches.length, 100);
  assert.equal(result.result.nextOffset, 100);
  assert.equal(result.result.truncated, true);
  assert.equal(inspectionDataSchema.safeParse(result.result).success, true);
  const next = chat.inspect({ type: "findText", revision: seeded.snapshot.revision, query: "item", matchWholeWord: true, offset: result.result.nextOffset });
  assert.equal(next.status, "ok", next.message);
  assert.equal(next.result.matches.length, 25);
  assert.equal(next.result.nextOffset, null);
  assert.equal(next.result.truncated, false);
  assert.equal(inspectionDataSchema.safeParse(next.result).success, true);
  chat.dispose();
});

test("approved font color and size, then paragraph alignment and spacing, match the live editor", () => {
  const { chat } = fixture();
  const initial = chat.snapshot();
  const paragraphId = initial.paragraphs[0].id;
  const seeded = chat.apply({ revision: initial.revision, operations: [
    { type: "replaceText", paragraphId, expectedText: "", start: 0, end: 0, text: "Make this phrase blue" },
  ] });
  assert.equal(seeded.status, "applied");
  const formatted = chat.apply({ revision: seeded.snapshot.revision, operations: [
    { type: "formatText", paragraphId, expectedText: "Make this phrase blue", start: 0, end: 16, bold: null, italic: null, size: 14, color: "#3366CC" },
  ] });
  assert.equal(formatted.status, "applied", formatted.message);
  assert.equal(snapshotSchema.safeParse(formatted.snapshot).success, true);
  validateAppliedResult({ toolCallId: "font", expiresAt: new Date(Date.now() + 60_000).toISOString(), batch: {
    revision: seeded.snapshot.revision,
    operations: [{ type: "formatText", paragraphId, expectedText: "Make this phrase blue", start: 0, end: 16, bold: null, italic: null, size: 14, color: "#3366CC" }],
  } }, seeded.snapshot, formatted.snapshot);
  const paragraph = chat.apply({ revision: formatted.snapshot.revision, operations: [
    { type: "formatParagraph", paragraphId, expectedText: "Make this phrase blue", heading: null, list: null, alignment: "Centered", spaceAfter: 6 },
  ] });
  assert.equal(paragraph.status, "applied", paragraph.message);
  validateAppliedResult({ toolCallId: "paragraph-format", expiresAt: new Date(Date.now() + 60_000).toISOString(), batch: {
    revision: formatted.snapshot.revision,
    operations: [{ type: "formatParagraph", paragraphId, expectedText: "Make this phrase blue", heading: null, list: null, alignment: "Centered", spaceAfter: 6 }],
  } }, formatted.snapshot, paragraph.snapshot);
  const decorated = chat.apply({ revision: paragraph.snapshot.revision, operations: [
    { type: "formatText", paragraphId, expectedText: "Make this phrase blue", start: 0, end: 4, bold: null, italic: null,
      name: "Arial", underline: "Single", highlightColor: "#FFFF00", strikeThrough: true, subscript: true },
  ] });
  assert.equal(decorated.status, "applied", decorated.message);
  validateAppliedResult({ toolCallId: "decorated", expiresAt: new Date(Date.now() + 60_000).toISOString(), batch: {
    revision: paragraph.snapshot.revision,
    operations: [{ type: "formatText", paragraphId, expectedText: "Make this phrase blue", start: 0, end: 4, bold: null, italic: null,
      name: "Arial", underline: "Single", highlightColor: "#FFFF00", strikeThrough: true, subscript: true }],
  } }, paragraph.snapshot, decorated.snapshot);
  const cleared = chat.apply({ revision: decorated.snapshot.revision, operations: [
    { type: "formatText", paragraphId, expectedText: "Make this phrase blue", start: 0, end: 4, bold: null, italic: null,
      underline: "None", highlightColor: null, strikeThrough: false, subscript: false, superscript: true },
  ] });
  assert.equal(cleared.status, "applied", cleared.message);
  validateAppliedResult({ toolCallId: "cleared", expiresAt: new Date(Date.now() + 60_000).toISOString(), batch: {
    revision: decorated.snapshot.revision,
    operations: [{ type: "formatText", paragraphId, expectedText: "Make this phrase blue", start: 0, end: 4, bold: null, italic: null,
      underline: "None", highlightColor: null, strikeThrough: false, subscript: false, superscript: true }],
  } }, decorated.snapshot, cleared.snapshot);
  chat.dispose();
});

test("new paragraphs keep the proposal ID for the next chat turn", () => {
  const { chat } = fixture();
  const before = chat.snapshot();
  const first = chat.apply({ revision: before.revision, operations: [
    { type: "insertParagraph", id: "proposed-p2", afterId: before.paragraphs[0].id, text: "Second paragraph" },
  ] });
  assert.equal(first.status, "applied");
  assert.equal(first.snapshot.paragraphs[1].id, "proposed-p2");
  validateAppliedResult({ toolCallId: "call-3", expiresAt: new Date(Date.now() + 60_000).toISOString(), batch: {
    revision: before.revision,
    operations: [{ type: "insertParagraph", id: "proposed-p2", afterId: before.paragraphs[0].id, text: "Second paragraph" }],
  } }, before, first.snapshot);
  const second = chat.apply({ revision: first.snapshot.revision, operations: [
    { type: "replaceText", paragraphId: "proposed-p2", expectedText: "Second paragraph", start: 0, end: 6, text: "Next" },
  ] });
  assert.equal(second.status, "applied");
  assert.equal(second.snapshot.paragraphs[1].text, "Next paragraph");
  chat.dispose();
});

test("heading and deletion proposals match the backend acknowledgement contract", () => {
  const { chat } = fixture();
  const before = chat.snapshot();
  const id = before.paragraphs[0].id;
  const heading = chat.apply({ revision: before.revision, operations: [
    { type: "formatParagraph", paragraphId: id, expectedText: "", heading: 1, list: null },
  ] });
  assert.equal(heading.status, "applied");
  assert.equal(heading.snapshot.paragraphs[0].heading, 1);
  const added = chat.apply({ revision: heading.snapshot.revision, operations: [
    { type: "insertParagraph", id: "second", afterId: id, text: "Remove this" },
  ] });
  assert.equal(added.status, "applied");
  const removed = chat.apply({ revision: added.snapshot.revision, operations: [
    { type: "deleteParagraph", paragraphId: "second", expectedText: "Remove this" },
  ] });
  assert.equal(removed.status, "applied");
  assert.equal(removed.snapshot.paragraphs.length, 1);
  chat.dispose();
});

test("a long professional summary can be rewritten without counting offsets", () => {
  const { chat } = fixture();
  const original = chat.snapshot();
  const id = original.paragraphs[0].id;
  const summary = "A results-oriented Frontend Developer ".repeat(20).slice(0, 794);
  const seeded = chat.apply({ revision: original.revision, operations: [
    { type: "replaceText", paragraphId: id, expectedText: "", start: 0, end: 0, text: summary },
  ] });
  assert.equal(seeded.status, "applied");
  const rewritten = chat.apply({ revision: seeded.snapshot.revision, operations: [
    { type: "replaceParagraph", paragraphId: id, expectedText: summary, text: "Frontend developer focused on useful, accessible products." },
  ] });
  assert.equal(rewritten.status, "applied");
  assert.equal(rewritten.snapshot.paragraphs[0].text, "Frontend developer focused on useful, accessible products.");
  validateAppliedResult({ toolCallId: "rewrite", expiresAt: new Date(Date.now() + 60_000).toISOString(), batch: {
    revision: seeded.snapshot.revision,
    operations: [{ type: "replaceParagraph", paragraphId: id, expectedText: summary, text: "Frontend developer focused on useful, accessible products." }],
  } }, seeded.snapshot, rewritten.snapshot);
  chat.dispose();
});

test("one approved batch removes three exact project paragraphs", () => {
  const { chat } = fixture();
  let state = chat.snapshot();
  const keep = state.paragraphs[0].id;
  for (const [id, afterId, text] of [
    ["quiz", keep, "Quiz App: Persisted quiz progress with LocalStorage"],
    ["cinema", "quiz", "VCinema: Designed persistent watch lists"],
    ["split", "cinema", "BillSplit: Designed clean UI flows"],
  ]) {
    const outcome = chat.apply({ revision: state.revision, operations: [
      { type: "insertParagraph", id, afterId, text },
    ] });
    assert.equal(outcome.status, "applied");
    state = outcome.snapshot;
  }
  const operations = state.paragraphs.slice(1).map((paragraph) => ({
    type: "deleteParagraph", paragraphId: paragraph.id, expectedText: paragraph.text,
  }));
  const removed = chat.apply({ revision: state.revision, operations });
  assert.equal(removed.status, "applied");
  assert.deepEqual(removed.snapshot.paragraphs.map((paragraph) => paragraph.id), [keep]);
  validateAppliedResult({ toolCallId: "three-deletions", expiresAt: new Date(Date.now() + 60_000).toISOString(), batch: {
    revision: state.revision, operations,
  } }, state, removed.snapshot);
  chat.dispose();
});
