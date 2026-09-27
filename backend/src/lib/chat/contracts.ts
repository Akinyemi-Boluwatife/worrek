import { z } from "zod";

export const MAX_REQUEST_BYTES = 2 * 1024 * 1024;
export const GENERATION_TIMEOUT_MS = 90_000;
export const LEASE_MS = 120_000;
export const TOOL_WAIT_MS = 5 * 60_000;
export const MAX_EDIT_STEPS = 8;

const identifier = z.string().min(1).max(128);
const text = z.string().max(200_000).refine((value) => !/[\r\n]/.test(value), "Use separate paragraphs for newlines.");
const heading = z.number().int().min(0).max(6);
const list = z.enum(["none", "bullet", "number"]);
const mark = z.object({
  start: z.number().int().nonnegative(),
  end: z.number().int().nonnegative(),
  bold: z.boolean(),
  italic: z.boolean(),
}).strict();

export const snapshotSchema = z.object({
  revision: identifier,
  paragraphs: z.array(z.object({
    id: identifier,
    text,
    heading,
    list,
    marks: z.array(mark).max(10_000),
  }).strict()).max(10_000),
  selection: z.object({
    paragraphId: identifier,
    start: z.number().int().nonnegative(),
    end: z.number().int().nonnegative(),
  }).strict().nullable(),
}).strict().superRefine((snapshot, ctx) => {
  const ids = new Set<string>();
  let size = 0;
  for (const p of snapshot.paragraphs) {
    size += p.text.length;
    if (ids.has(p.id)) ctx.addIssue({ code: "custom", message: "Duplicate paragraph ID." });
    ids.add(p.id);
    for (const m of p.marks) {
      if (m.start >= m.end || m.end > p.text.length) {
        ctx.addIssue({ code: "custom", message: "Invalid formatting range." });
      }
    }
  }
  if (size > 200_000) ctx.addIssue({ code: "custom", message: "Document context is too large; no content was truncated." });
  const s = snapshot.selection;
  if (s) {
    const p = snapshot.paragraphs.find((p) => p.id === s.paragraphId);
    if (!p || s.start > s.end || s.end > p.text.length) {
      ctx.addIssue({ code: "custom", message: "Invalid selection." });
    }
  }
});

const target = {
  paragraphId: identifier,
  expectedText: text.describe("Exact complete paragraph text from the current snapshot."),
};
export const editBatchSchema = z.object({
  revision: identifier,
  operations: z.array(z.discriminatedUnion("type", [
    z.object({ type: z.literal("replaceParagraph"), ...target, text }).strict(),
    z.object({ type: z.literal("replaceText"), ...target,
      start: z.number().int().nonnegative(), end: z.number().int().nonnegative(), text,
    }).strict(),
    z.object({ type: z.literal("insertParagraph"), id: identifier,
      afterId: identifier.nullable(), text,
    }).strict(),
    z.object({ type: z.literal("deleteParagraph"), ...target }).strict(),
    z.object({ type: z.literal("formatText"), ...target,
      start: z.number().int().nonnegative(), end: z.number().int().nonnegative(),
      bold: z.boolean().nullable(), italic: z.boolean().nullable(),
    }).strict(),
    z.object({ type: z.literal("formatParagraph"), ...target,
      heading: heading.nullable(), list: list.nullable(),
    }).strict(),
  ])).min(1).max(50),
}).strict();

export const chatInputSchema = z.object({
  requestId: z.uuid(),
  message: z.string().trim().min(1).max(16_000),
  snapshot: snapshotSchema,
}).strict();

export const toolResultSchema = z.object({
  requestId: z.uuid(),
  turnId: z.uuid(),
  toolCallId: identifier,
  status: z.enum(["applied", "conflict", "rejected", "failed"]),
  message: z.string().max(1000).optional(),
  snapshot: snapshotSchema,
}).strict();

export type Snapshot = z.infer<typeof snapshotSchema>;
export type EditBatch = z.infer<typeof editBatchSchema>;
export type ChatInput = z.infer<typeof chatInputSchema>;
export type ToolResult = z.infer<typeof toolResultSchema>;
export type PendingEdit = { toolCallId: string; batch: EditBatch; expiresAt: string };
export type TurnStatus = "running" | "awaiting_tools" | "completed" | "failed" | "interrupted";

export class ChatError extends Error {
  constructor(public status: 400 | 404 | 409 | 413 | 503, message: string) { super(message); }
}

// Validate all targets before anything is offered to the browser. Ranges use JS UTF-16 offsets.
// One operation per existing paragraph prevents ambiguous overlapping edits within a batch.
export function validateEditBatch(batch: EditBatch, snapshot: Snapshot): void {
  if (batch.revision !== snapshot.revision) throw new ChatError(409, "Document revision changed.");
  const originalIds = new Set(snapshot.paragraphs.map((p) => p.id));
  const ids = new Set(originalIds);
  const touched = new Set<string>();
  const insertionAnchors = new Set<string>();
  for (const op of batch.operations) {
    if (op.type === "insertParagraph") {
      const anchor = op.afterId ?? "<start>";
      if (ids.has(op.id) || (op.afterId !== null && !originalIds.has(op.afterId)) || insertionAnchors.has(anchor)) {
        throw new ChatError(409, "Invalid insertion target.");
      }
      insertionAnchors.add(anchor);
      ids.add(op.id);
      continue;
    }
    const p = snapshot.paragraphs.find((p) => p.id === op.paragraphId);
    if (!p || p.text !== op.expectedText || touched.has(p.id)) {
      throw new ChatError(409, "Stale or overlapping edit target.");
    }
    touched.add(p.id);
    if ("start" in op && op.start > op.end) {
      throw new ChatError(409, `The proposed start offset ${op.start} exceeds its end offset ${op.end}. No change was made.`);
    }
    if ("start" in op && op.end > p.text.length) {
      throw new ChatError(409, `The proposed end offset ${op.end} exceeds paragraph length ${p.text.length} (UTF-16 code units). No change was made.`);
    }
    if (op.type === "formatText" && (op.start === op.end || (op.bold === null && op.italic === null))) {
      throw new ChatError(400, "Empty formatting operation.");
    }
    if (op.type === "formatParagraph" && op.heading === null && op.list === null) {
      throw new ChatError(400, "Empty paragraph operation.");
    }
    if (op.type === "formatParagraph" && op.list !== null && (batch.operations.length !== 1 || op.heading !== null)) {
      throw new ChatError(400, "List changes must be proposed separately.");
    }
  }
  if (batch.operations.some((o) => o.type === "insertParagraph" && o.afterId && touched.has(o.afterId))) {
    throw new ChatError(409, "Cannot change an insertion anchor in the same batch.");
  }
}

export function validateAppliedResult(pending: PendingEdit, before: Snapshot, after: Snapshot): void {
  if (before.revision === after.revision) throw new ChatError(409, "Applied edits must advance the editor revision.");
  const expected = before.paragraphs.map((p) => ({ ...p }));
  for (const op of pending.batch.operations) {
    if (op.type === "insertParagraph") {
      const index = op.afterId === null ? -1 : expected.findIndex((p) => p.id === op.afterId);
      expected.splice(index + 1, 0, { id: op.id, text: op.text, heading: 0, list: "none", marks: [] });
      continue;
    }
    const index = expected.findIndex((p) => p.id === op.paragraphId);
    const p = expected[index];
    if (op.type === "deleteParagraph") expected.splice(index, 1);
    if (op.type === "replaceParagraph") p.text = op.text;
    if (op.type === "replaceText") p.text = p.text.slice(0, op.start) + op.text + p.text.slice(op.end);
    if (op.type === "formatParagraph") {
      if (op.heading !== null) p.heading = op.heading;
      if (op.list !== null) p.list = op.list;
    }
    if (op.type === "formatText") {
      const actual = after.paragraphs.find((p) => p.id === op.paragraphId);
      for (const key of ["bold", "italic"] as const) {
        if (op[key] === null) continue;
        // Marks cover styled runs; gaps mean false. Normalize coverage without per-character work.
        const runs = (actual?.marks ?? []).filter((m) => m[key] && m.end > op.start && m.start < op.end)
          .sort((a, b) => a.start - b.start);
        let coveredThrough = op.start;
        for (const run of runs) {
          if (run.start > coveredThrough) break;
          coveredThrough = Math.max(coveredThrough, run.end);
        }
        if (op[key] ? coveredThrough < op.end : runs.length > 0) {
          throw new ChatError(409, "Editor formatting does not match the pending edit.");
        }
      }
    }
  }
  if (expected.length !== after.paragraphs.length || expected.some((p, i) => {
    const actual = after.paragraphs[i];
    return p.id !== actual.id || p.text !== actual.text || p.heading !== actual.heading || p.list !== actual.list;
  })) throw new ChatError(409, "Editor contents do not match the pending edit. Submit a conflict with fresh context.");
}
