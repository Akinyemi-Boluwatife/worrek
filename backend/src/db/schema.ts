import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  bigserial,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { user } from "./auth-schema";
import type { ModelMessage } from "ai";
import type { Snapshot, PendingEdit, TurnStatus } from "../lib/chat/contracts";

export const waitlistStatus = pgEnum("waitlist_status", [
  "waiting",
  "invited",
  "joined",
]);

export const waitlist = pgTable(
  "waitlist",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    firstName: varchar("first_name", { length: 100 }).notNull(),

    lastName: varchar("last_name", { length: 100 }),

    email: varchar("email", { length: 255 }).notNull(),

    referralPlatform: varchar("referral_platform", { length: 100 }),

    status: waitlistStatus("status").default("waiting").notNull(),

    marketingConsent: boolean("marketing_consent").default(false).notNull(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),

    invitedAt: timestamp("invited_at", { withTimezone: true }),

    joinedAt: timestamp("joined_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("waitlist_email_unique").on(sql`lower(${table.email})`),
  ],
);

export const document = pgTable(
  "document",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),

    title: varchar("title", { length: 255 }).notNull(),

    fileName: varchar("file_name", { length: 255 }).notNull(),

    storageKey: text("storage_key").notNull().unique(),

    size: integer("size"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("document_user_id_idx").on(table.userId),
    index("document_user_active_idx").on(table.userId, table.updatedAt).where(sql`${table.deletedAt} IS NULL`),
    index("document_user_trash_idx").on(table.userId, table.deletedAt).where(sql`${table.deletedAt} IS NOT NULL`),
  ],
);

export const documentChat = pgTable.withRLS("document_chat", {
  documentId: uuid("document_id").primaryKey().references(() => document.id, { onDelete: "cascade" }),
  summary: text("summary").notNull().default(""),
  summarizedThrough: integer("summarized_through").notNull().default(0),
  activeTurnId: uuid("active_turn_id"),
  leaseOwner: uuid("lease_owner"),
  leaseUntil: timestamp("lease_until", { withTimezone: true }),
});

export const documentChatTurn = pgTable.withRLS("document_chat_turn", {
  id: uuid("id").defaultRandom().primaryKey(),
  sequence: bigserial("sequence", { mode: "number" }).notNull(),
  documentId: uuid("document_id").notNull().references(() => document.id, { onDelete: "cascade" }),
  requests: jsonb("requests").$type<Array<{ id: string; hash: string }>>().notNull(),
  status: text("status").$type<TurnStatus>().notNull(),
  messages: jsonb("messages").$type<ModelMessage[]>().notNull().default([]),
  snapshot: jsonb("snapshot").$type<Snapshot>().notNull(),
  pendingEdit: jsonb("pending_edit").$type<PendingEdit | null>(),
  stepCount: integer("step_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [index("document_chat_turn_document_sequence_idx").on(table.documentId, table.sequence)]);
