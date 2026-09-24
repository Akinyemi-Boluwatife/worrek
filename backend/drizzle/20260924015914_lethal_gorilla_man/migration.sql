ALTER TABLE "document" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "document_user_active_idx" ON "document" ("user_id","updated_at") WHERE "deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "document_user_trash_idx" ON "document" ("user_id","deleted_at") WHERE "deleted_at" IS NOT NULL;