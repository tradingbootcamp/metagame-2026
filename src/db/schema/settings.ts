import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth";

// Site-wide switches flipped from /backstage at runtime. A missing row or a
// null value means "not set", so each key's reader supplies its own default.
export const siteSettings = pgTable("site_settings", {
  key: text().primaryKey(),
  value: jsonb(),
  updatedBy: text().references(() => user.id, { onDelete: "set null" }),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});
