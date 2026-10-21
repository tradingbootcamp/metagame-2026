import { describe, expect, it } from "vitest";
import {
  ADMIN_PASSWORD_PERMISSIONS,
  effectivePermissions,
  expand,
  explainPermissions,
  PERMISSION_KEYS,
  PERMISSIONS,
  type AccessInput,
} from "./permissions";

const input = (over: Partial<AccessInput>): AccessInput => ({
  admin: false,
  roles: [],
  overrides: [],
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
    for (const key of ADMIN_PASSWORD_PERMISSIONS)
      expect(PERMISSION_KEYS).toContain(key);
  });
});

describe("expand", () => {
  it("closes over implications and drops unknown keys", () => {
    expect([...expand(["schedule.manage", "gone.away"])]).toEqual([
      "schedule.manage",
      "schedule.preview",
    ]);
    expect(expand([]).size).toBe(0);
  });
});

describe("effectivePermissions", () => {
  it("unions roles and grants", () => {
    const got = effectivePermissions(
      input({
        roles: [volunteer, { name: "Door", permissions: ["tickets.view"] }],
        overrides: [{ permission: "promo.manage", effect: "grant" }],
      }),
    );
    expect([...got].sort()).toEqual([
      "promo.manage",
      "schedule.manage",
      "schedule.preview",
      "tickets.view",
    ]);
  });

  it("lets a deny beat a role, and an implied permission", () => {
    const denied = effectivePermissions(
      input({
        roles: [volunteer],
        overrides: [{ permission: "schedule.manage", effect: "deny" }],
      }),
    );
    expect(denied.has("schedule.manage")).toBe(false);
    expect(denied.has("schedule.preview")).toBe(true);

    const previewDenied = effectivePermissions(
      input({
        roles: [volunteer],
        overrides: [{ permission: "schedule.preview", effect: "deny" }],
      }),
    );
    expect(previewDenied.has("schedule.manage")).toBe(true);
    expect(previewDenied.has("schedule.preview")).toBe(false);
  });

  it("gives admins everything, denies included", () => {
    const got = effectivePermissions(
      input({
        admin: true,
        overrides: [{ permission: "users.manage", effect: "deny" }],
      }),
    );
    expect(got.size).toBe(PERMISSION_KEYS.length);
  });

  it("ignores a permission no longer in the catalog", () => {
    const got = effectivePermissions(
      input({ roles: [{ name: "Old", permissions: ["tickets.manage"] }] }),
    );
    expect(got.size).toBe(0);
  });
});

describe("explainPermissions", () => {
  it("names the deciding source first", () => {
    const got = explainPermissions(
      input({
        roles: [volunteer],
        overrides: [{ permission: "schedule.preview", effect: "deny" }],
      }),
    );
    expect(got["schedule.manage"]).toEqual({
      effective: true,
      sources: [{ kind: "role", role: "Volunteer" }],
    });
    expect(got["schedule.preview"]).toEqual({
      effective: false,
      sources: [{ kind: "deny" }, { kind: "implied", by: "schedule.manage" }],
    });
    expect(got["users.manage"]).toEqual({ effective: false, sources: [] });
  });

  it("shows the admin bypass ahead of everything", () => {
    const got = explainPermissions(input({ admin: true, roles: [volunteer] }));
    expect(got["schedule.manage"].sources[0]).toEqual({ kind: "admin" });
    expect(got["schedule.manage"].effective).toBe(true);
  });
});
