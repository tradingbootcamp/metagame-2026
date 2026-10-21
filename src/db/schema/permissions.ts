import {
  index,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { timestamps, user } from "./auth";

// Who may use which team tool. The permission keys are the catalog in
// src/lib/permissions.ts, stored as text so adding one needs no migration;
// a key dropped from the catalog is ignored when read. `user.role = 'admin'`
// stays the superuser bypass and is set only by SQL, never from here.

export const roles = pgTable("roles", {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull().unique(),
  ...timestamps,
});

export const rolePermissions = pgTable(
  "role_permissions",
  {
    roleId: uuid()
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    permission: text().notNull(),
  },
  (t) => [primaryKey({ columns: [t.roleId, t.permission] })],
);

export const userRoles = pgTable(
  "user_roles",
  {
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    roleId: uuid()
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.roleId] }),
    index("user_roles_role_id_idx").on(t.roleId),
  ],
);

// Permissions an account holds on top of its roles. Grants only: there is no
// deny, so removing access means removing the role or the grant.
export const userPermissionGrants = pgTable(
  "user_permission_grants",
  {
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    permission: text().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.permission] })],
);
