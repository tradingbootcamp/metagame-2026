import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { timestamps, user } from "./auth";

export const ticketSource = pgEnum("ticket_source", [
  "stripe",
  "opennode",
  "admin",
]);

export const ticketStatus = pgEnum("ticket_status", [
  "pending",
  "paid",
  "failed",
  "underpaid",
]);

// One row per purchase; quantity is locked to 1 at checkout, so purchase ==
// ticket. Written by the payment webhooks beside the Airtable row, which stays
// the ops/finance view. Ownership (owner_user_id) is only ever set by a claim.
export const tickets = pgTable(
  "tickets",
  {
    // Stripe PaymentIntent id, OpenNode charge id, or admin:<uuid>.
    paymentId: text().primaryKey(),
    ticketCode: text().notNull().unique(),
    source: ticketSource().notNull(),
    status: ticketStatus().notNull(),
    test: boolean().notNull().default(false),
    tier: text(),
    amountCents: integer(),
    purchaserEmail: text(),
    purchaserName: text(),
    ownerUserId: text().references(() => user.id, { onDelete: "set null" }),
    claimedAt: timestamp({ withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index("tickets_purchaser_email_idx").on(t.purchaserEmail),
    index("tickets_owner_user_id_idx").on(t.ownerUserId),
  ],
);
