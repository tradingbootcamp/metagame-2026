"use server";

import { revalidatePath } from "next/cache";
import { teamAccess, type TeamAccess } from "@/lib/access";
import {
  listRoles,
  setUserOverride,
  setUserRole,
  userOverrides,
} from "@/lib/permission-store";
import {
  isPermission,
  overrideConflict,
  PERMISSIONS,
  type OverrideEffect,
  type Permission,
} from "@/lib/permissions";

export type Result = { error?: string };

const message = (err: unknown) =>
  err instanceof Error ? err.message : String(err);

// Your own access is off limits so a users.edit holder can't lock
// themselves out (an admin can always put it back). Handing out access is
// bounded by what you hold: no granting a permission you lack, so users.edit
// can't be parlayed into more through a second account. Denying takes access
// away, so it needs no such check.
async function run(
  userId: string,
  work: (viewer: TeamAccess) => Promise<void | string>,
): Promise<Result> {
  const viewer = await teamAccess();
  if (!viewer?.permissions.has("users.edit"))
    return { error: "Sign in with an account that edits users." };
  if (viewer.session.user.id === userId)
    return { error: "You can't change your own access." };
  try {
    const refused = await work(viewer);
    if (refused) return { error: refused };
  } catch (err) {
    return { error: message(err) };
  }
  revalidatePath(`/backstage/users/${userId}`);
  revalidatePath("/backstage/users");
  return {};
}

const lacking = (viewer: TeamAccess, wanted: Iterable<Permission>) =>
  viewer.admin ? [] : [...wanted].filter((p) => !viewer.permissions.has(p));

export async function assignRole(
  userId: string,
  roleId: string,
  assigned: boolean,
): Promise<Result> {
  return run(userId, async (viewer) => {
    if (assigned) {
      const role = (await listRoles()).find((r) => r.id === roleId);
      if (!role) return "That role no longer exists.";
      const missing = lacking(viewer, role.permissions);
      if (missing.length > 0)
        return `You can't assign ${role.name}: it carries ${missing
          .map((p) => PERMISSIONS[p].label)
          .join(", ")}, which you don't hold.`;
    }
    await setUserRole(userId, roleId, assigned);
  });
}

/** Allow, deny, or (`null`) leave it to the roles. */
export async function setGrant(
  userId: string,
  permission: string,
  effect: OverrideEffect | null,
): Promise<Result> {
  if (!isPermission(permission)) return { error: "Unknown permission." };
  if (effect !== null && effect !== "allow" && effect !== "deny")
    return { error: "Unknown effect." };
  return run(userId, async (viewer) => {
    if (effect === "allow" && lacking(viewer, [permission]).length > 0)
      return "You can't grant a permission you don't hold.";
    if (effect) {
      const conflict = overrideConflict(
        await userOverrides(userId),
        permission,
        effect,
      );
      if (conflict) return conflict;
    }
    await setUserOverride(userId, permission, effect);
  });
}
