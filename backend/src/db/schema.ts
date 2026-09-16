import { sql } from "drizzle-orm";
import {
  boolean,
  pgEnum,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

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
