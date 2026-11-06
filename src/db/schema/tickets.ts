import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  type AnyPgColumn,
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

// One row per admission. Single-ticket checkouts lock quantity to 1, so their
// row is the whole purchase; a Family & Friends Pack writes one row per ticket.
// Written by the payment webhooks beside the Airtable row, which stays the
// ops/finance view. Ownership (owner_user_id) is only ever set by a claim.
// holder_user_id is who has the code to share or claim; null means the buyer.
// Unclaiming makes the attendee the holder under a fresh code.
export const tickets = pgTable(
  "tickets",
  {
    // Stripe PaymentIntent id (`<id>:ticket:<n>` for pack tickets), OpenNode
    // charge id, or admin:<uuid>.
    paymentId: text().primaryKey(),
    ticketCode: text().notNull().unique(),
    source: ticketSource().notNull(),
    status: ticketStatus().notNull(),
    test: boolean().notNull().default(false),
    tier: text(),
    amountCents: integer(),
    couponCode: text(),
    purchaserEmail: text(),
    purchaserName: text(),
    purchaserDiscord: text(),
    ownerUserId: text().references(() => user.id, { onDelete: "set null" }),
    claimedAt: timestamp({ withTimezone: true }),
    holderUserId: text().references(() => user.id, { onDelete: "set null" }),
    // Minted when the holder first looks for it on /account; a friend's
    // /invite link carries it.
    referralCode: text().unique(),
    // The ticket whose referral code this one was bought with. A fact about
    // the ticket, so it survives claims and transfers.
    referredByPaymentId: text().references(
      (): AnyPgColumn => tickets.paymentId,
      { onDelete: "set null" },
    ),
    // Beside status, not in it: status is what the payment did, and webhook
    // retries rewrite it. Undoing a void keeps who voided it and when.
    voided: boolean().notNull().default(false),
    voidedAt: timestamp({ withTimezone: true }),
    voidedBy: text(),
    unvoidedAt: timestamp({ withTimezone: true }),
    unvoidedBy: text(),
    // The refund event that last applied to this ticket. Staff undoing a void
    // survives retries because the same refund never applies to a ticket twice.
    refundEventId: text(),
    ...timestamps,
  },
  (t) => [
    index("tickets_purchaser_email_idx").on(t.purchaserEmail),
    index("tickets_owner_user_id_idx").on(t.ownerUserId),
    index("tickets_holder_user_id_idx").on(t.holderUserId),
    index("tickets_referred_by_payment_id_idx").on(t.referredByPaymentId),
  ],
);

// Full refunds, kept apart from tickets because one can arrive before its
// tickets are stored. payment_id is the bare payment, without `:ticket:<n>`.
export const ticketRefunds = pgTable(
  "ticket_refunds",
  {
    stripeEventId: text().primaryKey(),
    paymentId: text().notNull(),
    appliedAt: timestamp({ withTimezone: true }),
    ...timestamps,
  },
  (t) => [index("ticket_refunds_payment_id_idx").on(t.paymentId)],
);
