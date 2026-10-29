import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import {
  isPermission,
  PERMISSIONS,
  type AccessInput,
  type Permission,
} from "./permissions";
import { hasClaimedTicket } from "./ticket-store";

const {
  roles,
  rolePermissions,
  userRoles,
  userPermissionGrants,
  user,
  sessionHosts,
} = schema;

// Built-in roles attach themselves instead of being assigned: Attendee is
// anyone with a claimed ticket, Session host anyone listed as a host on a
// session. They're ordinary rows, so the roles grid sets what they carry, but
// they can't be renamed, deleted or ticked on a person; a user_roles row for
// one (from before it was built in) is ignored. Until the row exists (first
// load of /backstage/roles) the defaults apply.
export const ATTENDEE_ROLE = "Attendee";
export const HOST_ROLE = "Session host";

type Builtin = {
  /** Completes "Granted to anyone who …". */
  auto: string;
  defaults: Permission[];
  holds: (userId: string) => Promise<boolean>;
};

const BUILTIN: Record<string, Builtin> = {
  [ATTENDEE_ROLE]: {
    auto: "has a ticket",
    defaults: ["schedule.rsvps"],
    holds: hasClaimedTicket,
  },
  [HOST_ROLE]: {
    auto: "hosts a session",
    defaults: ["schedule.preview"],
    holds: hostsASession,
  },
};

// Case-insensitive, so a "Session host" role made by hand before it was built
// in is the one that becomes automatic rather than a second row beside it.
const builtinKey = (name: string): string | null =>
  Object.keys(BUILTIN).find((k) => k.toLowerCase() === name.toLowerCase()) ??
  null;

export const isBuiltinRole = (name: string) => builtinKey(name) !== null;

/** On any session's host list, lead or co-host. */
async function hostsASession(userId: string): Promise<boolean> {
  const [row] = await getDb()
    .select({ sessionId: sessionHosts.sessionId })
    .from(sessionHosts)
    .where(eq(sessionHosts.userId, userId))
    .limit(1);
  return row !== undefined;
}

export type Role = {
  id: string;
  name: string;
  permissions: Permission[];
  /** Accounts assigned it, by name. */
  holders: { id: string; name: string; email: string }[];
  /** Built-in: who gets it automatically, e.g. "has a ticket". */
  auto?: string;
};

const sameName = (name: string) => sql`lower(${roles.name}) = lower(${name})`;

async function ensureBuiltinRoles(): Promise<void> {
  const db = getDb();
  for (const [name, { defaults }] of Object.entries(BUILTIN)) {
    const [exists] = await db
      .select({ id: roles.id })
      .from(roles)
      .where(sameName(name))
      .limit(1);
    if (exists) continue;
    const [made] = await db
      .insert(roles)
      .values({ name })
      .onConflictDoNothing()
      .returning({ id: roles.id });
    if (made && defaults.length > 0) {
      await db
        .insert(rolePermissions)
        .values(defaults.map((permission) => ({ roleId: made.id, permission })))
        .onConflictDoNothing();
    }
  }
}

export async function listRoles(): Promise<Role[]> {
  await ensureBuiltinRoles();
  const db = getDb();
  const [rows, perms, holders] = await Promise.all([
    db.select().from(roles).orderBy(asc(roles.name)),
    db.select().from(rolePermissions),
    db
      .select({
        roleId: userRoles.roleId,
        id: user.id,
        name: user.name,
        email: user.email,
      })
      .from(userRoles)
      .innerJoin(user, eq(user.id, userRoles.userId))
      .orderBy(asc(user.name)),
  ]);
  return rows.map((r) => {
    const builtin = builtinKey(r.name);
    return {
      id: r.id,
      name: r.name,
      permissions: perms
        .filter((p) => p.roleId === r.id)
        .map((p) => p.permission)
        .filter(isPermission),
      // A built-in role's holders are whoever meets its rule, not these rows.
      holders: builtin
        ? []
        : holders
            .filter((h) => h.roleId === r.id)
            .map(({ id, name, email }) => ({ id, name, email })),
      ...(builtin ? { auto: BUILTIN[builtin].auto } : {}),
    };
  });
}

async function refuseBuiltin(id: string): Promise<void> {
  const [row] = await getDb()
    .select({ name: roles.name })
    .from(roles)
    .where(eq(roles.id, id))
    .limit(1);
  if (row && isBuiltinRole(row.name))
    throw new Error(
      `${row.name} is built in: it attaches itself and can't be changed here.`,
    );
}

export async function createRole(name: string): Promise<void> {
  if (isBuiltinRole(name)) throw new Error(`${name} is a built-in role.`);
  await getDb().insert(roles).values({ name });
}

export async function renameRole(id: string, name: string): Promise<void> {
  await refuseBuiltin(id);
  if (isBuiltinRole(name)) throw new Error(`${name} is a built-in role.`);
  await getDb().update(roles).set({ name }).where(eq(roles.id, id));
}

export async function deleteRole(id: string): Promise<void> {
  await refuseBuiltin(id);
  await getDb().delete(roles).where(eq(roles.id, id));
}

export async function setRolePermission(
  roleId: string,
  permission: Permission,
  granted: boolean,
): Promise<void> {
  const db = getDb();
  if (granted && PERMISSIONS[permission].audience !== "attendee") {
    const [row] = await db
      .select({ name: roles.name })
      .from(roles)
      .where(eq(roles.id, roleId))
      .limit(1);
    if (row && isBuiltinRole(row.name))
      throw new Error(`${row.name} can only carry attendee permissions.`);
  }
  if (granted) {
    await db
      .insert(rolePermissions)
      .values({ roleId, permission })
      .onConflictDoNothing();
  } else {
    await db
      .delete(rolePermissions)
      .where(
        and(
          eq(rolePermissions.roleId, roleId),
          eq(rolePermissions.permission, permission),
        ),
      );
  }
}

/** Everything that decides one account's permissions, for `effectivePermissions`. */
export async function userAccess(
  userId: string,
  admin: boolean,
): Promise<AccessInput & { roleIds: string[] }> {
  const db = getDb();
  const [held, grants, auto] = await Promise.all([
    db
      .select({
        id: roles.id,
        name: roles.name,
        permission: rolePermissions.permission,
      })
      .from(userRoles)
      .innerJoin(roles, eq(roles.id, userRoles.roleId))
      .leftJoin(rolePermissions, eq(rolePermissions.roleId, roles.id))
      .where(eq(userRoles.userId, userId))
      .orderBy(asc(roles.name)),
    db
      .select({ permission: userPermissionGrants.permission })
      .from(userPermissionGrants)
      .where(eq(userPermissionGrants.userId, userId)),
    builtinRoles(userId),
  ]);
  const byRole = new Map<string, { name: string; permissions: string[] }>();
  for (const row of held) {
    // Assigned by hand before the role was built in: its rule decides now.
    if (isBuiltinRole(row.name)) continue;
    const role = byRole.get(row.id) ?? { name: row.name, permissions: [] };
    if (row.permission) role.permissions.push(row.permission);
    byRole.set(row.id, role);
  }
  return {
    admin,
    roles: [...byRole.values(), ...auto],
    roleIds: [...byRole.keys()],
    grants: grants.map((g) => g.permission),
  };
}

/**
 * The built-in roles this account meets the rule for, each with its row's
 * permissions, or the defaults until the row exists.
 */
async function builtinRoles(
  userId: string,
): Promise<AccessInput["roles"][number][]> {
  const out: AccessInput["roles"][number][] = [];
  await Promise.all(
    Object.entries(BUILTIN).map(async ([name, { auto, defaults, holds }]) => {
      const [held, rows] = await Promise.all([
        holds(userId),
        getDb()
          .select({ permission: rolePermissions.permission })
          .from(roles)
          .leftJoin(rolePermissions, eq(rolePermissions.roleId, roles.id))
          .where(sameName(name)),
      ]);
      if (!held) return;
      const permissions =
        rows.length === 0
          ? defaults
          : rows
              .map((r) => r.permission)
              .filter((p): p is string => p !== null);
      out.push({ name, permissions, auto });
    }),
  );
  // Promise.all settles in any order; keep the listing stable.
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

/** Roles per user, for the users table. */
export async function rolesFor(
  userIds: string[],
): Promise<Map<string, { id: string; name: string }[]>> {
  const out = new Map<string, { id: string; name: string }[]>();
  if (userIds.length === 0) return out;
  const rows = await getDb()
    .select({ userId: userRoles.userId, id: roles.id, name: roles.name })
    .from(userRoles)
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .where(inArray(userRoles.userId, userIds))
    .orderBy(asc(roles.name));
  for (const r of rows) {
    // Stale: a built-in role is held by rule, not by row.
    if (isBuiltinRole(r.name)) continue;
    out.set(r.userId, [
      ...(out.get(r.userId) ?? []),
      { id: r.id, name: r.name },
    ]);
  }
  return out;
}

export async function setUserRole(
  userId: string,
  roleId: string,
  assigned: boolean,
): Promise<void> {
  await refuseBuiltin(roleId);
  const db = getDb();
  if (assigned) {
    await db.insert(userRoles).values({ userId, roleId }).onConflictDoNothing();
  } else {
    await db
      .delete(userRoles)
      .where(and(eq(userRoles.userId, userId), eq(userRoles.roleId, roleId)));
  }
}

export async function setUserGrant(
  userId: string,
  permission: Permission,
  granted: boolean,
): Promise<void> {
  const db = getDb();
  if (granted) {
    await db
      .insert(userPermissionGrants)
      .values({ userId, permission })
      .onConflictDoNothing();
  } else {
    await db
      .delete(userPermissionGrants)
      .where(
        and(
          eq(userPermissionGrants.userId, userId),
          eq(userPermissionGrants.permission, permission),
        ),
      );
  }
}
