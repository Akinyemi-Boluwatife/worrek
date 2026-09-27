CREATE TABLE "document_chat" (
	"document_id" uuid PRIMARY KEY,
	"summary" text DEFAULT '' NOT NULL,
	"summarized_through" integer DEFAULT 0 NOT NULL,
	"active_turn_id" uuid,
	"lease_owner" uuid,
	"lease_until" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "document_chat_turn" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"sequence" bigserial,
	"document_id" uuid NOT NULL,
	"requests" jsonb NOT NULL,
	"status" text NOT NULL,
	"messages" jsonb DEFAULT '[]' NOT NULL,
	"snapshot" jsonb NOT NULL,
	"pending_edit" jsonb,
	"step_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "document_chat_turn_document_sequence_idx" ON "document_chat_turn" ("document_id","sequence");--> statement-breakpoint
ALTER TABLE "document_chat" ADD CONSTRAINT "document_chat_document_id_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "document"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "document_chat_turn" ADD CONSTRAINT "document_chat_turn_document_id_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "document"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "document_chat" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "document_chat_turn" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
REVOKE ALL ON TABLE "document_chat", "document_chat_turn" FROM anon, authenticated;
