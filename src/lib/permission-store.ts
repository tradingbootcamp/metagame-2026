import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import {
  expand,
  isPermission,
  PERMISSIONS,
  type AccessInput,
  type Permission,
} from "./permissions";
import { claimedTicketOwners, hasClaimedTicket } from "./ticket-store";

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
  /** Everyone `holds` is true for. */
  members: () => Promise<string[]>;
};

const BUILTIN: Record<string, Builtin> = {
  [ATTENDEE_ROLE]: {
    auto: "has a ticket",
    defaults: ["schedule.rsvps", "unconference.post"],
    holds: hasClaimedTicket,
    members: claimedTicketOwners,
  },
  [HOST_ROLE]: {
    auto: "hosts a session",
    defaults: ["schedule.preview"],
    holds: hostsASession,
    members: sessionHostIds,
  },
};

// Case-insensitive, so a "Session host" role made by hand before it was built
// in is the one that becomes automatic rather than a second row beside it.
const builtinKey = (name: string): string | null =>
  Object.keys(BUILTIN).find((k) => k.toLowerCase() === name.toLowerCase()) ??
  null;

export const isBuiltinRole = (name: string) => builtinKey(name) !== null;

// The role the magnum_opus_admin_role migration makes. Magnum Opus admins add
// and remove its members from /backstage/magnum-opus, found by this name, so
// the name and this permission are fixed. It's otherwise assigned and extended
// like any role.
export const MAGNUM_OPUS_ADMIN_ROLE = "Magnum Opus Admin";
const MAGNUM_OPUS_MANAGE: Permission = "magnum_opus.manage";

const isMagnumOpusAdminRole = (name: string) =>
  name.toLowerCase() === MAGNUM_OPUS_ADMIN_ROLE.toLowerCase();

async function sessionHostIds(): Promise<string[]> {
  const rows = await getDb()
    .selectDistinct({ id: sessionHosts.userId })
    .from(sessionHosts);
  return rows.map((r) => r.id);
}

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
  /** Can't be renamed or deleted, and always carries this permission. */
  required?: Permission;
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
      ...(isMagnumOpusAdminRole(r.name)
        ? { required: MAGNUM_OPUS_MANAGE }
        : {}),
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

async function refuseFixedRole(id: string): Promise<void> {
  await refuseBuiltin(id);
  const [row] = await getDb()
    .select({ name: roles.name })
    .from(roles)
    .where(eq(roles.id, id))
    .limit(1);
  if (row && isMagnumOpusAdminRole(row.name))
    throw new Error(
      `${row.name} can't be renamed or deleted: /backstage/magnum-opus relies on it.`,
    );
}

function refuseReservedName(name: string): void {
  if (isBuiltinRole(name)) throw new Error(`${name} is a built-in role.`);
  if (isMagnumOpusAdminRole(name))
    throw new Error(`${MAGNUM_OPUS_ADMIN_ROLE} is a reserved role name.`);
}

export async function createRole(name: string): Promise<void> {
  refuseReservedName(name);
  await getDb().insert(roles).values({ name });
}

export async function renameRole(id: string, name: string): Promise<void> {
  await refuseFixedRole(id);
  refuseReservedName(name);
  await getDb().update(roles).set({ name }).where(eq(roles.id, id));
}

export async function deleteRole(id: string): Promise<void> {
  await refuseFixedRole(id);
  await getDb().delete(roles).where(eq(roles.id, id));
}

export async function setRolePermission(
  roleId: string,
  permission: Permission,
  granted: boolean,
): Promise<void> {
  const db = getDb();
  const [row] = await db
    .select({ name: roles.name })
    .from(roles)
    .where(eq(roles.id, roleId))
    .limit(1);
  if (
    granted &&
    PERMISSIONS[permission].audience !== "attendee" &&
    row &&
    isBuiltinRole(row.name)
  )
    throw new Error(`${row.name} can only carry attendee permissions.`);
  if (
    !granted &&
    permission === MAGNUM_OPUS_MANAGE &&
    row &&
    isMagnumOpusAdminRole(row.name)
  )
    throw new Error(
      `${row.name} always carries ${PERMISSIONS[permission].label}.`,
    );
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

/**
 * Every account holding `permission` the way userAccess resolves it: through
 * a role, a built-in role's rule, a per-user grant, or an implication. Admins'
 * superuser bypass doesn't count, so they appear only if they hold it too.
 */
export async function holdersOf(permission: Permission): Promise<string[]> {
  const db = getDb();
  const [roleRows, grantRows] = await Promise.all([
    db
      .select({
        id: roles.id,
        name: roles.name,
        permission: rolePermissions.permission,
      })
      .from(roles)
      .leftJoin(rolePermissions, eq(rolePermissions.roleId, roles.id)),
    db
      .select({
        userId: userPermissionGrants.userId,
        permission: userPermissionGrants.permission,
      })
      .from(userPermissionGrants),
  ]);
  const carries = (held: string[]) => expand(held).has(permission);

  const byRole = new Map<string, { name: string; permissions: string[] }>();
  for (const r of roleRows) {
    const role = byRole.get(r.id) ?? { name: r.name, permissions: [] };
    if (r.permission) role.permissions.push(r.permission);
    byRole.set(r.id, role);
  }

  const out = new Set<string>();
  const grantsByUser = new Map<string, string[]>();
  for (const g of grantRows)
    grantsByUser.set(g.userId, [
      ...(grantsByUser.get(g.userId) ?? []),
      g.permission,
    ]);
  for (const [userId, held] of grantsByUser) if (carries(held)) out.add(userId);

  const explicit = [...byRole]
    .filter(([, r]) => !isBuiltinRole(r.name) && carries(r.permissions))
    .map(([id]) => id);
  const [assigned, ...builtinMembers] = await Promise.all([
    explicit.length > 0
      ? db
          .select({ userId: userRoles.userId })
          .from(userRoles)
          .where(inArray(userRoles.roleId, explicit))
      : Promise.resolve([]),
    ...Object.entries(BUILTIN).map(([name, { defaults, members }]) => {
      const row = [...byRole.values()].find((r) => builtinKey(r.name) === name);
      return carries(row ? row.permissions : defaults)
        ? members()
        : Promise.resolve([]);
    }),
  ]);
  for (const a of assigned) out.add(a.userId);
  for (const ids of builtinMembers) for (const id of ids) out.add(id);
  return [...out];
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

/** The role's id and what it carries now, which /backstage/roles can extend. */
async function magnumOpusAdminRole(): Promise<{
  id: string;
  permissions: Permission[];
} | null> {
  const db = getDb();
  const [role] = await db
    .select({ id: roles.id })
    .from(roles)
    .where(eq(roles.name, MAGNUM_OPUS_ADMIN_ROLE))
    .limit(1);
  if (!role) return null;
  const rows = await db
    .select({ permission: rolePermissions.permission })
    .from(rolePermissions)
    .where(eq(rolePermissions.roleId, role.id));
  return {
    id: role.id,
    permissions: rows.map((r) => r.permission).filter(isPermission),
  };
}

export async function listMagnumOpusAdmins(): Promise<
  { id: string; name: string; email: string }[]
> {
  return getDb()
    .select({ id: user.id, name: user.name, email: user.email })
    .from(userRoles)
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .innerJoin(user, eq(user.id, userRoles.userId))
    .where(eq(roles.name, MAGNUM_OPUS_ADMIN_ROLE))
    .orderBy(asc(user.name));
}

/**
 * Adds or removes a member without users.edit, so adding is bounded the way
 * assigning any role is: the operator must hold everything it carries now.
 */
export async function setMagnumOpusAdmin(
  userId: string,
  admin: boolean,
  operator: { admin: boolean; permissions: ReadonlySet<Permission> },
): Promise<void> {
  const role = await magnumOpusAdminRole();
  if (!role) throw new Error(`The ${MAGNUM_OPUS_ADMIN_ROLE} role is missing.`);
  if (admin) {
    if (!role.permissions.includes(MAGNUM_OPUS_MANAGE))
      throw new Error(
        `${MAGNUM_OPUS_ADMIN_ROLE} no longer carries ${PERMISSIONS[MAGNUM_OPUS_MANAGE].label}.`,
      );
    const missing = operator.admin
      ? []
      : role.permissions.filter((p) => !operator.permissions.has(p));
    if (missing.length > 0)
      throw new Error(
        `You can't add people to ${MAGNUM_OPUS_ADMIN_ROLE}: it carries ${missing
          .map((p) => PERMISSIONS[p].label)
          .join(", ")}, which you don't hold.`,
      );
  }
  await setUserRole(userId, role.id, admin);
}
