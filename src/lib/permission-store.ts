import { and, asc, count, eq, inArray } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { isPermission, type AccessInput, type Permission } from "./permissions";

const { roles, rolePermissions, userRoles, userPermissionGrants } = schema;

export type Role = {
  id: string;
  name: string;
  permissions: Permission[];
  members: number;
};

export async function listRoles(): Promise<Role[]> {
  const db = getDb();
  const [rows, perms, members] = await Promise.all([
    db.select().from(roles).orderBy(asc(roles.name)),
    db.select().from(rolePermissions),
    db
      .select({ roleId: userRoles.roleId, members: count() })
      .from(userRoles)
      .groupBy(userRoles.roleId),
  ]);
  const memberCount = new Map(members.map((m) => [m.roleId, m.members]));
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    permissions: perms
      .filter((p) => p.roleId === r.id)
      .map((p) => p.permission)
      .filter(isPermission),
    members: memberCount.get(r.id) ?? 0,
  }));
}

export async function createRole(name: string): Promise<void> {
  await getDb().insert(roles).values({ name });
}

export async function renameRole(id: string, name: string): Promise<void> {
  await getDb().update(roles).set({ name }).where(eq(roles.id, id));
}

export async function deleteRole(id: string): Promise<void> {
  await getDb().delete(roles).where(eq(roles.id, id));
}

export async function setRolePermission(
  roleId: string,
  permission: Permission,
  granted: boolean,
): Promise<void> {
  const db = getDb();
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
  const [held, grants] = await Promise.all([
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
  ]);
  const byRole = new Map<string, { name: string; permissions: string[] }>();
  for (const row of held) {
    const role = byRole.get(row.id) ?? { name: row.name, permissions: [] };
    if (row.permission) role.permissions.push(row.permission);
    byRole.set(row.id, role);
  }
  return {
    admin,
    roles: [...byRole.values()],
    roleIds: [...byRole.keys()],
    grants: grants.map((g) => g.permission),
  };
}

/** Role names per user, for the users table. */
export async function roleNamesFor(
  userIds: string[],
): Promise<Map<string, string[]>> {
  const out = new Map<string, string[]>();
  if (userIds.length === 0) return out;
  const rows = await getDb()
    .select({ userId: userRoles.userId, name: roles.name })
    .from(userRoles)
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .where(inArray(userRoles.userId, userIds))
    .orderBy(asc(roles.name));
  for (const r of rows)
    out.set(r.userId, [...(out.get(r.userId) ?? []), r.name]);
  return out;
}

export async function setUserRole(
  userId: string,
  roleId: string,
  assigned: boolean,
): Promise<void> {
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
