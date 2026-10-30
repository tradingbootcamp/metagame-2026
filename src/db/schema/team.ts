import {
  date,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { timestamps, user } from "./auth";

// The team board (/backstage/team): everyone working on Metagame, volunteers
// included, the roles someone has to hold and the tasks with an owner. Names
// and assignments live only here, never in the repo; the All Hands doc's
// list of roles to fill is pasted in through the tool.

export const teamAreas = pgTable("team_areas", {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull().unique(),
  position: integer().notNull().default(0),
  ...timestamps,
});

export const teamPeople = pgTable("team_people", {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull().unique(),
  /** "staff" or "volunteer". */
  kind: text().notNull().default("volunteer"),
  /** Their home team; the roles they hold can sit in others. */
  areaId: uuid().references(() => teamAreas.id, { onDelete: "set null" }),
  userId: text()
    .unique()
    .references(() => user.id, { onDelete: "set null" }),
  /** An email or Discord handle, for whoever needs to reach them. */
  contact: text(),
  note: text(),
  ...timestamps,
});

export const teamRoles = pgTable("team_roles", {
  id: uuid().primaryKey().defaultRandom(),
  title: text().notNull().unique(),
  areaId: uuid().references(() => teamAreas.id, { onDelete: "set null" }),
  /** Answers for the role while nobody holds it, usually the team lead. */
  leadId: uuid().references(() => teamPeople.id, { onDelete: "set null" }),
  description: text(),
  skills: text(),
  /** How many people it needs; 0 takes as many as want to help. */
  needed: integer().notNull().default(1),
  /** The due dates as written, e.g. "Plan: Mon Nov 2 · Setup: Fri Nov 6". */
  due: text(),
  /** The next deadline, for sorting and for flagging overdue roles. */
  dueOn: date({ mode: "string" }),
  /** "active", "done" or "dropped". Open and filled come from who holds it. */
  status: text().notNull().default("active"),
  ...timestamps,
});

export const teamRolePeople = pgTable(
  "team_role_people",
  {
    roleId: uuid()
      .notNull()
      .references(() => teamRoles.id, { onDelete: "cascade" }),
    personId: uuid()
      .notNull()
      .references(() => teamPeople.id, { onDelete: "cascade" }),
    /** "assigned" holds the role; "interested" has offered to. */
    stake: text().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.roleId, t.personId] }),
    index("team_role_people_person_id_idx").on(t.personId),
  ],
);

export const teamTasks = pgTable(
  "team_tasks",
  {
    id: uuid().primaryKey().defaultRandom(),
    title: text().notNull(),
    areaId: uuid().references(() => teamAreas.id, { onDelete: "set null" }),
    roleId: uuid().references(() => teamRoles.id, { onDelete: "set null" }),
    ownerId: uuid().references(() => teamPeople.id, { onDelete: "set null" }),
    /** "todo", "doing", "done" or "dropped". */
    status: text().notNull().default("todo"),
    dueOn: date({ mode: "string" }),
    ...timestamps,
  },
  (t) => [index("team_tasks_owner_id_idx").on(t.ownerId)],
);
