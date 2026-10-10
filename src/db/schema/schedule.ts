import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { timestamps, user } from "./auth";

export const sessionCategory = pgEnum("session_category", [
  "talk",
  "workshop",
  "game",
  "other",
]);
export const sessionAges = pgEnum("session_ages", ["all", "kids", "adults"]);
export const sessionStatus = pgEnum("session_status", ["draft", "published"]);
export const rsvpStatus = pgEnum("rsvp_status", ["going", "waitlist"]);

export const locations = pgTable("locations", {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),
  capacity: integer(),
  campusLocation: text(),
  displayOrder: integer().notNull().default(100),
  showInSchedule: boolean().notNull().default(false),
  ...timestamps,
});

export const sessions = pgTable(
  "sessions",
  {
    id: uuid().primaryKey().defaultRandom(),
    slug: text().notNull().unique(),
    title: text().notNull(),
    description: text(),
    category: sessionCategory(),
    // Nullable while a draft is still being placed.
    startsAt: timestamp({ withTimezone: true }),
    endsAt: timestamp({ withTimezone: true }),
    locationId: uuid().references(() => locations.id, { onDelete: "set null" }),
    maxCapacity: integer(),
    minCapacity: integer(),
    ages: sessionAges(),
    needs: text(),
    status: sessionStatus().notNull().default("draft"),
    // The accepted RFP this came from, for the Airtable sync.
    airtableRfpRecordId: text().unique(),
    ...timestamps,
  },
  (t) => [index("sessions_starts_at_idx").on(t.startsAt)],
);

export const sessionHosts = pgTable(
  "session_hosts",
  {
    sessionId: uuid()
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    // Linked once the host has an account; the name shows either way.
    userId: text().references(() => user.id, { onDelete: "set null" }),
    displayName: text().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.sessionId, t.displayName] }),
    index("session_hosts_user_id_idx").on(t.userId),
  ],
);

export const rsvps = pgTable(
  "rsvps",
  {
    sessionId: uuid()
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    status: rsvpStatus().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.sessionId, t.userId] }),
    index("rsvps_user_id_idx").on(t.userId),
  ],
);

export const bookmarks = pgTable(
  "bookmarks",
  {
    sessionId: uuid()
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.sessionId, t.userId] }),
    index("bookmarks_user_id_idx").on(t.userId),
  ],
);
