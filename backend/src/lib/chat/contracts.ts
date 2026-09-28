import { z } from "zod";

export const MAX_REQUEST_BYTES = 2 * 1024 * 1024;
export const GENERATION_TIMEOUT_MS = 90_000;
export const LEASE_MS = 120_000;
export const TOOL_WAIT_MS = 5 * 60_000;
export const MAX_EDIT_STEPS = 8;

const identifier = z.string().min(1).max(128);
const text = z
  .string()
  .max(200_000)
  .refine(
    (value) => !/[\r\n]/.test(value),
    "Use separate paragraphs for newlines.",
  );
const heading = z.number().int().min(0).max(6);
const list = z.enum(["none", "bullet", "number"]);
const color = z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Use #RRGGBB.");
const fontSize = z.number().min(0.5).max(400).multipleOf(0.5);
const fontName = z.string().trim().min(1).max(100);
const underline = z.enum([
  "None",
  "Single",
  "Word",
  "Double",
  "Thick",
  "Dotted",
  "DottedHeavy",
  "DashLine",
  "DashLineHeavy",
  "DashLineLong",
  "DashLineLongHeavy",
  "DotDashLine",
  "DotDashLineHeavy",
  "TwoDotDashLine",
  "TwoDotDashLineHeavy",
  "Wave",
  "WaveHeavy",
  "WaveDouble",
]);
const highlightColors = new Set([
  "#FFFF00",
  "#00FF00",
  "#00FFFF",
  "#FF00FF",
  "#0000FF",
  "#FF0000",
  "#000080",
  "#008080",
  "#008000",
  "#800080",
  "#800000",
  "#808000",
  "#808080",
  "#C0C0C0",
  "#000000",
  "#FFFFFF",
]);
const highlight = color.refine(
  (value) => highlightColors.has(value.toUpperCase()),
  "Use a Word highlight palette color.",
);
const alignment = z.enum(["Left", "Centered", "Right", "Justified"]);
const point = z.number().finite().min(-720).max(720);
const fontProperties = z
  .object({
    name: z.string().optional(),
    size: z.number().finite().optional(),
    color: z.string().optional(),
    underline: z.string().optional(),
    highlightColor: z.string().optional(),
    strikeThrough: z.boolean().optional(),
    subscript: z.boolean().optional(),
    superscript: z.boolean().optional(),
  })
  .strict();
const paragraphFormat = z
  .object({
    style: z.string().nullable().optional(),
    alignment: z.enum(["Mixed", "Unknown", ...alignment.options]).optional(),
    firstLineIndent: z.number().nullable().optional(),
    leftIndent: z.number().nullable().optional(),
    rightIndent: z.number().nullable().optional(),
    lineSpacing: z.number().nullable().optional(),
    spaceBefore: z.number().nullable().optional(),
    spaceAfter: z.number().nullable().optional(),
    widowControl: z.boolean().nullable().optional(),
  })
  .strict();
const mark = z
  .object({
    start: z.number().int().nonnegative(),
    end: z.number().int().nonnegative(),
    bold: z.boolean(),
    italic: z.boolean(),
  })
  .strict();

export const snapshotSchema = z
  .object({
    revision: identifier,
    paragraphs: z
      .array(
        z
          .object({
            id: identifier,
            text,
            heading,
            list,
            marks: z.array(mark).max(10_000),
            formatting: z
              .array(
                z
                  .object({
                    start: z.number().int().nonnegative(),
                    end: z.number().int().nonnegative(),
                    font: fontProperties,
                  })
                  .strict(),
              )
              .max(10_000)
              .optional(),
            paragraphFormat: paragraphFormat.optional(),
          })
          .strict(),
      )
      .max(10_000),
    selection: z
      .object({
        paragraphId: identifier,
        start: z.number().int().nonnegative(),
        end: z.number().int().nonnegative(),
      })
      .strict()
      .nullable(),
  })
  .strict()
  .superRefine((snapshot, ctx) => {
    const ids = new Set<string>();
    let size = 0;
    for (const p of snapshot.paragraphs) {
      size += p.text.length;
      if (ids.has(p.id))
        ctx.addIssue({ code: "custom", message: "Duplicate paragraph ID." });
      ids.add(p.id);
      for (const m of p.marks) {
        if (m.start >= m.end || m.end > p.text.length) {
          ctx.addIssue({
            code: "custom",
            message: "Invalid formatting range.",
          });
        }
      }
      for (const run of p.formatting ?? []) {
        if (
          run.start >= run.end ||
          run.end > p.text.length ||
          !Object.keys(run.font).length
        ) {
          ctx.addIssue({
            code: "custom",
            message: "Invalid font formatting range.",
          });
        }
      }
    }
    if (size > 200_000)
      ctx.addIssue({
        code: "custom",
        message: "Document context is too large; no content was truncated.",
      });
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
  expectedText: text.describe(
    "Exact complete paragraph text from the current snapshot.",
  ),
};
export const editBatchSchema = z
  .object({
    revision: identifier,
    operations: z
      .array(
        z.discriminatedUnion("type", [
          z
            .object({ type: z.literal("replaceParagraph"), ...target, text })
            .strict(),
          z
            .object({
              type: z.literal("replaceText"),
              ...target,
              start: z.number().int().nonnegative(),
              end: z.number().int().nonnegative(),
              text,
            })
            .strict(),
          z
            .object({
              type: z.literal("insertParagraph"),
              id: identifier,
              afterId: identifier.nullable(),
              text,
            })
            .strict(),
          z.object({ type: z.literal("deleteParagraph"), ...target }).strict(),
          z
            .object({
              type: z.literal("formatText"),
              ...target,
              start: z.number().int().nonnegative(),
              end: z.number().int().nonnegative(),
              bold: z.boolean().nullable(),
              italic: z.boolean().nullable(),
              name: fontName.optional(),
              size: fontSize.optional(),
              color: color.optional(),
              underline: underline.optional(),
              highlightColor: highlight.nullable().optional(),
              strikeThrough: z.boolean().optional(),
              subscript: z.boolean().optional(),
              superscript: z.boolean().optional(),
            })
            .strict(),
          z
            .object({
              type: z.literal("formatParagraph"),
              ...target,
              heading: heading.nullable(),
              list: list.nullable(),
              alignment: alignment.optional(),
              firstLineIndent: point.optional(),
              leftIndent: point.optional(),
              rightIndent: point.optional(),
              lineSpacing: z.number().finite().positive().max(720).optional(),
              spaceBefore: point.optional(),
              spaceAfter: point.optional(),
              widowControl: z.boolean().optional(),
            })
            .strict(),
        ]),
      )
      .min(1)
      .max(50),
  })
  .strict();

export const inspectionRequestSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("findText"),
      revision: identifier,
      query: z
        .string()
        .trim()
        .min(1)
        .max(200)
        .refine(
          (value) => !/[\r\n]/.test(value),
          "Search one plain-text phrase.",
        ),
      offset: z.number().int().nonnegative().optional(),
      matchCase: z.boolean().optional(),
      matchWholeWord: z.boolean().optional(),
    })
    .strict(),
  z.object({ type: z.literal("listTables"), revision: identifier }).strict(),
  z
    .object({
      type: z.literal("inspectTable"),
      revision: identifier,
      tableId: identifier,
    })
    .strict(),
]);

// DeepSeek requires a JSON Schema object at the root of every function's parameters.
// Keep the discriminated request schema for validation at the application boundary.
export const inspectionToolInputSchema = z
  .object({
    type: z.enum(["findText", "listTables", "inspectTable"]),
    revision: identifier,
    query: z.string().optional(),
    offset: z.number().int().nonnegative().optional(),
    matchCase: z.boolean().optional(),
    matchWholeWord: z.boolean().optional(),
    tableId: identifier.optional(),
  })
  .strict();

export const inspectionDataSchema = z
  .discriminatedUnion("type", [
    z
      .object({
        type: z.literal("findText"),
        query: z.string().max(200),
        totalMatches: z.number().int().nonnegative().max(200_000),
        offset: z.number().int().nonnegative(),
        matches: z
          .array(
            z
              .object({
                paragraphId: identifier,
                start: z.number().int().nonnegative(),
                end: z.number().int().nonnegative(),
                context: z.string().max(200),
              })
              .strict(),
          )
          .max(100),
        nextOffset: z.number().int().nonnegative().nullable(),
        truncated: z.boolean(),
      })
      .strict(),
    z
      .object({
        type: z.literal("listTables"),
        totalTables: z.number().int().nonnegative().max(10_000),
        selectedTableId: identifier.nullable(),
        tables: z
          .array(
            z
              .object({
                id: identifier,
                rowCount: z.number().int().nonnegative(),
                columnCount: z.number().int().nonnegative(),
                preview: z.string().max(200),
              })
              .strict(),
          )
          .max(20),
        truncated: z.boolean(),
      })
      .strict(),
    z
      .object({
        type: z.literal("inspectTable"),
        tableId: identifier,
        rowCount: z.number().int().nonnegative().max(10_000),
        columnCount: z.number().int().nonnegative().max(10_000),
        headerRowCount: z.number().int().nonnegative().max(10_000),
        style: z.string().max(200),
        values: z.array(z.array(z.string().max(500)).max(12)).max(20),
        truncated: z.boolean(),
      })
      .strict(),
  ])
  .superRefine((value, ctx) => {
    if (
      value.type === "findText" &&
      (value.offset > value.totalMatches ||
        value.matches.length > value.totalMatches - value.offset ||
        value.truncated !==
          value.offset + value.matches.length < value.totalMatches ||
        value.nextOffset !==
          (value.truncated ? value.offset + value.matches.length : null))
    )
      ctx.addIssue({
        code: "custom",
        message: "Inconsistent search match count.",
      });
    if (
      value.type === "listTables" &&
      (value.tables.length > value.totalTables ||
        value.truncated !== value.tables.length < value.totalTables)
    )
      ctx.addIssue({ code: "custom", message: "Inconsistent table count." });
    if (
      value.type === "listTables" &&
      value.selectedTableId &&
      !value.truncated &&
      !value.tables.some((table) => table.id === value.selectedTableId)
    )
      ctx.addIssue({
        code: "custom",
        message: "Selected table is not in the table list.",
      });
    if (
      value.type === "inspectTable" &&
      (value.values.length > value.rowCount ||
        value.values.some((row) => row.length > value.columnCount) ||
        value.headerRowCount > value.rowCount)
    )
      ctx.addIssue({
        code: "custom",
        message: "Inconsistent table dimensions.",
      });
  });

export const chatInputSchema = z
  .object({
    requestId: z.uuid(),
    message: z.string().trim().min(1).max(16_000),
    snapshot: snapshotSchema,
  })
  .strict();

export const toolResultSchema = z
  .object({
    requestId: z.uuid(),
    turnId: z.uuid(),
    toolCallId: identifier,
    status: z.enum(["applied", "conflict", "rejected", "failed"]),
    message: z.string().max(1000).optional(),
    snapshot: snapshotSchema,
  })
  .strict();

export const inspectionResultSchema = z
  .object({
    kind: z.literal("inspection"),
    requestId: z.uuid(),
    turnId: z.uuid(),
    toolCallId: identifier,
    status: z.enum(["ok", "conflict", "failed"]),
    snapshot: snapshotSchema,
    result: inspectionDataSchema.optional(),
    message: z.string().max(1000).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if ((value.status === "ok") !== Boolean(value.result))
      ctx.addIssue({
        code: "custom",
        message: "Inspection data must match status.",
      });
  });

export const chatToolResultSchema = z.union([
  toolResultSchema,
  inspectionResultSchema,
]);

export type Snapshot = z.infer<typeof snapshotSchema>;
export type EditBatch = z.infer<typeof editBatchSchema>;
export type ChatInput = z.infer<typeof chatInputSchema>;
export type ToolResult = z.infer<typeof toolResultSchema>;
export type InspectionRequest = z.infer<typeof inspectionRequestSchema>;
export type InspectionData = z.infer<typeof inspectionDataSchema>;
export type InspectionResult = z.infer<typeof inspectionResultSchema>;
export type PendingEdit = {
  toolCallId: string;
  batch: EditBatch;
  expiresAt: string;
};
export type PendingInspection = {
  kind: "inspection";
  toolCallId: string;
  request: InspectionRequest;
  expiresAt: string;
};
export type PendingTool = PendingEdit | PendingInspection;

export function validateInspectionRequest(
  request: InspectionRequest,
  snapshot: Snapshot,
): void {
  if (request.revision !== snapshot.revision)
    throw new ChatError(409, "Document revision changed before inspection.");
}
export type TurnStatus =
  | "running"
  | "awaiting_tools"
  | "completed"
  | "failed"
  | "interrupted";

export class ChatError extends Error {
  constructor(
    public status: 400 | 404 | 409 | 413 | 503,
    message: string,
  ) {
    super(message);
  }
}

// Validate all targets before anything is offered to the browser. Ranges use JS UTF-16 offsets.
// One operation per existing paragraph prevents ambiguous overlapping edits within a batch.
export function validateEditBatch(batch: EditBatch, snapshot: Snapshot): void {
  if (batch.revision !== snapshot.revision)
    throw new ChatError(409, "Document revision changed.");
  const originalIds = new Set(snapshot.paragraphs.map((p) => p.id));
  const ids = new Set(originalIds);
  const touched = new Set<string>();
  const insertionAnchors = new Set<string>();
  for (const op of batch.operations) {
    if (op.type === "insertParagraph") {
      const anchor = op.afterId ?? "<start>";
      if (
        ids.has(op.id) ||
        (op.afterId !== null && !originalIds.has(op.afterId)) ||
        insertionAnchors.has(anchor)
      ) {
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
      throw new ChatError(
        409,
        `The proposed start offset ${op.start} exceeds its end offset ${op.end}. No change was made.`,
      );
    }
    if ("start" in op && op.end > p.text.length) {
      throw new ChatError(
        409,
        `The proposed end offset ${op.end} exceeds paragraph length ${p.text.length} (UTF-16 code units). No change was made.`,
      );
    }
    if (
      op.type === "formatText" &&
      (op.start === op.end ||
        (op.bold === null &&
          op.italic === null &&
          [
            "name",
            "size",
            "color",
            "underline",
            "highlightColor",
            "strikeThrough",
            "subscript",
            "superscript",
          ].every((key) => !(key in op))))
    ) {
      throw new ChatError(400, "Empty formatting operation.");
    }
    if (
      op.type === "formatText" &&
      op.subscript === true &&
      op.superscript === true
    )
      throw new ChatError(
        400,
        "Text cannot be both subscript and superscript.",
      );
    if (
      op.type === "formatParagraph" &&
      op.heading === null &&
      op.list === null &&
      [
        "alignment",
        "firstLineIndent",
        "leftIndent",
        "rightIndent",
        "lineSpacing",
        "spaceBefore",
        "spaceAfter",
        "widowControl",
      ].every((key) => !(key in op))
    ) {
      throw new ChatError(400, "Empty paragraph operation.");
    }
    if (
      op.type === "formatParagraph" &&
      op.list !== null &&
      (batch.operations.length !== 1 ||
        op.heading !== null ||
        [
          "alignment",
          "firstLineIndent",
          "leftIndent",
          "rightIndent",
          "lineSpacing",
          "spaceBefore",
          "spaceAfter",
          "widowControl",
        ].some((key) => key in op))
    ) {
      throw new ChatError(400, "List changes must be proposed separately.");
    }
  }
  if (
    batch.operations.some(
      (o) =>
        o.type === "insertParagraph" && o.afterId && touched.has(o.afterId),
    )
  ) {
    throw new ChatError(
      409,
      "Cannot change an insertion anchor in the same batch.",
    );
  }
}

export function validateAppliedResult(
  pending: PendingEdit,
  before: Snapshot,
  after: Snapshot,
): void {
  if (before.revision === after.revision)
    throw new ChatError(409, "Applied edits must advance the editor revision.");
  const expected = before.paragraphs.map((p) => ({ ...p }));
  for (const op of pending.batch.operations) {
    if (op.type === "insertParagraph") {
      const index =
        op.afterId === null
          ? -1
          : expected.findIndex((p) => p.id === op.afterId);
      expected.splice(index + 1, 0, {
        id: op.id,
        text: op.text,
        heading: 0,
        list: "none",
        marks: [],
      });
      continue;
    }
    const index = expected.findIndex((p) => p.id === op.paragraphId);
    const p = expected[index];
    if (op.type === "deleteParagraph") expected.splice(index, 1);
    if (op.type === "replaceParagraph") p.text = op.text;
    if (op.type === "replaceText")
      p.text = p.text.slice(0, op.start) + op.text + p.text.slice(op.end);
    if (op.type === "formatParagraph") {
      if (op.heading !== null) p.heading = op.heading;
      if (op.list !== null) p.list = op.list;
      const actual = after.paragraphs.find(
        (item) => item.id === op.paragraphId,
      );
      const keys = [
        "alignment",
        "firstLineIndent",
        "leftIndent",
        "rightIndent",
        "lineSpacing",
        "spaceBefore",
        "spaceAfter",
        "widowControl",
      ] as const;
      for (const key of keys) {
        if (op[key] !== undefined && actual?.paragraphFormat?.[key] !== op[key])
          throw new ChatError(
            409,
            "Editor paragraph formatting does not match the pending edit.",
          );
      }
    }
    if (op.type === "formatText") {
      const actual = after.paragraphs.find((p) => p.id === op.paragraphId);
      for (const key of ["bold", "italic"] as const) {
        if (op[key] === null) continue;
        // Marks cover styled runs; gaps mean false. Normalize coverage without per-character work.
        const runs = (actual?.marks ?? [])
          .filter((m) => m[key] && m.end > op.start && m.start < op.end)
          .sort((a, b) => a.start - b.start);
        let coveredThrough = op.start;
        for (const run of runs) {
          if (run.start > coveredThrough) break;
          coveredThrough = Math.max(coveredThrough, run.end);
        }
        if (op[key] ? coveredThrough < op.end : runs.length > 0) {
          throw new ChatError(
            409,
            "Editor formatting does not match the pending edit.",
          );
        }
      }
      const fontKeys = [
        "name",
        "size",
        "color",
        "underline",
        "highlightColor",
        "strikeThrough",
        "subscript",
        "superscript",
      ] as const;
      for (const key of fontKeys) {
        const requested = op[key];
        if (requested === undefined) continue;
        if (!actual?.formatting)
          throw new ChatError(
            409,
            "Editor font formatting could not be verified.",
          );
        const matches = (
          value: string | number | boolean | null | undefined,
        ) => {
          if (
            typeof requested === "string" &&
            key !== "name" &&
            key !== "underline"
          )
            return (
              typeof value === "string" &&
              value.toUpperCase() === requested.toUpperCase()
            );
          return (
            (value ?? (typeof requested === "boolean" ? false : null)) ===
            requested
          );
        };
        if (requested === null || requested === false) {
          if (
            actual.formatting.some(
              (run) =>
                run.end > op.start &&
                run.start < op.end &&
                !matches(run.font[key]),
            )
          )
            throw new ChatError(
              409,
              "Editor font formatting does not match the pending edit.",
            );
        } else {
          const runs = actual.formatting
            .filter(
              (run) =>
                run.end > op.start &&
                run.start < op.end &&
                matches(run.font[key]),
            )
            .sort((a, b) => a.start - b.start);
          let coveredThrough = op.start;
          for (const run of runs) {
            if (run.start > coveredThrough) break;
            coveredThrough = Math.max(coveredThrough, run.end);
          }
          if (coveredThrough < op.end)
            throw new ChatError(
              409,
              "Editor font formatting does not match the pending edit.",
            );
        }
      }
    }
  }
  if (
    expected.length !== after.paragraphs.length ||
    expected.some((p, i) => {
      const actual = after.paragraphs[i];
      return (
        p.id !== actual.id ||
        p.text !== actual.text ||
        p.heading !== actual.heading ||
        p.list !== actual.list
      );
    })
  )
    throw new ChatError(
      409,
      "Editor contents do not match the pending edit. Submit a conflict with fresh context.",
    );
}
