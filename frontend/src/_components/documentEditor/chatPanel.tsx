"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import type { DocxEditorInstance } from "@docx-editor.dev/core/editor";
import {
  ChatEditor,
  type ChatOperation,
  type PendingChatEdit,
  type PendingChatInspection,
} from "@/_lib/chatEditor";
import {
  displayHistory,
  getChatHistory,
  inspectionResultBody,
  streamChat,
  toolResultBody,
  type ChatDisplay,
  type ChatEvent,
  type StoredTurn,
} from "@/_lib/chatClient";
import styles from "./editor.module.css";

type EditApprovalMode = "review" | "auto";
type Pending = {
  turnId: string;
  edit: PendingChatEdit;
  recovered: boolean;
  autoApprove: boolean;
};

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
          operation.name ? `Font ${operation.name}` : null,
          operation.size === undefined ? null : `${operation.size} pt`,
          operation.color ? `Text color ${operation.color}` : null,
          operation.underline === undefined
            ? null
            : operation.underline === "None"
              ? "Remove underline"
              : `${operation.underline} underline`,
          operation.highlightColor === undefined
            ? null
            : operation.highlightColor === null
              ? "Remove highlight"
              : `Highlight ${operation.highlightColor}`,
          operation.strikeThrough === undefined
            ? null
            : operation.strikeThrough
              ? "Strikethrough"
              : "Remove strikethrough",
          operation.subscript === undefined
            ? null
            : operation.subscript
              ? "Subscript"
              : "Remove subscript",
          operation.superscript === undefined
            ? null
            : operation.superscript
              ? "Superscript"
              : "Remove superscript",
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
          operation.alignment ? `${operation.alignment} alignment` : null,
          operation.firstLineIndent === undefined
            ? null
            : `First line indent ${operation.firstLineIndent} pt`,
          operation.leftIndent === undefined
            ? null
            : `Left indent ${operation.leftIndent} pt`,
          operation.rightIndent === undefined
            ? null
            : `Right indent ${operation.rightIndent} pt`,
          operation.lineSpacing === undefined
            ? null
            : `Line spacing ${operation.lineSpacing} pt`,
          operation.spaceBefore === undefined
            ? null
            : `Space before ${operation.spaceBefore} pt`,
          operation.spaceAfter === undefined
            ? null
            : `Space after ${operation.spaceAfter} pt`,
          operation.widowControl === undefined
            ? null
            : operation.widowControl
              ? "Keep lines together"
              : "Allow widow lines",
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
  const autoApproval = useRef<string | null>(null);
  const autoInspection = useRef<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<ChatDisplay[]>([]);
  const [pending, setPending] = useState<Pending | null>(null);
  const [pendingInspection, setPendingInspection] = useState<{
    turnId: string;
    inspection: PendingChatInspection;
  } | null>(null);
  const [receipt, setReceipt] = useState<Record<string, unknown> | null>(null);
  const [inspectionReceipt, setInspectionReceipt] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [approvalMode, setApprovalMode] = useState<EditApprovalMode>("review");
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
        if (
          active?.status === "awaiting_tools" &&
          active.pendingEdit &&
          "kind" in active.pendingEdit
        )
          setPendingInspection({
            turnId: active.id,
            inspection: active.pendingEdit,
          });
        else if (
          active?.status === "awaiting_tools" &&
          active.pendingEdit &&
          !("kind" in active.pendingEdit)
        )
          setPending({
            turnId: active.id,
            edit: active.pendingEdit,
            recovered: true,
            autoApprove: false,
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
  }, [messages, pending, pendingInspection, busy]);

  async function refreshHistory() {
    if (!documentId) return;
    const history = await getChatHistory(documentId);
    setTurns(history.data);
    setMessages(displayHistory(history.data));
    setCursor(history.nextCursor);
    setHistoryReady(true);
    const active = history.data[0];
    setPendingInspection(
      active?.status === "awaiting_tools" &&
        active.pendingEdit &&
        "kind" in active.pendingEdit
        ? { turnId: active.id, inspection: active.pendingEdit }
        : null,
    );
    setPending(
      active?.status === "awaiting_tools" &&
        active.pendingEdit &&
        !("kind" in active.pendingEdit)
        ? {
            turnId: active.id,
            edit: active.pendingEdit,
            recovered: true,
            autoApprove: false,
          }
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
        const index = id
          ? copy.findLastIndex((message) => message.id === id)
          : -1;
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
      setPending({
        turnId: event.turnId,
        edit: event.edit,
        recovered: false,
        autoApprove: approvalMode === "auto",
      });
    } else if (event.type === "inspection_request") {
      setPendingInspection({
        turnId: event.turnId,
        inspection: event.inspection,
      });
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
      pendingInspection ||
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

  const applyAutomatically = useEffectEvent(() => {
    void acknowledge("apply");
  });

  useEffect(() => {
    if (
      !pending?.autoApprove ||
      pending.recovered ||
      approvalMode !== "auto" ||
      busy ||
      receipt ||
      controller.current
    )
      return;
    const key = `${pending.turnId}:${pending.edit.toolCallId}`;
    if (autoApproval.current === key) return;
    autoApproval.current = key;
    applyAutomatically();
  }, [pending, approvalMode, busy, receipt]);

  async function completeInspection() {
    if (
      !pendingInspection ||
      !adapter.current ||
      !documentId ||
      controller.current ||
      busy
    )
      return;
    const currentInspection = pendingInspection;
    if (
      Date.now() >= new Date(currentInspection.inspection.expiresAt).getTime()
    ) {
      setError(
        "This inspection expired. Ask again to read the current document.",
      );
      await refreshHistory().catch(() => {});
      return;
    }
    let body = inspectionReceipt;
    if (!body) {
      try {
        body = inspectionResultBody(
          currentInspection.turnId,
          currentInspection.inspection.toolCallId,
          adapter.current.inspect(currentInspection.inspection.request),
        );
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : "Could not inspect the document.",
        );
        return;
      }
      setInspectionReceipt(body);
    }
    setPendingInspection(null);
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
      setInspectionReceipt(null);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not return inspection results.",
      );
      try {
        const latest = await refreshHistory();
        if (
          latest?.id === currentInspection.turnId &&
          latest.status === "awaiting_tools" &&
          latest.pendingEdit &&
          "kind" in latest.pendingEdit
        ) {
          setPendingInspection(currentInspection);
          setInspectionReceipt(body);
        } else setInspectionReceipt(null);
      } catch {
        setPendingInspection(currentInspection);
        setInspectionReceipt(body);
      }
    } finally {
      controller.current = null;
      setBusy(false);
    }
  }

  const inspectAutomatically = useEffectEvent(() => {
    void completeInspection();
  });

  useEffect(() => {
    if (!pendingInspection || busy || controller.current || inspectionReceipt)
      return;
    const key = `${pendingInspection.turnId}:${pendingInspection.inspection.toolCallId}`;
    if (autoInspection.current === key) return;
    autoInspection.current = key;
    inspectAutomatically();
  }, [pendingInspection, busy, inspectionReceipt]);

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
        <strong>AI Agent</strong>
        {busy ? <span className={styles.chatWorking}>Working…</span> : null}
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
                Ask about this document or describe a change. Choose whether to
                review each suggested edit or apply it automatically.
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
            {busy && !pending && !pendingInspection ? (
              <p className={styles.chatThinking}>Thinking…</p>
            ) : null}
            {pendingInspection ? (
              <p className={styles.chatThinking} role="status">
                {inspectionReceipt
                  ? "Inspection result ready to retry."
                  : "Inspecting document…"}
                {inspectionReceipt || error ? (
                  <button
                    type="button"
                    onClick={() => void completeInspection()}
                    disabled={busy}
                  >
                    Retry inspection
                  </button>
                ) : null}
              </p>
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
                            {operation.type === "formatText"
                              ? [operation.color, operation.highlightColor]
                                  .filter((color): color is string =>
                                    Boolean(color),
                                  )
                                  .map((color, colorIndex) => (
                                    <span
                                      key={colorIndex}
                                      aria-hidden="true"
                                      style={{
                                        display: "inline-block",
                                        width: 11,
                                        height: 11,
                                        marginRight: 6,
                                        border: "1px solid #94a3b8",
                                        borderRadius: 2,
                                        backgroundColor: color,
                                      }}
                                    />
                                  ))
                              : null}
                            {description.after}
                          </span>
                        ) : null}
                      </div>
                    );
                  })
                )}
                {pending.autoApprove && !receipt && !error ? (
                  <p role="status">Applying automatically…</p>
                ) : null}
                <div className={styles.chatProposalActions}>
                  {!pending.recovered &&
                  (!pending.autoApprove || receipt || error) ? (
                    <button
                      type="button"
                      onClick={() => void acknowledge("apply")}
                      disabled={busy}
                      className={styles.chatApply}
                    >
                      {receipt ? "Retry confirmation" : "Apply changes"}
                    </button>
                  ) : null}
                  {!receipt &&
                  (!pending.autoApprove || pending.recovered || error) ? (
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
                disabled={
                  busy ||
                  Boolean(pending) ||
                  Boolean(pendingInspection) ||
                  !historyReady
                }
              />
              <div className={styles.composerFooter}>
                <select
                  className={styles.editApprovalSelect}
                  aria-label="Edit approval mode"
                  value={approvalMode}
                  onChange={(event) =>
                    setApprovalMode(event.target.value as EditApprovalMode)
                  }
                  disabled={
                    busy || Boolean(pending) || Boolean(pendingInspection)
                  }
                >
                  <option value="review">Review edit</option>
                  <option value="auto">Auto approve edit</option>
                </select>
                <button
                  type="submit"
                  className={styles.sendButton}
                  disabled={
                    !draft.trim() ||
                    busy ||
                    Boolean(pending) ||
                    Boolean(pendingInspection) ||
                    !historyReady
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
