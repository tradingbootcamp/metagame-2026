import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  smallint,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

// Better Auth's core tables. Shapes follow what `@better-auth/cli generate`
// emits for the Drizzle adapter; the adapter looks tables up by these model
// names, so don't rename them. Column names come from drizzle's snake_case
// casing (see drizzle.config.ts and src/db/index.ts).

export const timestamps = {
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

export const user = pgTable(
  "user",
  {
    id: text().primaryKey(),
    name: text().notNull(),
    email: text().notNull().unique(),
    emailVerified: boolean().notNull().default(false),
    image: text(),
    // Better Auth admin plugin. `role` is "user" or "admin" for now; the plugin
    // refuses to let users change it themselves. Admin is the break-glass
    // superuser that gates every team tool until the permission system lands.
    role: text().notNull().default("user"),
    banned: boolean().notNull().default(false),
    banReason: text(),
    banExpires: timestamp({ withTimezone: true }),
    // Megagame class levels, 0–5. Ours, not Better Auth's: it doesn't know these
    // columns, so its update-user endpoint can't set them.
    wizardLevel: smallint().notNull().default(0),
    pirateLevel: smallint().notNull().default(0),
    alienLevel: smallint().notNull().default(0),
    ...timestamps,
  },
  (t) => [
    check("user_wizard_level_range", sql`${t.wizardLevel} between 0 and 5`),
    check("user_pirate_level_range", sql`${t.pirateLevel} between 0 and 5`),
    check("user_alien_level_range", sql`${t.alienLevel} between 0 and 5`),
  ],
);

export const session = pgTable(
  "session",
  {
    id: text().primaryKey(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    token: text().notNull().unique(),
    ipAddress: text(),
    userAgent: text(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    // Set when an admin is viewing the site as this user (admin plugin).
    impersonatedBy: text(),
    ...timestamps,
  },
  (t) => [index("session_user_id_idx").on(t.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text().primaryKey(),
    accountId: text().notNull(),
    providerId: text().notNull(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text(),
    refreshToken: text(),
    idToken: text(),
    accessTokenExpiresAt: timestamp({ withTimezone: true }),
    refreshTokenExpiresAt: timestamp({ withTimezone: true }),
    scope: text(),
    // Hashed; only set for the "credential" provider.
    password: text(),
    ...timestamps,
  },
  (t) => [index("account_user_id_idx").on(t.userId)],
);

// Better Auth API key plugin (@better-auth/api-key). A request carrying a key
// in `x-api-key` acts as the owning user. Only the hash is stored.
export const apikey = pgTable(
  "apikey",
  {
    id: text().primaryKey(),
    name: text(),
    // First characters of the key, so the UI can tell keys apart.
    start: text(),
    prefix: text(),
    key: text().notNull(),
    // The plugin can scope keys to organizations too, hence the generic name;
    // here it's always a user id.
    referenceId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    configId: text().notNull().default("default"),
    refillInterval: integer(),
    refillAmount: integer(),
    lastRefillAt: timestamp({ withTimezone: true }),
    enabled: boolean().notNull().default(true),
    rateLimitEnabled: boolean().notNull().default(true),
    rateLimitTimeWindow: integer(),
    rateLimitMax: integer(),
    requestCount: integer().notNull().default(0),
    remaining: integer(),
    lastRequest: timestamp({ withTimezone: true }),
    expiresAt: timestamp({ withTimezone: true }),
    permissions: text(),
    metadata: text(),
    ...timestamps,
  },
  (t) => [
    index("apikey_key_idx").on(t.key),
    index("apikey_reference_id_idx").on(t.referenceId),
  ],
);

export const verification = pgTable(
  "verification",
  {
    id: text().primaryKey(),
    identifier: text().notNull(),
    value: text().notNull(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    ...timestamps,
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)],
);
