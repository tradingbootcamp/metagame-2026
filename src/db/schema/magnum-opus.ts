import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

// Every change to an account's user.tokens or user.loan_tokens, written in the
// same statement as the change. kind "loan" is a self-serve loan from the
// Magnum Opus tab (actor = the borrower); "adjustment" is a hand edit on
// /backstage/magnum-opus (actor = whoever made it).
export const tokenLedger = pgTable(
  "token_ledger",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    tokensDelta: integer().notNull().default(0),
    loanDelta: integer().notNull().default(0),
    kind: text().notNull(),
    actorId: text().references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("token_ledger_user_id_created_at_idx").on(t.userId, t.createdAt),
    index("token_ledger_created_at_idx").on(t.createdAt),
    check("token_ledger_kind", sql`${t.kind} in ('loan', 'adjustment')`),
    check(
      "token_ledger_changes_something",
      sql`${t.tokensDelta} <> 0 or ${t.loanDelta} <> 0`,
    ),
  ],
);
