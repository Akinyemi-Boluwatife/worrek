# Worrek

Worrek is a browser-based DOCX editor with document storage and AI-assisted editing. Open a Word document, work on its text and formatting, and ask the document chat to inspect or change the live document.

## What you can do

- Create a document or open an existing `.docx` file.
- Edit text, headings, lists, and formatting in the browser.
- Sign up with email and password, then save and reopen documents.
- Rename saved documents, move them to Trash, restore them, or delete them permanently.
- Chat about a saved document and review proposed edits before applying them, or enable automatic approval for new proposals.

Document uploads are limited to **10 MiB**. Saving is explicit: changes in the editor, including chat edits, must be saved using the save button.

## How it works

The **Next.js frontend** renders the site, account pages, document library, and editor. The editor uses `@docx-editor.dev` packages, with Zustand for application state. Next.js API handlers and server-side requests forward requests to the backend; the browser uses the frontend origin for authentication and document operations.

The **Hono backend** runs on Cloudflare Workers. Better Auth handles email/password accounts and sessions. Authenticated document routes check ownership before loading or modifying a document. Drizzle manages PostgreSQL metadata through a Cloudflare Hyperdrive connection, while Cloudflare R2 stores the DOCX files themselves. PostgreSQL also stores account and document chat data.

For **document chat**, the browser sends a snapshot of the open document, including unsaved edits. The backend combines it with stored conversation history and streams responses from DeepSeek through the AI SDK. The model can request document inspection or propose a validated edit batch. The browser checks the document revision and target text before applying a batch through the editor API as an undoable change, then reports the result to the backend. Stale proposals are refused.

Chat requires a document saved to Worrek. Relevant document context and conversation content are sent to DeepSeek when you use chat. The provider API key stays on the backend.

## Repository layout

| Directory | Contents |
| --- | --- |
| `frontend/` | Next.js app, DOCX editor, document library, auth pages, and backend proxies |
| `backend/src/` | Hono routes, authentication, database schema, and chat services |
| `backend/drizzle/` | PostgreSQL migrations and schema snapshots |
| `backend/tests/` | Backend chat and validation tests |
| `backend/docs/` | Chat protocol and editor capability documentation |
| `design/` | Design notes, static prototypes, and reference assets |

The frontend and backend have separate package manifests and lockfiles; install and run them separately.

## Local development

You need Node.js and npm compatible with the locked dependencies, PostgreSQL, and the Cloudflare tooling installed by the backend dependencies. Use your own database and Cloudflare resources. A DeepSeek API key is needed for chat. Check the editor vendor's licensing terms for the included editor packages, including Pro features.

### 1. Install dependencies

From the repository root:

```sh
npm ci --prefix backend
npm ci --prefix frontend
```

### 2. Configure the backend

Create an ignored `backend/.dev.vars` file:

```dotenv
BETTER_AUTH_SECRET=<your-random-auth-secret>
BETTER_AUTH_URL=http://localhost:8787
DEEPSEEK_API_KEY=<your-provider-api-key>
```

`DEEPSEEK_MODEL` is optional; the current default is `deepseek-flash`.

Create an ignored `backend/.env` file for database tooling:

```dotenv
DATABASE_URL=<your-postgresql-connection-string>
```

Apply the migrations in `backend/drizzle/` to your development database with Drizzle Kit before using authentication, saved documents, or chat. `backend/drizzle.config.ts` reads `DATABASE_URL`; the running Worker connects through the `HYPERDRIVE` binding instead. Starting the app does not apply migrations automatically.

The backend dev script sources `backend/.hyperdrive.local`. Create that ignored shell file and export Wrangler's local Hyperdrive connection-string variable for the `HYPERDRIVE` binding, pointing to your development database. The file must exist for `npm run dev` to start.

`backend/wrangler.jsonc` declares the `HYPERDRIVE` and `DOCUMENTS_BUCKET` bindings. Its resource identifiers belong to the original deployment; configure your own resources for your deployment. Keep connection strings and credentials in ignored local files or Worker secrets.

### 3. Configure the frontend

Create an ignored `frontend/.env.local` file:

```dotenv
API_URL=http://localhost:8787
```

`API_URL` is read on the server. Use the backend origin, without an `/api` suffix. Keep provider keys and database credentials out of browser-exposed environment variables.

### 4. Start both apps

In one terminal:

```sh
cd backend
npm run dev
```

In another:

```sh
cd frontend
npm run dev
```

Open `http://localhost:3000`. If you change the backend address, update `API_URL`, `BETTER_AUTH_URL`, and the trusted origins in `backend/src/lib/better-auth/options.ts` as appropriate.

## Development checks

Backend:

```sh
cd backend
npm run typecheck
npm test
```

Frontend:

```sh
cd frontend
npm run lint
npx tsc --noEmit
npm run build
```

Backend chat tests use an isolated PostgreSQL engine and controlled provider streams, without a production database or provider key.

## Current boundaries

Email/password authentication is implemented. Google and Apple buttons are present in the UI but are not connected to sign-in providers.

Chat supports text edits, paragraph insertion/deletion, and common text and paragraph formatting. Phrase search and table inspection are available; table editing and broader structural changes are future work. Saving the file remains separate from applying a chat proposal.

For detailed request formats, validation rules, and supported operations, see [document chat](backend/docs/document-chat.md) and the [editor capability matrix](backend/docs/chat-automation-capabilities.md).
