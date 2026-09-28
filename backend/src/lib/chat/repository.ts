import { and, asc, desc, eq, gt, lt, sql } from "drizzle-orm";
import type { ModelMessage } from "ai";
import type { Database } from "../../db";
import { documentChat, documentChatTurn } from "../../db/schema";
import {
  ChatError,
  LEASE_MS,
  MAX_EDIT_STEPS,
  validateAppliedResult,
  type ChatInput,
  type InspectionResult,
  type ToolResult,
  type PendingTool,
  type TurnStatus,
} from "./contracts";

export type Turn = typeof documentChatTurn.$inferSelect;
export type Conversation = typeof documentChat.$inferSelect;

export function toolMessage(
  toolCallId: string,
  status: string,
  message?: string,
  toolName: "editDocument" | "inspectDocument" = "editDocument",
  result?: InspectionResult["result"],
): ModelMessage {
  return {
    role: "tool",
    content: [
      {
        type: "tool-result",
        toolCallId,
        toolName,
        output: {
          type: "json",
          value: {
            status,
            message: message ?? "",
            ...(result ? { result } : {}),
          },
        },
      },
    ],
  };
}

export class ChatRepository {
  constructor(
    private db: Database,
    private documentId: string,
  ) {}

  async history(before?: number) {
    const turns = await this.db
      .select()
      .from(documentChatTurn)
      .where(
        and(
          eq(documentChatTurn.documentId, this.documentId),
          before === undefined
            ? undefined
            : lt(documentChatTurn.sequence, before),
        ),
      )
      .orderBy(desc(documentChatTurn.sequence))
      .limit(30);
    const [conversation] = await this.db
      .select()
      .from(documentChat)
      .where(eq(documentChat.documentId, this.documentId));
    return { turns, conversation };
  }

  async begin(input: ChatInput | ToolResult | InspectionResult, hash: string) {
    return this.db.transaction(async (tx) => {
      await tx
        .insert(documentChat)
        .values({ documentId: this.documentId })
        .onConflictDoNothing();
      const [conversation] = await tx
        .select()
        .from(documentChat)
        .where(eq(documentChat.documentId, this.documentId))
        .for("update");
      const [duplicate] = await tx
        .select()
        .from(documentChatTurn)
        .where(
          and(
            eq(documentChatTurn.documentId, this.documentId),
            sql`${documentChatTurn.requests} @> ${JSON.stringify([{ id: input.requestId }])}::jsonb`,
          ),
        )
        .limit(1);
      if (duplicate) {
        if (
          duplicate.requests.find((r) => r.id === input.requestId)?.hash !==
          hash
        ) {
          throw new ChatError(
            409,
            "Request ID was already used for different content.",
          );
        }
        return {
          duplicate: true as const,
          turn: duplicate,
          conversation,
          owner: "",
          acknowledgement: null,
        };
      }

      const now = Date.now();
      if (
        conversation.leaseOwner &&
        conversation.leaseUntil &&
        conversation.leaseUntil.getTime() > now
      ) {
        throw new ChatError(
          409,
          "A response is already running for this document.",
        );
      }
      let active: Turn | undefined;
      if (conversation.activeTurnId) {
        [active] = await tx
          .select()
          .from(documentChatTurn)
          .where(eq(documentChatTurn.id, conversation.activeTurnId));
      }

      let turn: Turn;
      if ("turnId" in input) {
        if (
          !active ||
          active.id !== input.turnId ||
          active.status !== "awaiting_tools" ||
          !active.pendingEdit ||
          active.pendingEdit.toolCallId !== input.toolCallId ||
          new Date(active.pendingEdit.expiresAt).getTime() <= now
        ) {
          throw new ChatError(
            409,
            "This tool call is no longer awaiting a result. Refresh the document context.",
          );
        }
        const pendingInspection = "kind" in active.pendingEdit;
        if (pendingInspection !== "kind" in input)
          throw new ChatError(
            409,
            "The tool result does not match the pending request.",
          );
        if ("kind" in input && "kind" in active.pendingEdit) {
          if (input.status === "ok") {
            const request = active.pendingEdit.request;
            if (
              input.snapshot.revision !== active.snapshot.revision ||
              input.result?.type !== request.type ||
              (input.result.type === "findText" &&
                request.type === "findText" &&
                (input.result.query !== request.query ||
                  input.result.offset !== (request.offset ?? 0))) ||
              (input.result.type === "inspectTable" &&
                request.type === "inspectTable" &&
                input.result.tableId !== request.tableId)
            )
              throw new ChatError(
                409,
                "Inspection result does not match the current request.",
              );
            if (input.result.type === "findText") {
              for (const match of input.result.matches) {
                const paragraph = active.snapshot.paragraphs.find(
                  (p) => p.id === match.paragraphId,
                );
                const actual = paragraph?.text.slice(match.start, match.end);
                const matchesQuery =
                  request.type === "findText" &&
                  (request.matchCase
                    ? actual === request.query
                    : actual?.toLocaleLowerCase() ===
                      request.query.toLocaleLowerCase());
                if (!actual || !matchesQuery)
                  throw new ChatError(
                    409,
                    "Inspection match does not match the document.",
                  );
              }
            }
          }
        } else if (
          !("kind" in active.pendingEdit) &&
          input.status === "applied"
        )
          validateAppliedResult(
            active.pendingEdit,
            active.snapshot,
            input.snapshot,
          );
        [turn] = await tx
          .update(documentChatTurn)
          .set({
            requests: [...active.requests, { id: input.requestId, hash }],
            snapshot: input.snapshot,
            messages: [
              ...active.messages,
              toolMessage(
                input.toolCallId,
                input.status,
                input.message,
                "kind" in input ? "inspectDocument" : "editDocument",
                "kind" in input ? input.result : undefined,
              ),
            ],
            pendingEdit: null,
            status: "running",
          })
          .where(eq(documentChatTurn.id, active.id))
          .returning();
      } else {
        if (
          active?.status === "awaiting_tools" &&
          active.pendingEdit &&
          new Date(active.pendingEdit.expiresAt).getTime() > now
        ) {
          throw new ChatError(
            409,
            `Complete the pending ${"kind" in active.pendingEdit ? "inspection" : "edit"} before sending another message.`,
          );
        }
        if (
          active &&
          (active.status === "running" || active.status === "awaiting_tools")
        ) {
          await tx
            .update(documentChatTurn)
            .set({
              status: "interrupted",
              pendingEdit: null,
              messages: active.pendingEdit
                ? [
                    ...active.messages,
                    toolMessage(
                      active.pendingEdit.toolCallId,
                      "unknown",
                      "Tool result expired; use current document contents.",
                      "kind" in active.pendingEdit
                        ? "inspectDocument"
                        : "editDocument",
                    ),
                  ]
                : active.messages,
            })
            .where(eq(documentChatTurn.id, active.id));
        }
        [turn] = await tx
          .insert(documentChatTurn)
          .values({
            documentId: this.documentId,
            requests: [{ id: input.requestId, hash }],
            status: "running",
            snapshot: input.snapshot,
            messages: [{ role: "user", content: input.message }],
          })
          .returning();
      }
      if (turn.stepCount > MAX_EDIT_STEPS)
        throw new ChatError(
          409,
          "This turn has reached its editing step limit.",
        );
      const owner = crypto.randomUUID();
      await tx
        .update(documentChat)
        .set({
          activeTurnId: turn.id,
          leaseOwner: owner,
          leaseUntil: new Date(now + LEASE_MS),
        })
        .where(eq(documentChat.documentId, this.documentId));
      return {
        duplicate: false as const,
        turn,
        conversation,
        owner,
        acknowledgement:
          "turnId" in input && !("kind" in input) ? input.status : null,
      };
    });
  }

  async context(conversation: Conversation, turn: Turn) {
    return this.db
      .select()
      .from(documentChatTurn)
      .where(
        and(
          eq(documentChatTurn.documentId, this.documentId),
          gt(documentChatTurn.sequence, conversation.summarizedThrough),
          lt(documentChatTurn.sequence, turn.sequence),
        ),
      )
      .orderBy(asc(documentChatTurn.sequence));
  }

  // The lease token fences out a timed-out generation after a newer request has started.
  async finish(
    turn: Turn,
    owner: string,
    status: TurnStatus,
    messages: ModelMessage[],
    pendingEdit: PendingTool | null = null,
  ) {
    await this.db.transaction(async (tx) => {
      const [locked] = await tx
        .select()
        .from(documentChat)
        .where(
          and(
            eq(documentChat.documentId, this.documentId),
            eq(documentChat.leaseOwner, owner),
          ),
        )
        .for("update");
      if (!locked) throw new ChatError(409, "Response lease expired.");
      await tx
        .update(documentChatTurn)
        .set({ status, messages, pendingEdit, stepCount: turn.stepCount + 1 })
        .where(eq(documentChatTurn.id, turn.id));
      await tx
        .update(documentChat)
        .set({
          leaseOwner: null,
          leaseUntil: null,
          activeTurnId: status === "awaiting_tools" ? turn.id : null,
        })
        .where(eq(documentChat.documentId, this.documentId));
    });
  }

  async saveSummary(owner: string, summary: string, through: number) {
    const rows = await this.db
      .update(documentChat)
      .set({ summary, summarizedThrough: through })
      .where(
        and(
          eq(documentChat.documentId, this.documentId),
          eq(documentChat.leaseOwner, owner),
        ),
      )
      .returning({ id: documentChat.documentId });
    if (!rows.length) throw new ChatError(409, "Response lease expired.");
  }
}
