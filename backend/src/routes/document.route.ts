import { desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";

import { createDb } from "../db";
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
    const db = await createDb(c.env.HYPERDRIVE);

    const documents = await db
      .select()
      .from(document)
      .where(eq(document.userId, user.id))
      .orderBy(desc(document.updatedAt));

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
      const db = await createDb(c.env.HYPERDRIVE);

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
