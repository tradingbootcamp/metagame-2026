import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { EMPTY_DOC, type NoticeDoc } from "../../lib/notice-doc";
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
// Where an RFP proposal is in the committee's pipeline; separate from status.
export const sessionPhase = pgEnum("session_phase", [
  "grading",
  "deciding",
  "notifying",
  "shepherding",
  "scheduling",
  "ready",
  "declined",
]);
export const sessionVerdict = pgEnum("session_verdict", [
  "confirmed",
  "probably",
  "needs_follow_up",
  "unconference_schedule",
  "unlikely",
  "rejected",
  "na",
]);
export const speakerTier = pgEnum("speaker_tier", [
  "free_ticket_flights_housing",
  "free_ticket_flights",
  "free_ticket",
  "no_comp",
]);
// The committee's call on tying a session into the Megagame; null is undecided.
export const megagameIntegrationLevel = pgEnum("megagame_integration_level", [
  "deep",
  "puzzle_and_rewards",
  "premade_puzzle",
  "low_context_rewards",
  "none",
]);
export const megagameInterest = pgEnum("megagame_interest", [
  "not_a_fit",
  "neutral",
  "willing",
  "excited",
  "full_proposal",
]);
export const sessionDropins = pgEnum("session_dropins", [
  "welcome",
  "full_block",
  "spectate",
  "other",
]);
export const discordStatus = pgEnum("discord_status", [
  "not_yet",
  "needs_role",
  "session_host",
  "refused",
]);
// Who a room shows up for on the schedule; "hidden" is the team's own view.
export const locationVisibility = pgEnum("location_visibility", [
  "public",
  "volunteer",
  "hidden",
]);
// The post-it palette. An enum so a note can only ever carry a colour the
// board knows how to paint.
export const unconferenceNoteColor = pgEnum("unconference_note_color", [
  "butter",
  "rose",
  "sky",
  "mint",
  "tangerine",
  "lilac",
]);

export const locations = pgTable(
  "locations",
  {
    id: uuid().primaryKey().defaultRandom(),
    name: text().notNull(),
    capacity: integer(),
    campusLocation: text(),
    description: text(),
    displayOrder: integer().notNull().default(100),
    visibility: locationVisibility().notNull().default("hidden"),
    // When the unconference bulletin board takes over this room's column;
    // null for a room that never hosts it. A null end runs it to the end of
    // the schedule. Sessions may still be placed here; the grid shows them
    // only through a session poster on the board.
    boardStartsAt: timestamp({ withTimezone: true }),
    boardEndsAt: timestamp({ withTimezone: true }),
    // Vercel Blob URLs; images never live in the database. The thumbnail is
    // what the schedule shows; image_url is a large copy for detail views.
    thumbnailUrl: text(),
    imageUrl: text(),
    // The Lighthaven Spaces row this was synced from; null for hand-made rooms.
    airtableRecordId: text().unique(),
    ...timestamps,
  },
  (t) => [
    check("locations_capacity_positive", sql`${t.capacity} > 0`),
    check(
      "locations_board_window",
      sql`${t.boardEndsAt} is null OR (${t.boardStartsAt} is not null AND ${t.boardEndsAt} > ${t.boardStartsAt})`,
    ),
    check(
      "locations_thumbnail_url_https",
      sql`${t.thumbnailUrl} like 'https://%'`,
    ),
    check("locations_image_url_https", sql`${t.imageUrl} like 'https://%'`),
  ],
);

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
    // An RSVP takes a limited spot others rely on, not just a show of interest.
    rsvpIsCommitment: boolean().notNull().default(false),
    sponsored: boolean().notNull().default(false),
    // Off until the team opens RSVPs; the public button is greyed out meanwhile.
    rsvpsOpen: boolean().notNull().default(true),
    // The accepted RFP this came from, for the Airtable sync.
    airtableRfpRecordId: text().unique(),
    // The committee member who shepherds it through review.
    shepherdUserId: text().references(() => user.id, { onDelete: "set null" }),
    phase: sessionPhase(),
    verdict: sessionVerdict(),
    speakerTier: speakerTier(),
    megagameIntegrationLevel: megagameIntegrationLevel(),
    // The host's RFP answers.
    context: text(),
    requestedDuration: text(),
    cohosts: text(),
    timingConstraints: text(),
    otherConstraints: text(),
    ageElaboration: text(),
    applicationRequired: text(),
    bespokeNeeds: text(),
    anythingElse: text(),
    megagameInterest: megagameInterest(),
    marketingConsent: boolean(),
    // Committee notes and logistics.
    discordStatus: discordStatus(),
    megagameNotes: text(),
    ticketState: text(),
    housingStatus: text(),
    communicationNotes: text(),
    rickiNotes: text(),
    ...timestamps,
  },
  (t) => [
    index("sessions_starts_at_idx").on(t.startsAt),
    index("sessions_location_id_idx").on(t.locationId),
    index("sessions_shepherd_user_id_idx").on(t.shepherdUserId),
    check("sessions_ends_after_start", sql`${t.endsAt} > ${t.startsAt}`),
    check(
      "sessions_published_timed",
      sql`${t.status} = 'draft' OR (${t.startsAt} IS NOT NULL AND ${t.endsAt} IS NOT NULL)`,
    ),
    check("sessions_max_capacity_positive", sql`${t.maxCapacity} > 0`),
    check(
      "sessions_min_within_max",
      sql`${t.minCapacity} >= 0 AND ${t.minCapacity} <= ${t.maxCapacity}`,
    ),
  ],
);

export const sessionHosts = pgTable(
  "session_hosts",
  {
    sessionId: uuid()
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    // 0 is the lead host, then co-hosts in billing order.
    position: integer().notNull(),
    // The shown name is read from the account, never stored here.
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.sessionId, t.position] }),
    unique("session_hosts_session_user_unique").on(t.sessionId, t.userId),
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

// Notices on the board room (locations.board_starts_at set), written by any
// ticket holder: a sticky note the board draws and a poster it opens into.
// x and y are fractions of the board so it reflows at any width; y is free
// placement, not a time.
export const unconferenceNotes = pgTable(
  "unconference_notes",
  {
    id: uuid().primaryKey().defaultRandom(),
    locationId: uuid()
      .notNull()
      .references(() => locations.id, { onDelete: "cascade" }),
    // The shown name is read from the account, never stored here.
    authorUserId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    // Which day's board the notice is on, as a Pacific date: each day the
    // board is up it starts fresh.
    boardDay: date({ mode: "string" }).notNull(),
    // Set on a session poster: the team's full-width notice that sits at the
    // session's own time rows and opens the session. Its documents, colour
    // and position go unused; the session supplies all of that.
    sessionId: uuid()
      .unique()
      .references(() => sessions.id, { onDelete: "cascade" }),
    // Derived from the documents on save, for the list view and search;
    // null when the notice is only drawings.
    title: text(),
    // NoticeDoc JSON (src/lib/notice-doc.ts), validated by parseNoticeDoc
    // before every write.
    sticky: jsonb().$type<NoticeDoc>().notNull().default(EMPTY_DOC),
    poster: jsonb().$type<NoticeDoc>().notNull().default(EMPTY_DOC),
    color: unconferenceNoteColor().notNull(),
    x: real().notNull().default(0),
    y: real().notNull().default(0),
    ...timestamps,
  },
  (t) => [
    index("unconference_notes_location_id_idx").on(t.locationId, t.boardDay),
    index("unconference_notes_author_user_id_idx").on(t.authorUserId),
    check(
      "unconference_notes_title_length",
      sql`${t.title} is null OR char_length(${t.title}) <= 120`,
    ),
    check("unconference_notes_x_fraction", sql`${t.x} >= 0 AND ${t.x} <= 1`),
    check("unconference_notes_y_fraction", sql`${t.y} >= 0 AND ${t.y} <= 1`),
  ],
);

// Emoji reactions on a notice, one row per person per emoji.
export const unconferenceNoteReactions = pgTable(
  "unconference_note_reactions",
  {
    noteId: uuid()
      .notNull()
      .references(() => unconferenceNotes.id, { onDelete: "cascade" }),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    emoji: text().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.noteId, t.userId, t.emoji] }),
    index("unconference_note_reactions_user_id_idx").on(t.userId),
    // Mirrors EMOJI_MAX in src/lib/unconference.ts.
    check(
      "unconference_note_reactions_emoji_length",
      sql`char_length(${t.emoji}) > 0 AND char_length(${t.emoji}) <= 32`,
    ),
  ],
);
