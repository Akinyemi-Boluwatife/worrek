import type { ChatSnapshot, PendingChatEdit } from "./chat-editor";

export type ChatEvent =
  | { type: "turn"; turnId: string }
  | { type: "text_delta"; text: string }
  | { type: "text_reset"; turnId: string }
  | { type: "edit_request"; turnId: string; edit: PendingChatEdit }
  | { type: "finish"; turnId: string; status: "completed" | "awaiting_tools" }
  | { type: "error"; turnId: string; message: string };

export type StoredTurn = {
  id: string;
  sequence: number;
  status: string;
  messages: Array<{ role: string; content: string | Array<{ type: string; text?: string; output?: { value?: { status?: string } } }> }>;
  pendingEdit: PendingChatEdit | null;
};

const endpoint = (documentId: string) => `/api/documents/${encodeURIComponent(documentId)}/chat`;

async function errorMessage(response: Response) {
  const body = (await response.json().catch(() => null)) as { message?: string } | null;
  return body?.message ?? `Chat request failed (${response.status}).`;
}

export async function getChatHistory(documentId: string, before?: number) {
  const url = new URL(endpoint(documentId), window.location.origin);
  if (before) url.searchParams.set("before", String(before));
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(await errorMessage(response));
  return (await response.json()) as { data: StoredTurn[]; nextCursor: number | null };
}

export async function streamChat(
  documentId: string,
  path: "" | "/tool-results",
  body: Record<string, unknown>,
  signal: AbortSignal,
  onEvent: (event: ChatEvent) => void,
) {
  const response = await fetch(`${endpoint(documentId)}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
    body: JSON.stringify(body),
    cache: "no-store",
    signal,
  });
  if (!response.ok) throw new Error(await errorMessage(response));
  if (!response.headers.get("content-type")?.includes("text/event-stream")) {
    const duplicate = (await response.json()) as { duplicate?: boolean };
    if (duplicate.duplicate) throw new Error("This request was already received. Chat history has been refreshed.");
    throw new Error("The chat service returned an unexpected response.");
  }
  if (!response.body) throw new Error("The chat response was empty.");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const frameBoundary = /\r?\n\r?\n/;
  let buffer = "";
  let finished = false;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      buffer += decoder.decode(chunk.value, { stream: true });
      while (true) {
        const boundary = frameBoundary.exec(buffer);
        if (!boundary) break;
        const frame = buffer.slice(0, boundary.index);
        buffer = buffer.slice(boundary.index + boundary[0].length);
        const data = frame.split(/\r?\n/).filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trimStart()).join("\n");
        if (!data) continue;
        const event = JSON.parse(data) as ChatEvent;
        if (event.type === "error") throw new Error(event.message);
        if (event.type === "finish") finished = true;
        onEvent(event);
      }
    }
  } finally {
    reader.releaseLock();
  }
  if (!finished) throw new Error("The response stopped early. Chat history has been refreshed.");
}

export type ChatDisplay = { id: string; role: "user" | "assistant" | "status"; text: string };

export function displayHistory(turns: StoredTurn[]): ChatDisplay[] {
  return turns.toReversed().flatMap((turn) => turn.messages.flatMap((message, index): ChatDisplay[] => {
    if (message.role === "user") {
      return typeof message.content === "string"
        ? [{ id: `${turn.id}:${index}`, role: "user" as const, text: message.content }]
        : [];
    }
    if (message.role === "assistant") {
      const text = typeof message.content === "string"
        ? message.content
        : message.content.filter((part) => part.type === "text").map((part) => part.text ?? "").join("");
      return text ? [{ id: `${turn.id}:${index}`, role: "assistant" as const, text }] : [];
    }
    if (message.role === "tool" && Array.isArray(message.content)) {
      if (turn.messages.slice(index + 1).some((later) => later.role === "assistant")) return [];
      const status = message.content.find((part) => part.type === "tool-result")?.output?.value?.status;
      if (status === "applied") return [{ id: `${turn.id}:${index}`, role: "status" as const, text: "Changes applied to the editor. Save the document to keep them." }];
      if (status === "rejected") return [{ id: `${turn.id}:${index}`, role: "status" as const, text: "Suggestion rejected." }];
      if (status === "conflict" || status === "failed") return [{ id: `${turn.id}:${index}`, role: "status" as const, text: "Suggestion could not be applied." }];
    }
    return [];
  }));
}

export function toolResultBody(turnId: string, toolCallId: string, status: string, snapshot: ChatSnapshot, message?: string) {
  return { requestId: crypto.randomUUID(), turnId, toolCallId, status, snapshot, ...(message ? { message } : {}) };
}
