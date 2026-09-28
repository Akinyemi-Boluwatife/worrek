import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { readFile, readdir } from "node:fs/promises";
import { URL } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { Client } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import { simulateReadableStream } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import type { LanguageModelV4StreamPart } from "@ai-sdk/provider";
import { z } from "zod";
import { relations } from "../src/db/relations";
import { document, documentChat, documentChatTurn } from "../src/db/schema";
import { user } from "../src/db/auth-schema";
import { ChatRepository } from "../src/lib/chat/repository";
import {
  chatInputSchema,
  chatToolResultSchema,
  editBatchSchema,
  inspectionDataSchema,
  inspectionRequestSchema,
  inspectionToolInputSchema,
  snapshotSchema,
  validateEditBatch,
  validateAppliedResult,
  type Snapshot,
  type PendingEdit,
} from "../src/lib/chat/contracts";
import {
  createChatModel,
  generateChat,
  type ChatEvent,
} from "../src/lib/chat/generation";
import { createChatRoute } from "../src/routes/chat.route";

const postgres = new PGlite();
// Exercise the production node-postgres Drizzle adapter against real, isolated PostgreSQL SQL.
const client = new Client();
Object.defineProperty(client, "query", {
  value: async (
    config: {
      text: string;
      rowMode?: "array";
      types: { getTypeParser: (id: number) => (value: string) => unknown };
    },
    values: unknown[],
  ) => {
    return postgres.query(config.text, values, {
      rowMode: config.rowMode,
      parsers: Object.fromEntries(
        [1082, 1114, 1184, 1186].map((id) => [
          id,
          config.types.getTypeParser(id),
        ]),
      ),
    });
  },
});
const db = drizzle({ client, relations });
const snapshot: Snapshot = {
  revision: "editor-session:1",
  selection: null,
  paragraphs: [
    { id: "p1", text: "Hello world", heading: 0, list: "none", marks: [] },
  ],
};
const batch = editBatchSchema.parse({
  revision: snapshot.revision,
  operations: [
    {
      type: "replaceText",
      paragraphId: "p1",
      expectedText: "Hello world",
      start: 6,
      end: 11,
      text: "there",
    },
  ],
});
const pending: PendingEdit = {
  toolCallId: "call-1",
  batch,
  expiresAt: new Date(Date.now() + 300_000).toISOString(),
};
const applied = {
  ...snapshot,
  revision: "editor-session:2",
  paragraphs: [{ ...snapshot.paragraphs[0], text: "Hello there" }],
};
const usage = {
  inputTokens: {
    total: 20,
    noCache: 20,
    cacheRead: undefined,
    cacheWrite: undefined,
  },
  outputTokens: { total: 10, text: 10, reasoning: undefined },
};

function modelWith(
  parts: LanguageModelV4StreamPart[],
  finish: "stop" | "tool-calls" | "length" = "stop",
) {
  return new MockLanguageModelV4({
    doStream: async () => ({
      stream: simulateReadableStream({
        chunks: [
          ...parts,
          {
            type: "finish",
            finishReason: { unified: finish, raw: undefined },
            usage,
          },
        ],
        initialDelayInMs: null,
        chunkDelayInMs: null,
      }),
    }),
  });
}
const textParts: LanguageModelV4StreamPart[] = [
  { type: "text-start", id: "text-1" },
  { type: "text-delta", id: "text-1", delta: "I can help." },
  { type: "text-end", id: "text-1" },
];
const editParts: LanguageModelV4StreamPart[] = [
  {
    type: "tool-call",
    toolCallId: "call-1",
    toolName: "editDocument",
    input: JSON.stringify(batch),
  },
];
const inspectionRequest = inspectionRequestSchema.parse({ type: "findText", revision: snapshot.revision, query: "world", matchCase: false });

test("inspection tool parameters use an object schema accepted by the provider", () => {
  assert.equal(z.toJSONSchema(inspectionToolInputSchema).type, "object");
  assert.equal(inspectionRequestSchema.safeParse({ type: "findText", revision: snapshot.revision, query: "world", offset: 100 }).success, true);
  assert.equal(inspectionRequestSchema.safeParse({ type: "findText", revision: snapshot.revision, query: "world", offset: -1 }).success, false);
});
const inspectionParts: LanguageModelV4StreamPart[] = [{
  type: "tool-call", toolCallId: "inspect-1", toolName: "inspectDocument", input: JSON.stringify(inspectionRequest),
}];

before(async () => {
  // Match Supabase's API roles so the production migration runs unchanged.
  await postgres.exec("CREATE ROLE anon; CREATE ROLE authenticated;");
  for (const directory of (
    await readdir(new URL("../drizzle/", import.meta.url))
  ).sort()) {
    await postgres.exec(
      await readFile(
        new URL(`../drizzle/${directory}/migration.sql`, import.meta.url),
        "utf8",
      ),
    );
  }
  await db
    .insert(user)
    .values({ id: "owner", name: "Owner", email: "owner@example.test" });
});
after(async () => {
  await postgres.close();
});

test("chat tables are private to the backend database connection", async () => {
  const tables = await postgres.query<{
    relname: string;
    relrowsecurity: boolean;
    anonAccess: boolean;
    authenticatedAccess: boolean;
  }>(`
    SELECT c.relname, c.relrowsecurity,
      has_table_privilege('anon', c.oid, 'SELECT') AS "anonAccess",
      has_table_privilege('authenticated', c.oid, 'SELECT') AS "authenticatedAccess"
    FROM pg_class c
    WHERE c.relname IN ('document_chat', 'document_chat_turn')
    ORDER BY c.relname
  `);
  assert.equal(tables.rows.length, 2);
  for (const table of tables.rows) {
    assert.equal(table.relrowsecurity, true);
    assert.equal(table.anonAccess, false);
    assert.equal(table.authenticatedAccess, false);
  }
});

async function fixture() {
  const [doc] = await db
    .insert(document)
    .values({
      userId: "owner",
      title: "Draft",
      fileName: "draft.docx",
      storageKey: crypto.randomUUID(),
    })
    .returning();
  return { doc, repository: new ChatRepository(db, doc.id) };
}
function input() {
  return {
    requestId: crypto.randomUUID(),
    message: "Make the greeting friendlier",
    snapshot,
  };
}
async function run(repository: ChatRepository, model = modelWith(textParts)) {
  const accepted = await repository.begin(input(), crypto.randomUUID());
  const events: ChatEvent[] = [];
  await generateChat({
    ...accepted,
    repository,
    model,
    title: "Draft",
    signal: new AbortController().signal,
    emit: async (event) => {
      events.push(event);
    },
  });
  return { accepted, events };
}

test("validates snapshot identity, selection and bounded context", () => {
  assert.equal(snapshotSchema.safeParse(snapshot).success, true);
  assert.equal(
    snapshotSchema.safeParse({
      ...snapshot,
      paragraphs: [...snapshot.paragraphs, ...snapshot.paragraphs],
    }).success,
    false,
  );
  assert.equal(
    snapshotSchema.safeParse({
      ...snapshot,
      selection: { paragraphId: "missing", start: 0, end: 1 },
    }).success,
    false,
  );
  assert.equal(
    chatInputSchema.safeParse({
      ...input(),
      messages: [{ role: "system", content: "spoof" }],
    }).success,
    false,
  );
});

test("rejects stale, unknown, overlapping and out-of-range edits", () => {
  validateEditBatch(batch, snapshot);
  assert.throws(() =>
    validateEditBatch({ ...batch, revision: "old" }, snapshot),
  );
  assert.throws(() =>
    validateEditBatch(
      { ...batch, operations: [...batch.operations, ...batch.operations] },
      snapshot,
    ),
  );
  assert.throws(
    () => validateEditBatch(
      editBatchSchema.parse({
        ...batch,
        operations: [{ ...batch.operations[0], end: 100 }],
      }),
      snapshot,
    ),
    /end offset 100 exceeds paragraph length 11/,
  );
  assert.throws(() =>
    validateEditBatch(
      editBatchSchema.parse({
        ...batch,
        operations: [{ ...batch.operations[0], paragraphId: "unknown" }],
      }),
      snapshot,
    ),
  );
});

test("whole-paragraph rewrites do not require a model-generated character range", () => {
  const originalText = "A results-oriented Frontend Developer ".repeat(20).slice(0, 794);
  const replacement = "Frontend developer focused on clear, useful interfaces.";
  const before: Snapshot = { ...snapshot, paragraphs: [{ ...snapshot.paragraphs[0], text: originalText }] };
  const rewrite = editBatchSchema.parse({ revision: before.revision, operations: [{
    type: "replaceParagraph", paragraphId: "p1", expectedText: originalText,
    text: replacement,
  }] });
  validateEditBatch(rewrite, before);
  validateAppliedResult({ ...pending, batch: rewrite }, before, {
    ...before, revision: "editor-session:2", paragraphs: [{ ...before.paragraphs[0], text: replacement }],
  });
  assert.throws(() => validateEditBatch({ ...rewrite, operations: [{
    type: "replaceParagraph", paragraphId: "p1", expectedText: "A different summary", text: replacement,
  }] }, before), /Stale or overlapping edit target/);
});

test("acknowledgements must match actual text and formatting changes", () => {
  validateAppliedResult(pending, snapshot, applied);
  assert.throws(() =>
    validateAppliedResult(pending, snapshot, { ...snapshot, revision: "2" }),
  );
  const format: PendingEdit = {
    ...pending,
    batch: {
      revision: snapshot.revision,
      operations: [
        {
          type: "formatText",
          paragraphId: "p1",
          expectedText: "Hello world",
          start: 0,
          end: 5,
          bold: true,
          italic: null,
        },
      ],
    },
  };
  assert.throws(() =>
    validateAppliedResult(format, snapshot, { ...snapshot, revision: "2" }),
  );
  validateAppliedResult(format, snapshot, {
    ...snapshot,
    revision: "2",
    paragraphs: [
      {
        ...snapshot.paragraphs[0],
        marks: [{ start: 0, end: 5, bold: true, italic: false }],
      },
    ],
  });
});

test("validates proposed font and paragraph formatting against the acknowledged snapshot", () => {
  const fontBatch = editBatchSchema.parse({ revision: snapshot.revision, operations: [{
    type: "formatText", paragraphId: "p1", expectedText: "Hello world", start: 0, end: 5,
    bold: null, italic: null, size: 14, color: "#3366CC",
  }] });
  validateEditBatch(fontBatch, snapshot);
  const fontAfter: Snapshot = { ...snapshot, revision: "editor-session:2", paragraphs: [{
    ...snapshot.paragraphs[0],
    formatting: [{ start: 0, end: 5, font: { size: 14, color: "#3366CC" } }],
  }] };
  validateAppliedResult({ ...pending, batch: fontBatch }, snapshot, fontAfter);
  assert.throws(() => validateAppliedResult({ ...pending, batch: fontBatch }, snapshot, {
    ...fontAfter, paragraphs: [{ ...fontAfter.paragraphs[0], formatting: [{ start: 0, end: 5, font: { size: 12, color: "#3366CC" } }] }],
  }), /font formatting/);

  const paragraphBatch = editBatchSchema.parse({ revision: snapshot.revision, operations: [{
    type: "formatParagraph", paragraphId: "p1", expectedText: "Hello world", heading: null,
    list: null, alignment: "Centered", spaceAfter: 6,
  }] });
  validateEditBatch(paragraphBatch, snapshot);
  const paragraphFormat = { style: null, alignment: "Centered" as const, firstLineIndent: null,
    leftIndent: null, rightIndent: null, lineSpacing: null, spaceBefore: null,
    spaceAfter: 6, widowControl: null };
  validateAppliedResult({ ...pending, batch: paragraphBatch }, snapshot, {
    ...snapshot, revision: "editor-session:2", paragraphs: [{ ...snapshot.paragraphs[0], paragraphFormat }],
  });
  assert.throws(() => validateAppliedResult({ ...pending, batch: paragraphBatch }, snapshot, {
    ...snapshot, revision: "editor-session:2", paragraphs: [{ ...snapshot.paragraphs[0], paragraphFormat: { ...paragraphFormat, spaceAfter: 0 } }],
  }), /paragraph formatting/);

  assert.equal(editBatchSchema.safeParse({ revision: snapshot.revision, operations: [{
    type: "formatText", paragraphId: "p1", expectedText: "Hello world", start: 0, end: 5,
    bold: null, italic: null, color: "red",
  }] }).success, false);
  assert.throws(() => validateEditBatch(editBatchSchema.parse({ revision: snapshot.revision, operations: [{
    type: "formatText", paragraphId: "p1", expectedText: "Hello world", start: 0, end: 5,
    bold: null, italic: null, subscript: true, superscript: true,
  }] }), snapshot), /subscript and superscript/);
});

test("validates insertion, deletion, headings and lists across acknowledged batches", () => {
  const structural: PendingEdit = {
    ...pending,
    batch: {
      revision: snapshot.revision,
      operations: [
        {
          type: "insertParagraph",
          id: "new1",
          afterId: "p1",
          text: "New heading",
        },
      ],
    },
  };
  validateEditBatch(structural.batch, snapshot);
  assert.throws(() =>
    validateEditBatch(
      {
        ...structural.batch,
        operations: [
          ...structural.batch.operations,
          {
            type: "insertParagraph",
            id: "new2",
            afterId: "new1",
            text: "New item",
          },
        ],
      },
      snapshot,
    ),
  );
  const inserted: Snapshot = {
    revision: "next",
    selection: null,
    paragraphs: [
      { ...snapshot.paragraphs[0] },
      { id: "new1", text: "New heading", heading: 0, list: "none", marks: [] },
    ],
  };
  validateAppliedResult(structural, snapshot, inserted);
  const formatting: PendingEdit = {
    ...pending,
    batch: {
      revision: inserted.revision,
      operations: [
        {
          type: "formatParagraph",
          paragraphId: "new1",
          expectedText: "New heading",
          heading: 1,
          list: null,
        },
      ],
    },
  };
  validateEditBatch(formatting.batch, inserted);
  validateAppliedResult(formatting, inserted, {
    ...inserted,
    revision: "next2",
    paragraphs: [
      { ...inserted.paragraphs[0] },
      { ...inserted.paragraphs[1], heading: 1 },
    ],
  });
  assert.throws(() =>
    validateEditBatch(
      {
        revision: inserted.revision,
        operations: [
          {
            type: "formatParagraph",
            paragraphId: "new1",
            expectedText: "New heading",
            heading: 1,
            list: "bullet",
          },
        ],
      },
      inserted,
    ),
  );
});

test("streams text, persists conversation and supplies current unsaved context", async () => {
  const { repository } = await fixture();
  const model = modelWith(textParts);
  const { events } = await run(repository, model);
  assert.deepEqual(
    events.map((e) => e.type),
    ["turn", "text_delta", "finish"],
  );
  assert.equal((await repository.history()).turns[0].status, "completed");
  const accepted = await repository.begin(
    { ...input(), message: "Now make that shorter", snapshot: applied },
    "followup",
  );
  await generateChat({
    ...accepted,
    repository,
    model,
    title: "Draft",
    signal: new AbortController().signal,
    emit: async () => {},
  });
  const prompt = JSON.stringify(model.doStreamCalls[1].prompt);
  assert.match(prompt, /Make the greeting friendlier/);
  assert.match(prompt, /Now make that shorter/);
  assert.match(prompt, /Hello there/);
  assert.deepEqual(model.doStreamCalls[0].providerOptions, {
    deepseek: { thinking: { type: "disabled" } },
  });
});

test("persists an edit before delivery and confirms it without another model reply", async () => {
  const { repository } = await fixture();
  const { accepted, events } = await run(
    repository,
    modelWith(editParts, "tool-calls"),
  );
  assert.deepEqual(events.map((event) => event.type), ["turn", "text_reset", "edit_request", "finish"]);
  assert.equal((await repository.history()).turns[0].status, "awaiting_tools");
  await assert.rejects(repository.begin(input(), "new"), /pending edit/);
  const receipt = {
    requestId: crypto.randomUUID(),
    turnId: accepted.turn.id,
    toolCallId: "call-1",
    status: "applied" as const,
    snapshot: applied,
  };
  await assert.rejects(
    repository.begin({ ...receipt, toolCallId: "fake" }, "wrong"),
    /no longer awaiting/,
  );
  await assert.rejects(
    repository.begin({ ...receipt, snapshot }, "stale"),
    /advance/,
  );
  const continuation = await repository.begin(receipt, "receipt");
  assert.equal((await repository.begin(receipt, "receipt")).duplicate, true);
  const model = modelWith(textParts);
  const confirmation: ChatEvent[] = [];
  await generateChat({
    ...continuation,
    repository,
    model,
    title: "Draft",
    signal: new AbortController().signal,
    emit: async (event) => { confirmation.push(event); },
  });
  assert.equal(model.doStreamCalls.length, 0);
  assert.deepEqual(confirmation.map((event) => event.type), ["turn", "text_delta", "finish"]);
  assert.equal(confirmation[1].type === "text_delta" ? confirmation[1].text : "", "Changes applied to the editor. Save the document to keep them.");
  assert.equal((await repository.history()).turns[0].status, "completed");
});

test("read-only inspection resumes the model with bounded, verified search results", async () => {
  const { repository } = await fixture();
  const { accepted, events } = await run(repository, modelWith(inspectionParts, "tool-calls"));
  assert.deepEqual(events.map((event) => event.type), ["turn", "text_reset", "inspection_request", "finish"]);
  assert.equal(events[2].type, "inspection_request");
  const result = inspectionDataSchema.parse({
    type: "findText", query: "world", totalMatches: 1,
    offset: 0, matches: [{ paragraphId: "p1", start: 6, end: 11, context: "Hello world" }], nextOffset: null, truncated: false,
  });
  if (result.type !== "findText") throw new Error("Expected a text search result.");
  const receipt = {
    kind: "inspection" as const, requestId: crypto.randomUUID(), turnId: accepted.turn.id,
    toolCallId: "inspect-1", status: "ok" as const, snapshot, result,
  };
  assert.equal(chatToolResultSchema.safeParse(receipt).success, true);
  await assert.rejects(repository.begin({ ...receipt, result: { ...result, offset: 1 } }, "bad-page"), /does not match the current request/);
  await assert.rejects(repository.begin({ ...receipt, result: { type: "findText", query: "world", totalMatches: 1, offset: 0, matches: [{ paragraphId: "p1", start: 0, end: 5, context: "Hello world" }], nextOffset: null, truncated: false } }, "bad-match"), /does not match the document/);
  await assert.rejects(repository.begin({ ...receipt, snapshot: applied }, "stale-inspection"), /does not match the current request/);
  const continuation = await repository.begin(receipt, "inspection-receipt");
  assert.equal((await repository.begin(receipt, "inspection-receipt")).duplicate, true);
  const model = modelWith(editParts, "tool-calls");
  const reply: ChatEvent[] = [];
  await generateChat({ ...continuation, repository, model, title: "Draft", signal: new AbortController().signal, emit: async (event) => { reply.push(event); } });
  assert.equal(model.doStreamCalls.length, 1);
  assert.deepEqual(reply.map((event) => event.type), ["turn", "text_reset", "edit_request", "finish"]);
  const stored = (await repository.history()).turns[0];
  assert.equal(stored.status, "awaiting_tools");
  assert.equal(stored.messages.some((message) => message.role === "tool" && JSON.stringify(message).includes("inspectDocument")), true);
});

test("unverified narration is cleared when a validated edit is offered", async () => {
  const { repository } = await fixture();
  const { events } = await run(repository, modelWith([
    { type: "text-start", id: "draft" },
    { type: "text-delta", id: "draft", delta: "I will remove a Jest bullet." },
    { type: "text-end", id: "draft" },
    ...editParts,
  ], "tool-calls"));
  assert.deepEqual(events.map((event) => event.type), ["turn", "text_delta", "text_reset", "edit_request", "finish"]);
  const history = await repository.history();
  assert.doesNotMatch(JSON.stringify(history.turns[0].messages), /Jest bullet/);
  assert.equal(history.turns[0].status, "awaiting_tools");
});

test("an invalid model range reports the real offsets and never offers an edit", async () => {
  const { repository } = await fixture();
  const invalid = { ...batch, operations: [{
    type: "replaceText", paragraphId: "p1", expectedText: "Hello world",
    start: 0, end: 794, text: "A shorter summary",
  }] };
  const { events } = await run(repository, modelWith([
    { type: "tool-call", toolCallId: "invalid-range", toolName: "editDocument", input: JSON.stringify(invalid) },
  ], "tool-calls"));
  assert.equal(events.some((event) => event.type === "edit_request"), false);
  assert.match(JSON.stringify(events), /end offset 794 exceeds paragraph length 11/);
  const history = await repository.history();
  assert.match(JSON.stringify(history.turns[0].messages), /end offset 794 exceeds paragraph length 11/);
});

test("leases block simultaneous turns, fence expired writers and reject changed replay payloads", async () => {
  const { repository, doc } = await fixture();
  const original = input();
  const first = await repository.begin(original, "first");
  assert.equal((await repository.begin(original, "first")).duplicate, true);
  await assert.rejects(
    repository.begin(original, "different"),
    /different content/,
  );
  await assert.rejects(repository.begin(input(), "second"), /already running/);
  await db
    .update(documentChat)
    .set({ leaseUntil: new Date(0) })
    .where(eq(documentChat.documentId, doc.id));
  const next = await repository.begin(input(), "next");
  await assert.rejects(
    repository.finish(
      first.turn,
      first.owner,
      "completed",
      first.turn.messages,
    ),
    /lease expired/,
  );
  await repository.finish(
    next.turn,
    next.owner,
    "completed",
    next.turn.messages,
  );
});

test("expired tool calls become unknown and are never replayed", async () => {
  const { repository } = await fixture();
  const { accepted } = await run(
    repository,
    modelWith(editParts, "tool-calls"),
  );
  await db
    .update(documentChatTurn)
    .set({ pendingEdit: { ...pending, expiresAt: new Date(0).toISOString() } })
    .where(eq(documentChatTurn.id, accepted.turn.id));
  await assert.rejects(
    repository.begin(
      {
        requestId: crypto.randomUUID(),
        turnId: accepted.turn.id,
        toolCallId: "call-1",
        status: "applied",
        snapshot: applied,
      },
      "late",
    ),
    /no longer awaiting/,
  );
  const next = await repository.begin(input(), "new");
  const old = (await repository.history()).turns.find(
    (t) => t.id === accepted.turn.id,
  )!;
  assert.equal(old.status, "interrupted");
  assert.match(JSON.stringify(old.messages), /unknown/);
  await repository.finish(
    next.turn,
    next.owner,
    "completed",
    next.turn.messages,
  );
});

test("provider failure, incomplete output and invalid edits never issue executable changes", async () => {
  for (const model of [
    new MockLanguageModelV4({
      doStream: async () => {
        throw new Error("provider private detail");
      },
    }),
    modelWith(editParts, "length"),
    modelWith(
      [
        {
          type: "tool-call",
          toolCallId: "bad",
          toolName: "editDocument",
          input: JSON.stringify({ ...batch, revision: "old" }),
        },
      ],
      "tool-calls",
    ),
  ]) {
    const { repository } = await fixture();
    const { events } = await run(repository, model);
    assert.equal(
      events.some((e) => e.type === "edit_request"),
      false,
    );
    assert.equal(events.at(-1)?.type, "error");
    assert.equal((await repository.history()).turns[0].status, "failed");
    assert.doesNotMatch(JSON.stringify(events), /provider private detail/);
    // Failed generations must not corrupt the next turn's model-message sequence.
    await run(repository);
    assert.equal((await repository.history()).turns[0].status, "completed");
  }
});

test("rejected edits receive a factual confirmation without another model reply", async () => {
  const { repository } = await fixture();
  const { accepted } = await run(
    repository,
    modelWith(editParts, "tool-calls"),
  );
  const continuation = await repository.begin(
    {
      requestId: crypto.randomUUID(),
      turnId: accepted.turn.id,
      toolCallId: "call-1",
      status: "rejected",
      message: "User declined",
      snapshot,
    },
    "rejected",
  );
  const model = modelWith(textParts);
  const confirmation: ChatEvent[] = [];
  await generateChat({
    ...continuation,
    repository,
    model,
    title: "Draft",
    signal: new AbortController().signal,
    emit: async (event) => { confirmation.push(event); },
  });
  assert.equal(model.doStreamCalls.length, 0);
  assert.equal(confirmation[1].type === "text_delta" ? confirmation[1].text : "", "Suggestion rejected. The document was not changed.");
});

test("long conversations are summarized without losing stored history or recent context", async () => {
  const { repository } = await fixture();
  for (let i = 0; i < 13; i++) {
    const accepted = await repository.begin(
      { ...input(), message: `Instruction ${i}: ${"context ".repeat(700)}` },
      String(i),
    );
    await repository.finish(
      accepted.turn,
      accepted.owner,
      "completed",
      accepted.turn.messages,
    );
  }
  const model = modelWith(textParts);
  model.doGenerate = async () => ({
    content: [
      {
        type: "text",
        text: "Keep the user's concise style and outstanding requests.",
      },
    ],
    finishReason: { unified: "stop", raw: undefined },
    usage,
    warnings: [],
  });
  await run(repository, model);
  const history = await repository.history();
  assert.equal(history.turns.length, 14);
  assert.match(history.conversation.summary, /concise style/);
  const prompt = JSON.stringify(model.doStreamCalls[0].prompt);
  assert.match(prompt, /Instruction 12/);
  assert.doesNotMatch(prompt, /Instruction 0:/);
  assert.match(prompt, /concise style/);
});

test("cancellation persists an interrupted turn and releases its lease", async () => {
  const { repository } = await fixture();
  const accepted = await repository.begin(input(), "cancel");
  const controller = new AbortController();
  await generateChat({
    ...accepted,
    repository,
    model: modelWith(textParts),
    title: "Draft",
    signal: controller.signal,
    emit: async (event) => {
      if (event.type === "text_delta") controller.abort();
    },
  });
  assert.equal((await repository.history()).turns[0].status, "interrupted");
  assert.equal((await repository.history()).conversation.leaseOwner, null);
});

test("history and state cascade when a document is permanently deleted", async () => {
  const { repository, doc } = await fixture();
  await run(repository);
  await db.delete(document).where(eq(document.id, doc.id));
  assert.equal((await repository.history()).turns.length, 0);
  assert.equal((await repository.history()).conversation, undefined);
});

test("missing provider credentials fails before accepting a turn", () => {
  assert.throws(() => createChatModel({}), /not configured/);
});

test("routes enforce authentication, ownership, trash, body validation and stream responses", async () => {
  const { doc } = await fixture();
  const model = modelWith(textParts);
  const route = createChatRoute({
    model: () => model,
    authenticate: async (c, next) => {
      const owner = c.req.header("X-Test-User");
      if (!owner) return c.json({ message: "Unauthorized" }, 401);
      const [account] = await db
        .select()
        .from(user)
        .where(eq(user.id, "owner"));
      c.set("user", { ...account, id: owner });
      c.set("db", db);
      await next();
    },
  });
  const url = `/${doc.id}/chat`;
  assert.equal((await route.request(url)).status, 401);
  assert.equal(
    (await route.request(url, { headers: { "X-Test-User": "other" } })).status,
    404,
  );
  assert.equal(
    (
      await route.request(url + "?before=oops", {
        headers: { "X-Test-User": "owner" },
      })
    ).status,
    400,
  );
  const init = {
    method: "POST",
    headers: { "X-Test-User": "owner", "Content-Type": "application/json" },
  };
  assert.equal(
    (
      await route.request(url, {
        ...init,
        headers: { ...init.headers, Origin: "https://untrusted.example" },
        body: JSON.stringify(input()),
      })
    ).status,
    403,
  );
  assert.equal((await route.request(url, { ...init, body: "{}" })).status, 400);
  const work: Promise<unknown>[] = [];
  const response = await route.request(
    url,
    { ...init, body: JSON.stringify(input()) },
    undefined,
    {
      waitUntil(promise: Promise<unknown>) {
        work.push(promise);
      },
      passThroughOnException() {},
      props: {},
    },
  );
  assert.equal(response.status, 200);
  assert.match(response.headers.get("Content-Type")!, /text\/event-stream/);
  assert.match(await response.text(), /event: text_delta/);
  await Promise.all(work);
  await db
    .update(document)
    .set({ deletedAt: new Date() })
    .where(eq(document.id, doc.id));
  assert.equal(
    (await route.request(url, { headers: { "X-Test-User": "owner" } })).status,
    404,
  );
});
