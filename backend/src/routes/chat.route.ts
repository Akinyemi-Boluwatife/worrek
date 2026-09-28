import { and, eq, isNull } from "drizzle-orm";
import { Hono, type MiddlewareHandler } from "hono";
import { bodyLimit } from "hono/body-limit";
import { streamSSE } from "hono/streaming";
import { z } from "zod";
import { document } from "../db/schema";
import {
  requireAuth,
  type AuthVariables,
} from "../middleware/requireAuth.middleware";
import { trustedOrigins } from "../lib/better-auth/options";
import {
  ChatError,
  chatToolResultSchema,
  chatInputSchema,
  GENERATION_TIMEOUT_MS,
  MAX_REQUEST_BYTES,
} from "../lib/chat/contracts";
import { ChatRepository } from "../lib/chat/repository";
import { createChatModel, generateChat } from "../lib/chat/generation";

type ChatEnv = {
  Bindings: CloudflareBindings & {
    DEEPSEEK_API_KEY?: string;
    DEEPSEEK_MODEL?: string;
  };
  Variables: AuthVariables & {
    chatDocument: { id: string; title: string };
    chatStreaming: boolean;
  };
};

// Injection is used by route tests; production always uses requireAuth and the direct DeepSeek provider.
export function createChatRoute(
  dependencies: {
    authenticate?: MiddlewareHandler<ChatEnv>;
    model?: typeof createChatModel;
  } = {},
) {
  const route = new Hono<ChatEnv>();
  route.onError((error, c) => {
    if (error instanceof ChatError)
      return c.json({ message: error.message }, error.status);
    console.error(JSON.stringify({ event: "document_chat_request_failed" }));
    return c.json({ message: "Document chat request failed." }, 500);
  });
  if (dependencies.authenticate) route.use("*", dependencies.authenticate);
  else route.use("*", requireAuth);
  route.use("*", async (c, next) => {
    try {
      await next();
    } finally {
      // Streaming responses retain their connection until generation and persistence finish.
      if (!c.get("chatStreaming")) await c.get("db").$client.end();
    }
  });
  route.use("/:id/*", async (c, next) => {
    const origin = c.req.header("Origin");
    if (
      c.req.method === "POST" &&
      origin &&
      ![...trustedOrigins, "http://localhost:3000"].includes(origin)
    ) {
      return c.json({ message: "Origin is not allowed." }, 403);
    }
    const id = c.req.param("id");
    if (!z.uuid().safeParse(id).success)
      return c.json({ message: "Document not found." }, 404);
    const [saved] = await c
      .get("db")
      .select({ id: document.id, title: document.title })
      .from(document)
      .where(
        and(
          eq(document.id, id!),
          eq(document.userId, c.get("user").id),
          isNull(document.deletedAt),
        ),
      )
      .limit(1);
    if (!saved) return c.json({ message: "Document not found." }, 404);
    c.set("chatDocument", saved);
    c.header("Cache-Control", "private, no-store");
    await next();
  });
  route.get("/:id/chat", async (c) => {
    const before = c.req.query("before");
    const parsed = z.coerce.number().int().positive().safeParse(before);
    if (before !== undefined && !parsed.success)
      return c.json({ message: "Invalid history cursor." }, 400);
    const repository = new ChatRepository(
      c.get("db"),
      c.get("chatDocument").id,
    );
    const { turns, conversation } = await repository.history(
      before === undefined ? undefined : parsed.data,
    );
    return c.json({
      data: turns.map(
        ({ snapshot: _snapshot, requests: _requests, ...turn }) => ({
          ...turn,
          status:
            turn.status === "running" &&
            (!conversation?.leaseUntil ||
              conversation.leaseUntil.getTime() <= Date.now())
              ? "interrupted"
              : turn.status === "awaiting_tools" &&
                  turn.pendingEdit &&
                  new Date(turn.pendingEdit.expiresAt).getTime() <= Date.now()
                ? "interrupted"
                : turn.status,
          pendingEdit:
            turn.pendingEdit &&
            new Date(turn.pendingEdit.expiresAt).getTime() > Date.now()
              ? turn.pendingEdit
              : null,
        }),
      ),
      nextCursor: turns.length === 30 ? turns[turns.length - 1].sequence : null,
    });
  });
  route.post(
    "/:id/chat/*",
    bodyLimit({
      maxSize: MAX_REQUEST_BYTES,
      onError: (c) => c.json({ message: "Chat context is too large." }, 413),
    }),
  );
  route.post(
    "/:id/chat",
    bodyLimit({
      maxSize: MAX_REQUEST_BYTES,
      onError: (c) => c.json({ message: "Chat context is too large." }, 413),
    }),
  );

  for (const path of ["/:id/chat", "/:id/chat/tool-results"]) {
    route.post(path, async (c) => {
      const schema = path.endsWith("tool-results")
        ? chatToolResultSchema
        : chatInputSchema;
      const parsed = schema.safeParse(await c.req.json().catch(() => null));
      if (!parsed.success)
        return c.json(
          {
            message: "Invalid chat request.",
            issues: parsed.error.issues.map((i) => ({
              path: i.path,
              message: i.message,
            })),
          },
          400,
        );
      const model = (dependencies.model ?? createChatModel)(c.env);
      const repository = new ChatRepository(
        c.get("db"),
        c.get("chatDocument").id,
      );
      const digest = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(JSON.stringify(parsed.data)),
      );
      const hash = Array.from(new Uint8Array(digest), (b) =>
        b.toString(16).padStart(2, "0"),
      ).join("");
      const accepted = await repository.begin(parsed.data, hash);
      if (accepted.duplicate) {
        return c.json({
          duplicate: true,
          turnId: accepted.turn.id,
          status: accepted.turn.status,
        });
      }
      const controller = new AbortController();
      const abort = () => controller.abort();
      c.req.raw.signal.addEventListener("abort", abort, { once: true });
      if (c.req.raw.signal.aborted) abort();
      c.header("Content-Encoding", "Identity");
      c.set("chatStreaming", true);
      return streamSSE(
        c,
        async (stream) => {
          stream.onAbort(abort);
          const timeout = setTimeout(abort, GENERATION_TIMEOUT_MS);
          const work = generateChat({
            model,
            repository,
            ...accepted,
            title: c.get("chatDocument").title,
            signal: controller.signal,
            emit: async (event) => {
              controller.signal.throwIfAborted();
              await stream.writeSSE({
                event: event.type,
                data: JSON.stringify(event),
              });
            },
          });
          // Keep cancellation cleanup (including releasing the DB lease) alive on disconnect.
          c.executionCtx.waitUntil(
            work.finally(() => c.get("db").$client.end()).catch(() => {}),
          );
          try {
            await work;
          } finally {
            clearTimeout(timeout);
            c.req.raw.signal.removeEventListener("abort", abort);
          }
        },
        async () => {
          console.error(
            JSON.stringify({
              event: "document_chat_stream_failed",
              turnId: accepted.turn.id,
            }),
          );
        },
      );
    });
  }
  return route;
}

export const chatRoute = createChatRoute();
