import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { timestamps } from "./auth";

// The budget tool at /backstage/budget. The budget itself stays in the Google
// Sheet; Postgres only holds what the sheet can't: the Xero OAuth tokens (the
// refresh token rotates on every use, so it needs a writable home), the import
// runs, and Xero lines the team chose not to import.

export const xeroConnections = pgTable("xero_connections", {
  // One row, id "metagame".
  id: text().primaryKey(),
  tenantId: text().notNull(),
  tenantName: text(),
  accessToken: text().notNull(),
  refreshToken: text().notNull(),
  accessExpiresAt: timestamp({ withTimezone: true }).notNull(),
  // Set by whoever is refreshing; a single-use refresh token can't be
  // exchanged twice, so concurrent callers wait on this instead.
  refreshLockedAt: timestamp({ withTimezone: true }),
  connectedBy: text(),
  ...timestamps,
});

// One row per Claude call from the tool: "import" runs and "request"s from
// the Ask Claude box. Token counts come from the API response.
export const budgetImportRuns = pgTable("budget_import_runs", {
  id: uuid().primaryKey().defaultRandom(),
  kind: text().notNull().default("import"),
  status: text().notNull(),
  triggeredBy: text(),
  since: text().notNull(),
  pulled: integer().notNull().default(0),
  proposed: integer().notNull().default(0),
  skipped: integer().notNull().default(0),
  summary: text(),
  error: text(),
  model: text(),
  inputTokens: integer().notNull().default(0),
  outputTokens: integer().notNull().default(0),
  startedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp({ withTimezone: true }),
});

export const budgetIgnoredLines = pgTable("budget_ignored_lines", {
  xeroId: text().primaryKey(),
  reason: text(),
  ignoredBy: text(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});
