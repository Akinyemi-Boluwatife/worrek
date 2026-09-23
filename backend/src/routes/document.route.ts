import { and, desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";

import { document } from "../db/schema";
import {
  requireAuth,
  type AuthVariables,
} from "../middleware/requireAuth.middleware";

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const MAX_DOCX_BYTES = 10 * 1024 * 1024;
const MAX_UPLOAD_BYTES = MAX_DOCX_BYTES + 64 * 1024;
const MAX_FILE_NAME_LENGTH = 255;
const MAX_TITLE_LENGTH = 255;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Bindings = {
  HYPERDRIVE: Hyperdrive;
  DOCUMENTS_BUCKET: R2Bucket;
};

export const documentRoute = new Hono<{
  Bindings: Bindings;
  Variables: AuthVariables;
}>();

function capFileName(name: string): string {
  if (name.length <= MAX_FILE_NAME_LENGTH) return name;

  const extension = name.slice(-5);
  return name.slice(0, MAX_FILE_NAME_LENGTH - extension.length) + extension;
}

function resolveTitle(requested: string | undefined, fileName: string): string {
  const title = requested?.trim();

  if (title) return title.slice(0, MAX_TITLE_LENGTH);

  return fileName.replace(/\.docx$/i, "").slice(0, MAX_TITLE_LENGTH);
}

documentRoute.get("/", requireAuth, async (c) => {
  const user = c.get("user");

  try {
    const db = c.get("db");

    const queryStart = performance.now();
    const documents = await db
      .select({
        id: document.id,
        title: document.title,
        fileName: document.fileName,
        updatedAt: document.updatedAt,
        size: document.size,
      })
      .from(document)
      .where(eq(document.userId, user.id))
      .orderBy(desc(document.updatedAt));
    c.get("timings").push({ name: "query", duration: performance.now() - queryStart });

    return c.json({ data: documents });
  } catch (error) {
    console.error(
      JSON.stringify({
        message: "GET /api/documents failed",
        error: error instanceof Error ? error.message : "Unknown error",
      }),
    );

    return c.json({ message: "Failed to fetch documents." }, 500);
  }
});

documentRoute.get("/:id", requireAuth, async (c) => {
  const id = c.req.param("id");
  if (!UUID_PATTERN.test(id)) return c.json({ message: "Document not found." }, 404);

  try {
    const db = c.get("db");
    const [saved] = await db.select().from(document).where(
      and(eq(document.id, id), eq(document.userId, c.get("user").id)),
    ).limit(1);

    return saved
      ? c.json({ data: saved })
      : c.json({ message: "Document not found." }, 404);
  } catch (error) {
    console.error("GET /api/documents/:id failed", error);
    return c.json({ message: "Failed to fetch document." }, 500);
  }
});

documentRoute.patch(
  "/:id",
  requireAuth,
  bodyLimit({
    maxSize: 4096,
    onError: (c) => c.json({ message: "Document name is too long." }, 413),
  }),
  async (c) => {
    const id = c.req.param("id");
    if (!UUID_PATTERN.test(id)) {
      return c.json({ message: "Document not found." }, 404);
    }

    const body: unknown = await c.req.json().catch(() => null);
    const title = body && typeof body === "object" && "title" in body
      ? body.title
      : null;
    if (typeof title !== "string" || !title.trim() || title.trim().length > MAX_TITLE_LENGTH) {
      return c.json({ message: "Enter a document name up to 255 characters." }, 400);
    }

    try {
      const db = c.get("db");
      const [updated] = await db.update(document).set({
        title: title.trim(),
        updatedAt: new Date(),
      }).where(and(
        eq(document.id, id),
        eq(document.userId, c.get("user").id),
      )).returning();

      return updated
        ? c.json({ data: updated })
        : c.json({ message: "Document not found." }, 404);
    } catch (error) {
      console.error("PATCH /api/documents/:id failed", error);
      return c.json({ message: "Failed to rename document." }, 500);
    }
  },
);

documentRoute.get("/:id/content", requireAuth, async (c) => {
  const id = c.req.param("id");
  if (!UUID_PATTERN.test(id)) return c.json({ message: "Document not found." }, 404);

  try {
    const db = c.get("db");
    const queryStart = performance.now();
    const [saved] = await db.select().from(document).where(
      and(eq(document.id, id), eq(document.userId, c.get("user").id)),
    ).limit(1);
    c.get("timings").push({ name: "query", duration: performance.now() - queryStart });
    if (!saved) return c.json({ message: "Document not found." }, 404);

    const storageStart = performance.now();
    const object = await c.env.DOCUMENTS_BUCKET.get(saved.storageKey);
    c.get("timings").push({ name: "storage", duration: performance.now() - storageStart });
    if (!object) return c.json({ message: "Document file not found." }, 404);

    return new Response(object.body, {
      headers: {
        "Content-Type": DOCX_MIME,
        "Cache-Control": "private, no-store",
        "X-Document-Title": encodeURIComponent(saved.title),
        "X-Document-File-Name": encodeURIComponent(saved.fileName),
      },
    });
  } catch (error) {
    console.error("GET /api/documents/:id/content failed", error);
    return c.json({ message: "Failed to open document." }, 500);
  }
});

documentRoute.put(
  "/:id/content",
  requireAuth,
  bodyLimit({
    maxSize: MAX_DOCX_BYTES,
    onError: (c) => c.json({ message: "Document exceeds the 10 MiB limit." }, 413),
  }),
  async (c) => {
    const id = c.req.param("id");
    if (!UUID_PATTERN.test(id)) return c.json({ message: "Document not found." }, 404);

    try {
      const db = c.get("db");
      const [saved] = await db.select().from(document).where(
        and(eq(document.id, id), eq(document.userId, c.get("user").id)),
      ).limit(1);
      if (!saved) return c.json({ message: "Document not found." }, 404);

      const bytes = await c.req.arrayBuffer();
      if (bytes.byteLength === 0) {
        return c.json({ message: "The document is empty." }, 400);
      }
      if (bytes.byteLength > MAX_DOCX_BYTES) {
        return c.json({ message: "Document exceeds the 10 MiB limit." }, 413);
      }

      const oldStorageKey = saved.storageKey;
      const storageKey = `documents/${saved.userId}/${id}-${crypto.randomUUID()}.docx`;
      await c.env.DOCUMENTS_BUCKET.put(storageKey, bytes, {
        httpMetadata: { contentType: DOCX_MIME },
      });

      try {
        const [updated] = await db.update(document).set({
          storageKey,
          size: bytes.byteLength,
          updatedAt: new Date(),
        }).where(and(
          eq(document.id, id),
          eq(document.userId, c.get("user").id),
          eq(document.storageKey, oldStorageKey),
        )).returning();

        if (!updated) {
          await c.env.DOCUMENTS_BUCKET.delete(storageKey);
          return c.json({ message: "Document changed. Reopen it before saving." }, 409);
        }

        await c.env.DOCUMENTS_BUCKET.delete(oldStorageKey).catch((error) => {
          console.error("Old document file cleanup failed", error);
        });
        return c.json({ data: updated });
      } catch (error) {
        await c.env.DOCUMENTS_BUCKET.delete(storageKey).catch(() => {});
        throw error;
      }
    } catch (error) {
      console.error("PUT /api/documents/:id/content failed", error);
      return c.json({ message: "Failed to save document." }, 500);
    }
  },
);

documentRoute.post(
  "/",
  requireAuth,
  bodyLimit({
    maxSize: MAX_UPLOAD_BYTES,
    onError: (c) =>
      c.json({ message: "Upload exceeds the 10 MiB document limit." }, 413),
  }),
  async (c) => {
    const user = c.get("user");

    const body = await c.req.parseBody().catch((error) => {
      console.error(
        JSON.stringify({
          message: "POST /api/documents parse failed",
          error: error instanceof Error ? error.message : "Unknown error",
        }),
      );

      return null;
    });

    if (!body) {
      return c.json({ message: "Malformed upload." }, 400);
    }

    const uploaded = body.file;

    if (!(uploaded instanceof File)) {
      return c.json({ message: "A .docx file is required." }, 400);
    }

    if (uploaded.size === 0) {
      return c.json({ message: "The uploaded file is empty." }, 400);
    }

    if (!uploaded.name.toLowerCase().endsWith(".docx")) {
      return c.json({ message: "The file must be a .docx document." }, 400);
    }

    if (uploaded.size > MAX_DOCX_BYTES) {
      return c.json(
        { message: "Upload exceeds the 10 MiB document limit." },
        413,
      );
    }

    const file = uploaded;
    const fileName = capFileName(file.name);
    const title = resolveTitle(
      typeof body.title === "string" ? body.title : undefined,
      fileName,
    );

    const documentId = crypto.randomUUID();
    const storageKey = `documents/${user.id}/${documentId}.docx`;

    try {
      await c.env.DOCUMENTS_BUCKET.put(storageKey, file.stream(), {
        httpMetadata: { contentType: DOCX_MIME },
      });
    } catch (error) {
      console.error(
        JSON.stringify({
          message: "POST /api/documents R2 upload failed",
          error: error instanceof Error ? error.message : "Unknown error",
        }),
      );

      return c.json({ message: "Failed to store the document." }, 500);
    }

    try {
      const db = c.get("db");

      const [created] = await db
        .insert(document)
        .values({
          id: documentId,
          userId: user.id,
          title,
          fileName,
          storageKey,
          size: file.size,
        })
        .returning();

      return c.json({ data: created }, 201);
    } catch (error) {
      await c.env.DOCUMENTS_BUCKET.delete(storageKey).catch(() => {});

      console.error(
        JSON.stringify({
          message: "POST /api/documents insert failed",
          error: error instanceof Error ? error.message : "Unknown error",
        }),
      );

      return c.json({ message: "Failed to save the document." }, 500);
    }
  },
);
