import { boolean, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth";

// Attendee-editable profile fields, kept apart from Better Auth's `user` table
// so nothing security-relevant (role, ban state) sits next to a form field.
export const profiles = pgTable("profiles", {
  userId: text()
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  preferredName: text(),
  pronouns: text(),
  discordHandle: text(),
  bio: text(),
  isPublic: boolean().notNull().default(false),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});
