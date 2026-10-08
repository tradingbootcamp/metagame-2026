import { boolean, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const userRole = pgEnum("user_role", ["attendee", "admin"]);

// Attendee-editable fields live here, apart from Better Auth's `user` table.
// `role` is the exception: only an admin tool or SQL may change it, never a
// profile form — last year a self-service update let anyone become admin.
export const profiles = pgTable("profiles", {
  userId: text()
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  preferredName: text(),
  pronouns: text(),
  discordHandle: text(),
  bio: text(),
  isPublic: boolean().notNull().default(false),
  role: userRole().notNull().default("attendee"),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});
