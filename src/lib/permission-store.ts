import { and, asc, eq, inArray } from "drizzle-orm";
import { getDb, schema } from "@/db";
import {
  isPermission,
  PERMISSIONS,
  type AccessInput,
  type Permission,
} from "./permissions";
import { hasClaimedTicket } from "./ticket-store";

const { roles, rolePermissions, userRoles, userPermissionGrants, user } =
  schema;

// Built-in roles attach themselves instead of being assigned: Attendee is
// anyone with a claimed ticket. They're ordinary rows, so the roles grid sets
// what they carry, but they can't be renamed, deleted or ticked on a person.
// Until the row exists (first load of /admin/roles) the defaults apply.
export const ATTENDEE_ROLE = "Attendee";
const ATTENDEE_AUTO = "has a ticket";
const ATTENDEE_DEFAULTS: Permission[] = ["schedule.rsvps"];
const BUILTIN: Record<string, string> = { [ATTENDEE_ROLE]: ATTENDEE_AUTO };

export const isBuiltinRole = (name: string) => Object.hasOwn(BUILTIN, name);

export type Role = {
  id: string;
  name: string;
  permissions: Permission[];
  /** Accounts assigned it, by name. */
  holders: { id: string; name: string; email: string }[];
  /** Built-in: who gets it automatically, e.g. "has a ticket". */
  auto?: string;
};

async function ensureBuiltinRoles(): Promise<void> {
  const db = getDb();
  const [exists] = await db
    .select({ id: roles.id })
    .from(roles)
    .where(eq(roles.name, ATTENDEE_ROLE))
    .limit(1);
  if (exists) return;
  const [made] = await db
    .insert(roles)
    .values({ name: ATTENDEE_ROLE })
    .onConflictDoNothing()
    .returning({ id: roles.id });
  if (made && ATTENDEE_DEFAULTS.length > 0) {
    await db
      .insert(rolePermissions)
      .values(
        ATTENDEE_DEFAULTS.map((permission) => ({
          roleId: made.id,
          permission,
        })),
      )
      .onConflictDoNothing();
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
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    permissions: perms
      .filter((p) => p.roleId === r.id)
      .map((p) => p.permission)
      .filter(isPermission),
    holders: holders
      .filter((h) => h.roleId === r.id)
      .map(({ id, name, email }) => ({ id, name, email })),
    ...(isBuiltinRole(r.name) ? { auto: BUILTIN[r.name] } : {}),
  }));
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
  const [held, grants, ticketed, attendee] = await Promise.all([
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
    hasClaimedTicket(userId),
    attendeeRole(),
  ]);
  const byRole = new Map<string, { name: string; permissions: string[] }>();
  for (const row of held) {
    const role = byRole.get(row.id) ?? { name: row.name, permissions: [] };
    if (row.permission) role.permissions.push(row.permission);
    byRole.set(row.id, role);
  }
  const auto = ticketed ? [attendee] : [];
  return {
    admin,
    roles: [...byRole.values(), ...auto],
    roleIds: [...byRole.keys()],
    grants: grants.map((g) => g.permission),
  };
}

/** The Attendee role's permissions, or the defaults until its row exists. */
async function attendeeRole(): Promise<AccessInput["roles"][number]> {
  const rows = await getDb()
    .select({ permission: rolePermissions.permission })
    .from(roles)
    .leftJoin(rolePermissions, eq(rolePermissions.roleId, roles.id))
    .where(eq(roles.name, ATTENDEE_ROLE));
  const permissions =
    rows.length === 0
      ? ATTENDEE_DEFAULTS
      : rows.map((r) => r.permission).filter((p): p is string => p !== null);
  return { name: ATTENDEE_ROLE, permissions, auto: ATTENDEE_AUTO };
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
  for (const r of rows)
    out.set(r.userId, [
      ...(out.get(r.userId) ?? []),
      { id: r.id, name: r.name },
    ]);
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
