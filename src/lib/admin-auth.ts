import { can, teamAccess } from "./access";
import { accountLabel, signOutAccount } from "./auth";
import type { Permission } from "./permissions";

// Team-only tools under /backstage. Access is a signed-in account holding the
// tool's permission (src/lib/permissions.ts); the account's name is the
// identity on whatever the tool creates.

export type Access = { name: string; userId: string };

/**
 * Who may use the tool this permission gates on this request, or null. With
 * no permission: anyone holding a team-tool permission, for the index and
 * header; attendee-only permissions don't count.
 */
export async function toolAccess(
  permission?: Permission,
): Promise<Access | null> {
  const account = permission
    ? await can(permission)
    : await teamAccess().then((a) => (a?.team ? a.session : null));
  if (!account) return null;
  return { name: accountLabel(account.user), userId: account.user.id };
}

export const EXPIRED = "Your session expired. Reload.";

/** The one check for server actions: someone with the permission, or null. */
export const requireAccess = (permission: Permission): Promise<Access | null> =>
  toolAccess(permission);

/** Signs the account out of the site. */
export async function endAccess(): Promise<void> {
  await signOutAccount();
}
