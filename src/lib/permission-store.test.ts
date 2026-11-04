import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Permission } from "./permissions";

const db = vi.hoisted(() => ({
  /** Results for each select, in order. */
  selects: [] as unknown[][],
  inserted: [] as unknown[],
  deleted: 0,
  updated: 0,
}));

vi.mock("@/db", async (importOriginal) => {
  const { schema } = await importOriginal<typeof import("@/db")>();
  const chain = (result: () => unknown[]) => {
    const link: Record<string, unknown> = {};
    for (const method of [
      "from",
      "where",
      "limit",
      "innerJoin",
      "orderBy",
      "set",
      "onConflictDoNothing",
    ])
      link[method] = () => link;
    link.then = (done: (rows: unknown[]) => unknown) => done(result());
    return link;
  };
  return {
    schema,
    getDb: () => ({
      select: () => chain(() => db.selects.shift() ?? []),
      insert: () => ({
        values: (row: unknown) => {
          db.inserted.push(row);
          return chain(() => []);
        },
      }),
      update: () => {
        db.updated += 1;
        return chain(() => []);
      },
      delete: () => {
        db.deleted += 1;
        return chain(() => []);
      },
    }),
  };
});
vi.mock("./ticket-store", () => ({
  hasClaimedTicket: vi.fn(),
  claimedTicketOwners: vi.fn(),
}));

import {
  createRole,
  deleteRole,
  listMagnumOpusAdmins,
  MAGNUM_OPUS_ADMIN_ROLE,
  renameRole,
  setMagnumOpusAdmin,
  setRolePermission,
  setUserRole,
} from "./permission-store";

const operator = (...held: Permission[]) => ({
  admin: false,
  permissions: new Set(held),
});
const fixedRow = [{ name: MAGNUM_OPUS_ADMIN_ROLE }];
const carrying = (...permissions: string[]) => [
  [{ id: "role" }],
  permissions.map((permission) => ({ permission })),
];
// setUserRole's built-in check reads the role's name once more.
const stillNamed = [fixedRow];

beforeEach(() => {
  db.selects = [];
  db.inserted = [];
  db.deleted = 0;
  db.updated = 0;
});

describe("setMagnumOpusAdmin", () => {
  it("adds someone when the operator holds all the role carries, however they hold it", async () => {
    db.selects = [...carrying("magnum_opus.manage"), ...stillNamed];
    await setMagnumOpusAdmin("u", true, operator("magnum_opus.manage"));
    expect(db.inserted).toEqual([{ userId: "u", roleId: "role" }]);
  });

  it("won't hand out a permission a reconfigured role carries and the operator lacks", async () => {
    db.selects = carrying("magnum_opus.manage", "users.edit");
    await expect(
      setMagnumOpusAdmin("u", true, operator("magnum_opus.manage")),
    ).rejects.toThrow(/which you don't hold/);
    expect(db.inserted).toEqual([]);
  });

  it("lets a site admin add someone to a role with extra permissions", async () => {
    db.selects = [
      ...carrying("magnum_opus.manage", "users.edit"),
      ...stillNamed,
    ];
    await setMagnumOpusAdmin("u", true, {
      admin: true,
      permissions: new Set(),
    });
    expect(db.inserted).toHaveLength(1);
  });

  it("won't report success when the role no longer gives access to the tool", async () => {
    db.selects = carrying("users.view");
    await expect(
      setMagnumOpusAdmin("u", true, {
        admin: true,
        permissions: new Set(),
      }),
    ).rejects.toThrow(/no longer carries/);
    expect(db.inserted).toEqual([]);
  });

  it("removes someone even if the operator lacks the role's other permissions", async () => {
    db.selects = [
      ...carrying("magnum_opus.manage", "users.edit"),
      ...stillNamed,
    ];
    await setMagnumOpusAdmin("u", false, operator("magnum_opus.manage"));
    expect(db.deleted).toBe(1);
  });

  it("refuses when the role is gone rather than remaking it", async () => {
    db.selects = [[]];
    await expect(
      setMagnumOpusAdmin("u", true, operator("magnum_opus.manage")),
    ).rejects.toThrow(/missing/);
    expect(db.inserted).toEqual([]);
  });
});

describe("the Magnum Opus Admin role's identity", () => {
  it("can't be renamed", async () => {
    db.selects = [fixedRow, fixedRow];
    await expect(renameRole("role", "Tokens")).rejects.toThrow(/can't be/);
    expect(db.updated).toBe(0);
  });

  it("can't be deleted", async () => {
    db.selects = [fixedRow, fixedRow];
    await expect(deleteRole("role")).rejects.toThrow(/can't be/);
    expect(db.deleted).toBe(0);
  });

  it("can't be taken by another role, in any case", async () => {
    await expect(createRole("magnum opus ADMIN")).rejects.toThrow(/reserved/);
    db.selects = [[{ name: "Volunteer" }], [{ name: "Volunteer" }]];
    await expect(renameRole("other", "Magnum Opus Admin")).rejects.toThrow(
      /reserved/,
    );
    expect(db.inserted).toEqual([]);
    expect(db.updated).toBe(0);
  });

  it("keeps magnum_opus.manage but can carry more", async () => {
    db.selects = [fixedRow];
    await expect(
      setRolePermission("role", "magnum_opus.manage", false),
    ).rejects.toThrow(/always carries/);
    expect(db.deleted).toBe(0);

    db.selects = [fixedRow];
    await setRolePermission("role", "users.view", true);
    expect(db.inserted).toEqual([{ roleId: "role", permission: "users.view" }]);
  });

  it("is still assignable like any role", async () => {
    db.selects = [fixedRow];
    await setUserRole("u", "role", true);
    expect(db.inserted).toEqual([{ userId: "u", roleId: "role" }]);
  });

  it("leaves other roles free to drop the permission", async () => {
    db.selects = [[{ name: "Volunteer" }]];
    await setRolePermission("other", "magnum_opus.manage", false);
    expect(db.deleted).toBe(1);
  });

  it("listing admins writes nothing", async () => {
    db.selects = [[{ id: "u", name: "Sam", email: "s@x" }]];
    await expect(listMagnumOpusAdmins()).resolves.toEqual([
      { id: "u", name: "Sam", email: "s@x" },
    ]);
    expect(db.inserted).toEqual([]);
  });
});
