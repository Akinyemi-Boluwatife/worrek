"use client";

import { useEffect, useRef, useState } from "react";
import type { DocxEditorInstance } from "@docx-editor.dev/core/editor";
import {
  ChatEditor,
  type ChatOperation,
  type PendingChatEdit,
} from "@/_lib/chat-editor";
import {
  displayHistory,
  getChatHistory,
  streamChat,
  toolResultBody,
  type ChatDisplay,
  type ChatEvent,
  type StoredTurn,
} from "@/_lib/chat-client";
import styles from "./editor.module.css";

type Pending = { turnId: string; edit: PendingChatEdit; recovered: boolean };

function operationDescription(operation: ChatOperation) {
  switch (operation.type) {
    case "replaceParagraph":
      return {
        title: "Rewrite paragraph",
        before: operation.expectedText,
        after: operation.text,
      };
    case "replaceText":
      return {
        title: "Replace text",
        before: operation.expectedText.slice(operation.start, operation.end),
        after: operation.text,
      };
    case "insertParagraph":
      return { title: "Add paragraph", before: "", after: operation.text };
    case "deleteParagraph":
      return {
        title: "Delete paragraph",
        before: operation.expectedText,
        after: "",
      };
    case "formatText":
      return {
        title: "Format text",
        before: operation.expectedText.slice(operation.start, operation.end),
        after: [
          operation.bold === null
            ? null
            : operation.bold
              ? "Bold"
              : "Remove bold",
          operation.italic === null
            ? null
            : operation.italic
              ? "Italic"
              : "Remove italic",
        ]
          .filter(Boolean)
          .join(" · "),
      };
    case "formatParagraph":
      return {
        title: "Format paragraph",
        before: operation.expectedText,
        after: [
          operation.heading === null
            ? null
            : operation.heading === 0
              ? "Body text"
              : `Heading ${operation.heading}`,
          operation.list === null
            ? null
            : operation.list === "none"
              ? "Remove list"
              : `${operation.list} list`,
        ]
          .filter(Boolean)
          .join(" · "),
      };
  }
}

export function ChatPanel({
  documentId,
  editor,
}: {
  documentId: string | null;
  editor: DocxEditorInstance | null;
}) {
  const adapter = useRef<ChatEditor | null>(null);
  const controller = useRef<AbortController | null>(null);
  const streamMessage = useRef<{ turnId: string; id: string } | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<ChatDisplay[]>([]);
  const [pending, setPending] = useState<Pending | null>(null);
  const [receipt, setReceipt] = useState<Record<string, unknown> | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(Boolean(documentId));
  const [error, setError] = useState("");
  const [cursor, setCursor] = useState<number | null>(null);
  const [turns, setTurns] = useState<StoredTurn[]>([]);
  const [historyReady, setHistoryReady] = useState(false);

  useEffect(() => {
    if (!editor || !documentId) return;
    const instance = new ChatEditor(editor);
    adapter.current = instance;
    let cancelled = false;
    void getChatHistory(documentId)
      .then((history) => {
        if (cancelled) return;
        setTurns(history.data);
        setMessages(displayHistory(history.data));
        setCursor(history.nextCursor);
        setHistoryReady(true);
        const active = history.data[0];
        if (active?.status === "awaiting_tools" && active.pendingEdit)
          setPending({
            turnId: active.id,
            edit: active.pendingEdit,
            recovered: true,
          });
      })
      .catch((cause) => {
        if (!cancelled)
          setError(
            cause instanceof Error
              ? cause.message
              : "Could not load chat history.",
          );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      controller.current?.abort();
      instance.dispose();
      if (adapter.current === instance) adapter.current = null;
    };
  }, [documentId, editor]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, pending, busy]);

  async function refreshHistory() {
    if (!documentId) return;
    const history = await getChatHistory(documentId);
    setTurns(history.data);
    setMessages(displayHistory(history.data));
    setCursor(history.nextCursor);
    setHistoryReady(true);
    const active = history.data[0];
    setPending(
      active?.status === "awaiting_tools" && active.pendingEdit
        ? { turnId: active.id, edit: active.pendingEdit, recovered: true }
        : null,
    );
    return active;
  }

  function onEvent(event: ChatEvent) {
    if (event.type === "turn") {
      const id = crypto.randomUUID();
      streamMessage.current = { turnId: event.turnId, id };
      setMessages((current) => [
        ...current,
        { id, role: "assistant", text: "" },
      ]);
    } else if (event.type === "text_delta") {
      const id = streamMessage.current?.id;
      setMessages((current) => {
        const copy = [...current];
        const index = id ? copy.findLastIndex((message) => message.id === id) : -1;
        if (index >= 0)
          copy[index] = { ...copy[index], text: copy[index].text + event.text };
        return copy;
      });
    } else if (event.type === "text_reset") {
      if (streamMessage.current?.turnId !== event.turnId) return;
      const id = streamMessage.current.id;
      setMessages((current) => current.filter((message) => message.id !== id));
      streamMessage.current = null;
    } else if (event.type === "edit_request") {
      setPending({ turnId: event.turnId, edit: event.edit, recovered: false });
    } else if (event.type === "finish") {
      streamMessage.current = null;
    }
  }

  async function send(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      !documentId ||
      !adapter.current ||
      !historyReady ||
      controller.current ||
      busy ||
      pending ||
      !draft.trim()
    )
      return;
    const message = draft.trim();
    let snapshot;
    try {
      snapshot = adapter.current.snapshot();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not read the document.",
      );
      return;
    }
    setDraft("");
    setError("");
    setBusy(true);
    setMessages((current) => [
      ...current,
      { id: crypto.randomUUID(), role: "user", text: message },
    ]);
    const abort = new AbortController();
    controller.current = abort;
    try {
      await streamChat(
        documentId,
        "",
        { requestId: crypto.randomUUID(), message, snapshot },
        abort.signal,
        onEvent,
      );
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Chat could not finish.",
      );
      await refreshHistory().catch(() => {});
    } finally {
      controller.current = null;
      setBusy(false);
    }
  }

  async function acknowledge(choice: "apply" | "reject") {
    if (
      !pending ||
      !adapter.current ||
      !documentId ||
      controller.current ||
      busy
    )
      return;
    setError("");
    if (Date.now() >= new Date(pending.edit.expiresAt).getTime()) {
      setError("This suggestion expired. Ask for a new one.");
      await refreshHistory().catch(() => {});
      return;
    }
    let body = receipt;
    if (!body) {
      let snapshot;
      let status: "applied" | "conflict" | "failed" | "rejected" = "rejected";
      let message: string | undefined;
      try {
        if (choice === "apply" && !pending.recovered) {
          const outcome = adapter.current.apply(pending.edit.batch);
          ({ snapshot, status, message } = outcome);
        } else {
          snapshot = adapter.current.snapshot();
          message = pending.recovered
            ? "Suggestion left pending after the editor was reopened."
            : "User rejected the suggestion.";
        }
      } catch (cause) {
        try {
          snapshot = adapter.current.snapshot();
        } catch {
          setError(
            "Could not read the document. Try again after the editor finishes loading.",
          );
          return;
        }
        status = "failed";
        message =
          cause instanceof Error
            ? cause.message
            : "The editor could not apply this suggestion.";
      }
      body = toolResultBody(
        pending.turnId,
        pending.edit.toolCallId,
        status,
        snapshot,
        message,
      );
      setReceipt(body);
      if (status === "conflict" || status === "failed")
        setError(message ?? "The suggestion could not be applied.");
    }
    const currentPending = pending;
    setPending(null);
    setBusy(true);
    const abort = new AbortController();
    controller.current = abort;
    try {
      await streamChat(
        documentId,
        "/tool-results",
        body,
        abort.signal,
        onEvent,
      );
      setReceipt(null);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not confirm this suggestion. Retry confirmation.",
      );
      try {
        const latest = await refreshHistory();
        if (
          latest?.id === currentPending.turnId &&
          latest.status === "awaiting_tools"
        ) {
          setPending(currentPending);
          setReceipt(body);
        } else setReceipt(null);
      } catch {
        setPending(currentPending);
        // Keep the same receipt so a retry can never apply an edit a second time.
        setReceipt(body);
      }
    } finally {
      controller.current = null;
      setBusy(false);
    }
  }

  async function loadEarlier() {
    if (!documentId || !cursor || loading) return;
    setLoading(true);
    try {
      const history = await getChatHistory(documentId, cursor);
      const joined = [...turns, ...history.data];
      setTurns(joined);
      setMessages(displayHistory(joined));
      setCursor(history.nextCursor);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not load earlier chat.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className={styles.inspectorHeader}>
        <strong>Document assistant</strong>
        {busy ? <span className={styles.chatWorking}>Writing…</span> : null}
      </div>
      {!documentId ? (
        <div className={styles.chatEmpty}>
          Save this document to start a conversation about it.
        </div>
      ) : (
        <>
          <div className={styles.chatThread} aria-live="polite">
            {cursor ? (
              <button
                type="button"
                onClick={() => void loadEarlier()}
                disabled={loading}
                className={styles.chatEarlier}
              >
                Load earlier messages
              </button>
            ) : null}
            {!messages.length && !loading ? (
              <p className={styles.chatEmpty}>
                Ask about this document or describe a change. You’ll approve
                each suggested edit before it appears in the document.
              </p>
            ) : null}
            {messages.map((message) =>
              message.text ? (
                <div
                  key={message.id}
                  className={`${styles.chatMessage} ${message.role === "user" ? styles.chatUser : message.role === "status" ? styles.chatStatus : styles.chatAssistant}`}
                >
                  {message.text}
                </div>
              ) : null,
            )}
            {busy && !pending ? (
              <p className={styles.chatThinking}>Thinking…</p>
            ) : null}
            {pending ? (
              <section
                className={styles.chatProposal}
                aria-label="Proposed document changes"
              >
                <strong>Suggested changes</strong>
                {receipt?.status === "applied" ? (
                  <p>Applied in the editor. Confirming the result…</p>
                ) : null}
                {pending.recovered ? (
                  <p>
                    This suggestion was left pending when the editor closed.
                    Dismiss it to continue chatting.
                  </p>
                ) : (
                  pending.edit.batch.operations.map((operation, index) => {
                    const description = operationDescription(operation);
                    return (
                      <div key={index} className={styles.chatChange}>
                        <b>{description.title}</b>
                        {description.before ? (
                          <span className={styles.chatBefore}>
                            {description.before}
                          </span>
                        ) : null}
                        {description.after ? (
                          <span className={styles.chatAfter}>
                            {description.after}
                          </span>
                        ) : null}
                      </div>
                    );
                  })
                )}
                <div className={styles.chatProposalActions}>
                  {!pending.recovered ? (
                    <button
                      type="button"
                      onClick={() => void acknowledge("apply")}
                      disabled={busy}
                      className={styles.chatApply}
                    >
                      {receipt ? "Retry confirmation" : "Apply changes"}
                    </button>
                  ) : null}
                  {!receipt ? (
                    <button
                      type="button"
                      onClick={() => void acknowledge("reject")}
                      disabled={busy}
                      className={styles.chatReject}
                    >
                      {pending.recovered ? "Dismiss suggestion" : "Reject"}
                    </button>
                  ) : null}
                </div>
              </section>
            ) : null}
            {error ? (
              <p role="alert" className={styles.chatError}>
                {error}
                {!historyReady ? (
                  <button
                    type="button"
                    onClick={() => void refreshHistory().catch(() => {})}
                  >
                    Retry loading chat
                  </button>
                ) : null}
              </p>
            ) : null}
            <div ref={bottom} />
          </div>
          <form
            className={styles.composerDock}
            onSubmit={(event) => void send(event)}
          >
            <div className={styles.composerBox}>
              <label
                className={styles.composerScope}
                htmlFor="document-chat-input"
              >
                Current document
              </label>
              <textarea
                id="document-chat-input"
                className={styles.composerInput}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
                placeholder="Ask a question or describe a change…"
                rows={2}
                maxLength={16_000}
                disabled={busy || Boolean(pending) || !historyReady}
              />
              <div className={styles.composerFooter}>
                <span>Review every edit</span>
                <button
                  type="submit"
                  className={styles.sendButton}
                  disabled={
                    !draft.trim() || busy || Boolean(pending) || !historyReady
                  }
                  aria-label="Send message"
                >
                  <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <path
                      d="M4 10h12m0 0-5-5m5 5-5 5"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </form>
        </>
      )}
    </>
  );
}
