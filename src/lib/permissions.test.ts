import { describe, expect, it } from "vitest";
import {
  describeSource,
  effectivePermissions,
  expand,
  explainPermissions,
  hasTeamPermission,
  overrideConflict,
  permissionGroups,
  PERMISSION_KEYS,
  PERMISSIONS,
  withImpliers,
  type AccessInput,
} from "./permissions";

const input = (over: Partial<AccessInput>): AccessInput => ({
  admin: false,
  roles: [],
  grants: [],
  denies: [],
  ...over,
});

const volunteer = { name: "Volunteer", permissions: ["schedule.manage"] };

describe("catalog", () => {
  it("implies only known permissions, and never itself", () => {
    for (const key of PERMISSION_KEYS) {
      const implies = (PERMISSIONS[key] as { implies?: readonly string[] })
        .implies;
      for (const q of implies ?? []) {
        expect(PERMISSION_KEYS, `${key} implies ${q}`).toContain(q);
        expect(q).not.toBe(key);
      }
    }
  });
});

describe("profiles.view", () => {
  it("is attendee audience, so a volunteer holding it gets no backstage", () => {
    expect(PERMISSIONS["profiles.view"].audience).toBe("attendee");
    expect(hasTeamPermission(expand(["profiles.view"]))).toBe(false);
    expect(hasTeamPermission(expand(["schedule.rsvps", "profiles.view"]))).toBe(
      false,
    );
  });

  it("comes with users.view, which already shows strictly more", () => {
    expect(expand(["users.view"]).has("profiles.view")).toBe(true);
  });
});

describe("unconference.post", () => {
  // Attendee audience is load-bearing: team audience would open all of
  // /backstage to every ticket holder, since the Attendee role carries this.
  it("is attendee audience, so a ticket holder gets no backstage", () => {
    expect(PERMISSIONS["unconference.post"].audience).toBe("attendee");
    expect(hasTeamPermission(expand(["unconference.post"]))).toBe(false);
    expect(
      hasTeamPermission(expand(["schedule.rsvps", "unconference.post"])),
    ).toBe(false);
    expect(
      hasTeamPermission(
        effectivePermissions(
          input({
            roles: [
              {
                name: "Attendee",
                permissions: ["schedule.rsvps", "unconference.post"],
                auto: "has a ticket",
              },
            ],
          }),
        ),
      ),
    ).toBe(false);
  });

  it("implies nothing, so it can't drag a team permission along", () => {
    expect([...expand(["unconference.post"])]).toEqual(["unconference.post"]);
  });

  it("keeps session notes off the backstage index", () => {
    expect(PERMISSIONS["schedule.session_notes"].audience).toBe("attendee");
    expect(
      hasTeamPermission(
        expand(["schedule.session_notes", "schedule.volunteer_rooms"]),
      ),
    ).toBe(false);
  });
});

describe("expand", () => {
  it("closes over implications and drops unknown keys", () => {
    expect([...expand(["schedule.manage", "gone.away"])]).toEqual([
      "schedule.manage",
      "schedule.view",
      "schedule.preview",
      "schedule.volunteer_rooms",
      "schedule.session_notes",
    ]);
    expect(expand([]).size).toBe(0);
  });
});

describe("effectivePermissions", () => {
  it("unions roles and grants", () => {
    const got = effectivePermissions(
      input({
        roles: [volunteer, { name: "Door", permissions: ["tickets.view"] }],
        grants: ["promo.manage"],
      }),
    );
    expect([...got].sort()).toEqual([
      "promo.create",
      "promo.manage",
      "promo.view",
      "schedule.manage",
      "schedule.preview",
      "schedule.session_notes",
      "schedule.view",
      "schedule.volunteer_rooms",
      "tickets.view",
    ]);
  });

  it("expands a grant's implications", () => {
    const got = effectivePermissions(input({ grants: ["schedule.manage"] }));
    expect([...got].sort()).toEqual([
      "schedule.manage",
      "schedule.preview",
      "schedule.session_notes",
      "schedule.view",
      "schedule.volunteer_rooms",
    ]);
  });

  it("gives admins everything", () => {
    const got = effectivePermissions(input({ admin: true }));
    expect(got.size).toBe(PERMISSION_KEYS.length);
  });

  it("ignores a permission no longer in the catalog", () => {
    const got = effectivePermissions(
      input({ roles: [{ name: "Old", permissions: ["tickets.manage"] }] }),
    );
    expect(got.size).toBe(0);
  });
});

describe("denies", () => {
  it("collects a key and everything that implies it, transitively", () => {
    expect([...withImpliers(["schedule.view"])].sort()).toEqual([
      "schedule.manage",
      "schedule.rooms",
      "schedule.view",
    ]);
    expect([...withImpliers(["gone.away"])]).toEqual([]);
  });

  it("strips the denied key and its impliers but leaves what they imply", () => {
    const got = effectivePermissions(
      input({
        roles: [{ name: "Ops", permissions: ["schedule.rooms"] }],
        denies: ["schedule.view"],
      }),
    );
    expect([...got].sort()).toEqual([
      "schedule.preview",
      "schedule.session_notes",
      "schedule.volunteer_rooms",
    ]);
  });

  it("beats a personal grant", () => {
    const got = effectivePermissions(
      input({ grants: ["promo.manage"], denies: ["promo.view"] }),
    );
    expect(got.size).toBe(0);
  });

  it("doesn't apply to admins", () => {
    const got = effectivePermissions(
      input({ admin: true, denies: ["users.view"] }),
    );
    expect(got.size).toBe(PERMISSION_KEYS.length);
  });
});

describe("overrideConflict", () => {
  it("refuses a deny under a personal grant that includes it", () => {
    const got = overrideConflict(
      input({ grants: ["promo.manage"] }),
      "promo.view",
      "deny",
    );
    expect(got).toMatch(/Manage promo codes is granted/);
    expect(
      overrideConflict(
        input({ grants: ["promo.view"] }),
        "promo.manage",
        "deny",
      ),
    ).toBeNull();
  });

  it("refuses a grant whose expansion is personally denied", () => {
    expect(
      overrideConflict(
        input({ denies: ["promo.view"] }),
        "promo.manage",
        "allow",
      ),
    ).toMatch(/which is denied/);
    expect(
      overrideConflict(
        input({ denies: ["promo.manage"] }),
        "promo.view",
        "allow",
      ),
    ).toBeNull();
  });

  it("lets a permission's own row flip between allow and deny", () => {
    expect(
      overrideConflict(input({ grants: ["promo.view"] }), "promo.view", "deny"),
    ).toBeNull();
    expect(
      overrideConflict(
        input({ denies: ["promo.view"] }),
        "promo.view",
        "allow",
      ),
    ).toBeNull();
  });
});

describe("explainPermissions", () => {
  it("names the deciding source first", () => {
    const got = explainPermissions(
      input({
        roles: [volunteer],
        grants: ["schedule.manage"],
      }),
    );
    expect(got["schedule.manage"]).toEqual({
      effective: true,
      sources: [{ kind: "grant" }, { kind: "role", role: "Volunteer" }],
    });
    expect(got["schedule.preview"]).toEqual({
      effective: true,
      sources: [
        { kind: "implied", by: "schedule.view" },
        { kind: "implied", by: "schedule.manage" },
      ],
    });
    expect(got["users.view"]).toEqual({ effective: false, sources: [] });
  });

  it("puts a deny ahead of the roles that would grant it", () => {
    const got = explainPermissions(
      input({
        roles: [{ name: "Ops", permissions: ["schedule.manage"] }],
        denies: ["schedule.view"],
      }),
    );
    expect(got["schedule.view"]).toEqual({
      effective: false,
      sources: [{ kind: "denied" }],
    });
    expect(got["schedule.manage"]).toEqual({
      effective: false,
      sources: [
        { kind: "denied_via", by: "schedule.view" },
        { kind: "role", role: "Ops" },
      ],
    });
    expect(got["schedule.preview"]).toEqual({ effective: true, sources: [] });
    expect(describeSource(got["schedule.manage"].sources[0])).toBe(
      "Denied (includes Schedule: View schedule data)",
    );
  });

  it("shows the admin bypass ahead of everything", () => {
    const got = explainPermissions(input({ admin: true, roles: [volunteer] }));
    expect(got["schedule.manage"].sources[0]).toEqual({ kind: "admin" });
    expect(got["schedule.manage"].effective).toBe(true);
  });
});

describe("catalog order", () => {
  it("keeps each area together, running view, edit, delete", () => {
    const rank = { view: 0, edit: 1, delete: 2 } as const;
    const groups = permissionGroups();
    expect(new Set(groups.map((g) => g.group)).size).toBe(groups.length);
    for (const { keys } of groups) {
      const levels = keys.map((k) => rank[PERMISSIONS[k].level]);
      expect(levels).toEqual([...levels].sort((a, b) => a - b));
    }
  });
});

describe("megagame", () => {
  it("has manage imply verify, and not the other way round", () => {
    expect(expand(["megagame.manage"]).has("megagame.verify")).toBe(true);
    expect(expand(["megagame.verify"]).has("megagame.manage")).toBe(false);
  });

  it("opens backstage for a volunteer holding only verify", () => {
    expect(hasTeamPermission(expand(["megagame.verify"]))).toBe(true);
  });

  it("is one group with the two keys in order", () => {
    expect(
      permissionGroups().find((g) => g.group === "Megagame")?.keys,
    ).toEqual(["megagame.verify", "megagame.manage"]);
  });
});
