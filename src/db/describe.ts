import { is, SQL, StringChunk } from "drizzle-orm";
import { toSnakeCase } from "drizzle-orm/casing";
import {
  getTableConfig,
  isPgEnum,
  PgTable,
  type PgColumn,
} from "drizzle-orm/pg-core";
import * as schema from "./schema";

// Plain-data description of the Drizzle schema, derived from the same table
// objects the app queries with, so /admin/schema can never drift from the code.

export type ColumnInfo = {
  name: string;
  type: string;
  nullable: boolean;
  primary: boolean;
  unique: boolean;
  default: string | null;
  enumValues: string[] | null;
  references: { table: string; column: string; onDelete: string } | null;
};

export type IndexInfo = { name: string; columns: string[]; unique: boolean };

export type TableInfo = {
  name: string;
  group: string;
  note: string;
  columns: ColumnInfo[];
  indexes: IndexInfo[];
  referencedBy: { table: string; column: string }[];
};

export type EnumInfo = { name: string; values: string[] };

export type SchemaInfo = {
  groups: { name: string; tables: TableInfo[] }[];
  tables: TableInfo[];
  enums: EnumInfo[];
};

// Which area each table belongs to, in display order. A table missing here
// lands in "Other" so it still shows up (and the test flags it).
const TABLE_GROUPS: Record<string, string[]> = {
  "Auth (managed by Better Auth)": [
    "user",
    "session",
    "account",
    "verification",
  ],
  Attendees: ["profiles"],
  Tickets: ["tickets"],
  Schedule: ["locations", "sessions", "session_hosts", "rsvps", "bookmarks"],
};

// What each table is for, in one line. Reviewed alongside the columns.
const TABLE_NOTES: Record<string, string> = {
  user: "One row per account. Owned by Better Auth; email is the login identifier and is unique. role (user | admin) and the ban fields come from the admin plugin and can't be changed through the normal account-update path; admin is the break-glass superuser until the permission system exists.",
  session:
    "Signed-in browser sessions. Deleting a user removes their sessions (cascade).",
  account:
    "How a user can sign in: one row per method. The credential provider's row holds the password hash; OAuth providers would hold tokens.",
  verification:
    "Short-lived email codes and similar one-time secrets, keyed by identifier (the email).",
  profiles:
    "Attendee-editable profile fields, kept apart from user so nothing security-relevant sits next to a form field.",
  tickets:
    "One row per purchase, keyed by the payment id the webhooks upsert on. Airtable keeps the finance detail; this holds what admission needs. owner_user_id is set only by claiming the ticket code, never by email match.",
  locations:
    "Rooms and spaces sessions happen in. display_order and show_in_schedule drive the schedule columns.",
  sessions:
    "One row per schedule slot. Drafts can be unplaced (null times, no location); only published rows show. airtable_rfp_record_id ties a session to the accepted RFP it was synced from.",
  session_hosts:
    "Who runs a session, one row per host, replacing 2025's host_1/2/3 columns. user_id links the host's account when they have one; display_name is what the schedule shows regardless.",
  rsvps:
    "Going or waitlisted, one row per user per session. The capacity check that decides which must be a single INSERT … SELECT against the going count, never a read then an insert (2025's race, META-412).",
  bookmarks: "Sessions a user starred. One row per pair.",
};

function columnName(column: PgColumn): string {
  // Matches the snake_case casing set in drizzle.config.ts and src/db/index.ts.
  return column.keyAsName ? toSnakeCase(column.name) : column.name;
}

function renderDefault(column: PgColumn): string | null {
  if (!column.hasDefault) return null;
  const value: unknown = column.default;
  if (value === undefined) return "(generated)";
  if (is(value, SQL)) {
    return value.queryChunks
      .map((chunk) => (is(chunk, StringChunk) ? chunk.value.join("") : "?"))
      .join("");
  }
  if (typeof value === "string") return `'${value}'`;
  return String(value);
}

function indexColumnName(column: unknown): string {
  if (column && typeof column === "object" && "name" in column) {
    const { name, keyAsName } = column as { name: string; keyAsName?: boolean };
    return keyAsName ? toSnakeCase(name) : name;
  }
  return "(expression)";
}

export function describeSchema(): SchemaInfo {
  // Widen first: the module's exact export types defeat the type guards.
  const exports: unknown[] = Object.values(schema);
  const tables = exports.filter((v): v is PgTable => is(v, PgTable));
  const enums: EnumInfo[] = exports
    .filter(isPgEnum)
    .map((e) => ({ name: e.enumName, values: [...e.enumValues] }));

  const configs = tables.map((t) => getTableConfig(t));
  const nameOf = new Map(tables.map((t, i) => [t, configs[i].name]));

  const referencedBy = new Map<string, { table: string; column: string }[]>();
  const info: TableInfo[] = configs.map((cfg) => {
    const fkByColumn = new Map<string, ColumnInfo["references"]>();
    for (const fk of cfg.foreignKeys) {
      const ref = fk.reference();
      const target = nameOf.get(ref.foreignTable) ?? "?";
      ref.columns.forEach((col, i) => {
        const targetColumn = columnName(ref.foreignColumns[i]);
        fkByColumn.set(columnName(col), {
          table: target,
          column: targetColumn,
          onDelete: fk.onDelete ?? "no action",
        });
        const list = referencedBy.get(target) ?? [];
        list.push({ table: cfg.name, column: columnName(col) });
        referencedBy.set(target, list);
      });
    }

    return {
      name: cfg.name,
      group:
        Object.keys(TABLE_GROUPS).find((g) =>
          TABLE_GROUPS[g].includes(cfg.name),
        ) ?? "Other",
      note: TABLE_NOTES[cfg.name] ?? "",
      columns: cfg.columns.map((col) => {
        const name = columnName(col);
        return {
          name,
          type: col.getSQLType(),
          nullable: !col.notNull,
          primary: col.primary,
          unique: col.isUnique,
          default: renderDefault(col),
          enumValues: col.enumValues ? [...col.enumValues] : null,
          references: fkByColumn.get(name) ?? null,
        };
      }),
      indexes: cfg.indexes.map((idx) => ({
        name: idx.config.name ?? "(unnamed)",
        columns: idx.config.columns.map(indexColumnName),
        unique: idx.config.unique,
      })),
      referencedBy: [],
    };
  });

  for (const table of info) {
    table.referencedBy = referencedBy.get(table.name) ?? [];
  }

  const groups = [...Object.keys(TABLE_GROUPS), "Other"]
    .map((name) => ({
      name,
      tables:
        name === "Other"
          ? info.filter((t) => t.group === "Other")
          : TABLE_GROUPS[name].flatMap((t) => info.filter((i) => i.name === t)),
    }))
    .filter((g) => g.tables.length > 0);

  return { groups, tables: info, enums };
}
