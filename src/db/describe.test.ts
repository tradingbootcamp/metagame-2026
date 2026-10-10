import { describe, expect, it } from "vitest";
import { describeSchema } from "./describe";

const info = describeSchema();
const table = (name: string) => {
  const t = info.tables.find((t) => t.name === name);
  if (!t) throw new Error(`no table ${name}`);
  return t;
};
const column = (tableName: string, name: string) => {
  const c = table(tableName).columns.find((c) => c.name === name);
  if (!c) throw new Error(`no column ${tableName}.${name}`);
  return c;
};

describe("describeSchema", () => {
  it("lists every table once", () => {
    expect(info.tables.map((t) => t.name).sort()).toEqual([
      "account",
      "profiles",
      "session",
      "tickets",
      "user",
      "verification",
    ]);
  });

  it("reports column names in snake_case, matching the migration", () => {
    expect(column("user", "email_verified").type).toBe("boolean");
    expect(column("account", "access_token_expires_at").type).toBe(
      "timestamp with time zone",
    );
  });

  it("follows foreign keys to the user table with cascade deletes", () => {
    expect(column("session", "user_id").references).toEqual({
      table: "user",
      column: "id",
      onDelete: "cascade",
    });
    expect(
      table("user")
        .referencedBy.map((r) => r.table)
        .sort(),
    ).toEqual(["account", "profiles", "session", "tickets"]);
    expect(column("tickets", "owner_user_id").references?.onDelete).toBe(
      "set null",
    );
  });

  it("exposes defaults, including the admin-plugin role", () => {
    const role = column("user", "role");
    expect(role.type).toBe("text");
    expect(role.nullable).toBe(false);
    expect(role.default).toBe("'user'");
    expect(column("user", "banned").default).toBe("false");
    expect(column("user", "created_at").default).toBe("now()");
    expect(column("session", "impersonated_by").nullable).toBe(true);
    expect(table("profiles").columns.map((c) => c.name)).not.toContain("role");
    expect(info.enums.map((e) => e.name)).toEqual([
      "ticket_source",
      "ticket_status",
    ]);
  });

  it("marks keys and uniqueness", () => {
    expect(column("user", "id").primary).toBe(true);
    expect(column("user", "email").unique).toBe(true);
    expect(column("session", "token").unique).toBe(true);
    expect(table("session").indexes).toEqual([
      { name: "session_user_id_idx", columns: ["user_id"], unique: false },
    ]);
  });

  it("has a note and a group for every table", () => {
    for (const t of info.tables) {
      expect(t.note, t.name).not.toBe("");
      expect(t.group, t.name).not.toBe("Other");
    }
  });

  it("groups tables in display order without losing any", () => {
    expect(info.groups.map((g) => g.name)).toEqual([
      "Auth (managed by Better Auth)",
      "Attendees",
      "Tickets",
    ]);
    expect(info.groups.flatMap((g) => g.tables.map((t) => t.name))).toEqual([
      "user",
      "session",
      "account",
      "verification",
      "profiles",
      "tickets",
    ]);
  });
});
