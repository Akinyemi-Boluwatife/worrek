# Document chat

Hono streams DeepSeek responses using AI SDK 7 and `@ai-sdk/deepseek`. Chat belongs to a saved document; every endpoint uses the existing session and checks ownership and Trash status. No document bytes are modified by these endpoints. The browser supplies its live context and later applies validated edits through the editor API.

## Setup

1. Apply the generated `document_chat` Drizzle migration to the intended database using the existing migration workflow. It depends on the existing document/Trash migrations. The chat tables enable row level security and have no direct `anon` or `authenticated` database access; document chat goes through the authenticated backend. This change does not apply migrations automatically.
2. Add `DEEPSEEK_API_KEY` to the ignored `backend/.dev.vars` for local development, or configure the Worker secret for deployment. Never use a `NEXT_PUBLIC_` variable for the key.
3. Set `API_URL` in `frontend/.env.local` to the backend Worker origin. The Next.js handlers at `/api/documents/:id/chat` and `/tool-results` forward cookies and streaming bodies to the backend. The provider key stays on the backend.
4. Optionally configure `DEEPSEEK_MODEL`; the default is `deepseek-flash`. Thinking is explicitly disabled. Switching to thinking requires testing provider reasoning metadata with stored tool messages.
5. Run `npm run typecheck` and `npm test` from `backend`; run `npm run lint` and TypeScript checks from `frontend`. Backend tests use an isolated PostgreSQL engine and controlled provider streams; no API key or production database is used.

The editor panel reads the open DOCX, streams chat text, and offers Review edit (the default) or Auto approve edit. Review mode presents each edit batch for Apply or Reject. Auto mode applies each new validated proposal through the same revision and conflict checks, then sends its result to the server. Suggestions recovered after the editor is reopened still require manual dismissal. Applying changes modifies the live editor and creates an undo step. The user still saves the DOCX through the existing save button. A fresh or locally opened file must first be saved to Worrek to use document chat.

The model can also call `inspectDocument` to search the live document, list tables, or inspect one table. These read actions run automatically in the browser and return stable paragraph or table IDs. Text search scans the whole editor body and returns up to 100 matches per page; `nextOffset` lets the model request the remaining pages. A table list includes `selectedTableId` when the caret is inside a table. A result with multiple text matches includes the count and context so the model can ask which occurrence the user meant. The model resumes from the inspection result and current snapshot; table editing is not yet available.

## Requests

Types and Zod schemas live in `src/lib/chat/contracts.ts`. Unknown fields and client-supplied message history are rejected; history is assembled on the server.

### Start a user turn

`POST /api/documents/:id/chat`, JSON:

```json
{
  "requestId": "b8dfb7fb-4d2b-431b-9f71-548b779c5839",
  "message": "Make the greeting friendlier",
  "snapshot": {
    "revision": "editor-session-uuid:1",
    "paragraphs": [
      { "id": "p1", "text": "Hello world", "heading": 0, "list": "none", "marks": [], "formatting": [], "paragraphFormat": {} }
    ],
    "selection": null
  }
}
```

Use stable paragraph IDs during an editor session and a revision that changes on every content or formatting edit, including undo. Include a session UUID in the revision to prevent revision collisions after reopening. Send the latest unsaved document contents. Paragraphs have no newline characters; represent new paragraphs separately. Selection is `{paragraphId,start,end}` or `null`. All offsets are JavaScript UTF-16 offsets, not visual columns or Unicode code points.

`heading` is 0 (body) through 6. `list` is `none`, `bullet`, or `number`. Marks are `{start,end,bold,italic}` runs; gaps mean neither bold nor italic. The browser also includes `formatting` runs with directly authored font values and `paragraphFormat` with the paragraph's own alignment, indent, spacing, style, and widow control values. These fields are optional in the request schema for older snapshots. Missing run values and null paragraph values do not describe inherited rendering. Include document body and table-cell paragraphs in reading order using unique IDs; unsupported structures must remain untouched by the adapter. See [chat automation capabilities](chat-automation-capabilities.md).

### Complete a tool call

`POST /api/documents/:id/chat/tool-results`, JSON:

```json
{
  "requestId": "dc5f106f-c051-4b42-b561-3de5b057a3bc",
  "turnId": "<turn UUID from stream>",
  "toolCallId": "<pending tool call ID>",
  "status": "applied",
  "snapshot": {
    "revision": "editor-session-uuid:2",
    "paragraphs": [
      { "id": "p1", "text": "Hello there", "heading": 0, "list": "none", "marks": [], "formatting": [], "paragraphFormat": {} }
    ],
    "selection": null
  }
}
```

Status is `applied`, `conflict`, `rejected`, or `failed`; optional `message` describes failure in up to 1,000 characters. Always return current context. `applied` must advance the revision and match the requested text, paragraph order, heading/list changes and requested formatting coverage. An inconsistent acknowledgement returns 409; refresh the editor snapshot and submit a conflict with a fresh request ID.

For `inspectDocument`, the same endpoint accepts `kind: "inspection"`, the request and turn IDs, the tool call ID, the current `snapshot`, and `status: "ok" | "conflict" | "failed"`. An `ok` result includes a bounded `result` for `findText`, `listTables`, or `inspectTable`; failures include a `message`. A successful read must use the requested revision and search offset. The server validates search ranges against the stored paragraph text before continuing the model. Reads do not change the editor revision.

Each user request and acknowledgement has a new UUID. Retrying the same payload uses the same UUID and receives JSON `{duplicate:true,turnId,status}` without another model call. Reusing that UUID with different content returns 409. This response is JSON, not SSE: the client must inspect Content-Type.

### History

`GET /api/documents/:id/chat?before=<sequence>` returns `{data,nextCursor}` with up to 30 turns, newest first. Each turn contains persisted model messages, status, timestamps, step count and any unexpired pending tool call; snapshots and request fingerprints are omitted.

Render user text, assistant text and edit outcomes. System messages are internal application status, not chat bubbles. **History never triggers automatic edit execution.** Unexpired read requests may safely resume against the live revision. If a pending edit batch was not applied, explicitly acknowledge `rejected`; if its outcome cannot be determined, refresh document contents and wait for expiry before starting a new turn. Running turns with expired leases are reported as interrupted. Tool acknowledgements expire after five minutes.

## Streaming protocol

Successful POST requests return `text/event-stream` with JSON data and named events:

| Event | Fields | Meaning |
| --- | --- | --- |
| `turn` | `turnId` | Persistent turn identifier |
| `text_delta` | `text` | Append response text immediately |
| `text_reset` | `turnId` | Clear draft narration when a validated tool call replaces it |
| `edit_request` | `turnId`, `edit` | Complete validated batch, persisted before emission |
| `inspection_request` | `turnId`, `inspection` | Bounded read request, persisted before emission and executed automatically against the live editor |
| `finish` | `turnId`, `status` | `completed` or `awaiting_tools` |
| `error` | `turnId`, `message` | Response failed; fetch history before retrying |

Every data object also includes `type`, matching the event name. Never interpret streamed text or partial tool arguments as executable changes. A transport close without `finish` is interrupted, not success. Aborting the request cancels inference and records an interrupted turn when cleanup can complete; the lease also recovers from abrupt Worker termination.

## Editor adapter contract

`edit_request.edit` contains `toolCallId`, `expiresAt`, and `batch:{revision,operations}`. The browser adapter must:

1. Check the active document, expiry, editor revision and exact expected paragraph text immediately before applying.
2. Deduplicate by document/turn/tool-call ID. Never execute batches recovered from history or a duplicate HTTP response.
3. Validate the whole batch and apply atomically in one undo transaction. Return `conflict` on concurrent typing. A failed batch must leave the editor unchanged.
4. Return the resulting snapshot and status. Do not silently save the DOCX: the existing save flow handles persistence.

Supported operations:

| Type | Inputs | Behavior |
| --- | --- | --- |
| `replaceParagraph` | paragraphId, expectedText, text | Rewrite a complete paragraph. The editor derives the range from the current paragraph, so the model does not count offsets. |
| `replaceText` | paragraphId, expectedText, start, end, text | Replace a range; equal offsets insert and empty text deletes. Preserve surrounding formatting. |
| `insertParagraph` | id, afterId, text | Insert a body paragraph with no list or explicit bold/italic. Null anchor means start; each insertion in a batch needs a distinct anchor that existed before that batch. |
| `deleteParagraph` | paragraphId, expectedText | Remove that paragraph. |
| `formatText` | paragraphId, expectedText, start, end, bold, italic; optional name, size, color, underline, highlightColor, strikeThrough, subscript, superscript | Null bold/italic and omitted optional fields mean leave unchanged. Highlight null removes highlighting. Size is in points; colors use `#RRGGBB`. |
| `formatParagraph` | paragraphId, expectedText, heading, list; optional alignment, firstLineIndent, leftIndent, rightIndent, lineSpacing, spaceBefore, spaceAfter, widowControl | Null heading/list and omitted optional fields mean leave unchanged. Measurements are in points. |

Only one operation per existing paragraph is allowed in a batch. Dependent changes can be requested in a later user turn. New paragraph IDs must be unique. Insertions within one batch need distinct existing anchors, and an insertion anchor cannot be changed in that batch. List changes must be their own batch. The editor refuses unsupported operations atomically rather than applying only part of a suggestion. A pending proposal recovered after a reload can be dismissed; it is never executed from history.

## Context and operational behavior

The model sees server-managed chat history, the current editor snapshot and confirmed tool outcomes. Older turns are summarized after history exceeds 12 turns and 60,000 characters, retaining the last six turns intact. Original messages remain in the database. Summarization never splits tool exchanges. The current snapshot overrides historical descriptions.

Tool acknowledgements get a fixed, factual confirmation without another model call. Draft narration is cleared when a validated proposal arrives; the operation preview shows the exact text that will change.

Technical bounds: 2 MiB JSON request, 200,000 document text characters, 16,000 message characters, 50 operations per batch, 100 search matches per page, eight tool steps per turn, 8,192 output tokens per response, 90-second generation timeout and 120-second generation lease. A conservative 750,000-byte context budget rejects oversized input explicitly. Search pagination removes the first-page result cap, but very large documents and exhaustive listings can still exceed context, step, and response limits. These protect request execution; subscription limits and billing are deferred.

One active generation or unacknowledged edit is allowed per document. PostgreSQL row locks are held only during short state transitions. Lease tokens prevent an expired generation from overwriting a newer turn. Permanent document deletion cascades chat data; Trash blocks access and restoration makes it available again.

Logs contain turn IDs, durations, token usage and success/failure status, never prompts or document text. History and snapshots are stored in the application's existing database and relevant context is sent to DeepSeek. Provider errors are sanitized before returning or logging.

Live acceptance: with a configured key, test a document question, text rewrite, insertion/deletion, heading/bold/list request, and a follow-up such as “make that shorter.” Record first text/tool latency and verify intended targets and preserved content. Mock timings are not model performance measurements.
