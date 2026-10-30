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
      "apikey",
      "bookmarks",
      "budget_ignored_lines",
      "budget_import_runs",
      "locations",
      "profiles",
      "role_permissions",
      "roles",
      "rsvps",
      "session",
      "session_grade_space_options",
      "session_grades",
      "session_hosts",
      "sessions",
      "team_areas",
      "team_people",
      "team_role_people",
      "team_roles",
      "team_tasks",
      "tickets",
      "user",
      "user_permission_grants",
      "user_roles",
      "verification",
      "xero_connections",
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
    ).toEqual([
      "account",
      "apikey",
      "bookmarks",
      "profiles",
      "rsvps",
      "session",
      "session_grades",
      "session_hosts",
      "sessions",
      "team_people",
      "tickets",
      "tickets",
      "user_permission_grants",
      "user_roles",
    ]);
    expect(column("tickets", "owner_user_id").references?.onDelete).toBe(
      "set null",
    );
    expect(column("tickets", "holder_user_id").references?.onDelete).toBe(
      "set null",
    );
    expect(column("sessions", "shepherd_user_id").references?.onDelete).toBe(
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
      "session_category",
      "session_ages",
      "session_status",
      "rsvp_status",
      "session_phase",
      "session_verdict",
      "speaker_tier",
      "megagame_integration_level",
      "megagame_interest",
      "session_dropins",
      "discord_status",
      "location_visibility",
      "rubric_grade",
      "shepherd_match",
      "topic_area",
      "potential_panel",
    ]);
  });

  it("keeps one grade per grader and links grades to rooms", () => {
    expect(column("session_grades", "session_id").references).toEqual({
      table: "sessions",
      column: "id",
      onDelete: "cascade",
    });
    expect(column("session_grades", "submitted_at").nullable).toBe(true);
    expect(column("session_grades", "topic_areas").type).toBe("topic_area[]");
    expect(
      column("session_grade_space_options", "location_id").references?.table,
    ).toBe("locations");
    expect(column("sessions", "phase").nullable).toBe(true);
    expect(column("sessions", "verdict").nullable).toBe(true);
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
      "Access",
      "Attendees",
      "Tickets",
      "Schedule",
      "Grading",
      "Budget",
      "Team",
    ]);
    expect(info.groups.flatMap((g) => g.tables.map((t) => t.name))).toEqual([
      "user",
      "session",
      "account",
      "verification",
      "apikey",
      "roles",
      "role_permissions",
      "user_roles",
      "user_permission_grants",
      "profiles",
      "tickets",
      "locations",
      "sessions",
      "session_hosts",
      "rsvps",
      "bookmarks",
      "session_grades",
      "session_grade_space_options",
      "xero_connections",
      "budget_import_runs",
      "budget_ignored_lines",
      "team_areas",
      "team_people",
      "team_roles",
      "team_role_people",
      "team_tasks",
    ]);
  });
});
