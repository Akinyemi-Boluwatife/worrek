CREATE TYPE "waitlist_status" AS ENUM('waiting', 'invited', 'joined');--> statement-breakpoint
CREATE TABLE "waitlist" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100),
	"email" varchar(255) NOT NULL,
	"referral_platform" varchar(100),
	"status" "waitlist_status" DEFAULT 'waiting'::"waitlist_status" NOT NULL,
	"marketing_consent" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"invited_at" timestamp with time zone,
	"joined_at" timestamp with time zone
);
--> statement-breakpoint
CREATE UNIQUE INDEX "waitlist_email_unique" ON "waitlist" (lower("email"));