import { can, teamAccess } from "./access";
import { accountLabel, signOutAccount } from "./auth";
import {
  ADMIN_PASSWORD_PERMISSIONS,
  expand,
  type Permission,
} from "./permissions";
import { createSessionAuth, type Session as BaseSession } from "./session-auth";

// Team-only tools under /backstage. Access is a signed-in account holding the
// tool's permission (src/lib/permissions.ts); the shared password + self-asserted
// name is a fallback until the whole team has accounts (META-1484), then it
// goes. A password session holds the fixed ADMIN_PASSWORD_PERMISSIONS set.

export type AdminIdentity = { name: string };
export type Session = BaseSession<AdminIdentity>;

export type Access =
  | { via: "account"; name: string; userId: string }
  /** `name: null` = password accepted, still need to say who you are. */
  | { via: "password"; name: string | null };

function parseIdentity(value: unknown): AdminIdentity | null {
  if (!value || typeof value !== "object") return null;
  const { name } = value as { name?: unknown };
  return typeof name === "string" && name.trim() ? { name } : null;
}

export const {
  isConfigured,
  checkPassword,
  startSession,
  endSession,
  readSession,
} = createSessionAuth<AdminIdentity>({
  cookie: "mg_admin",
  path: "/backstage",
  passwordEnv: "ADMIN_PASSWORD",
  secretEnv: "ADMIN_SESSION_SECRET",
  parseIdentity,
});

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
  if (account) {
    const name = accountLabel(account.user);
    return { via: "account", name, userId: account.user.id };
  }
  if (permission && !expand(ADMIN_PASSWORD_PERMISSIONS).has(permission)) {
    return null;
  }
  const legacy = await readSession();
  return legacy
    ? { via: "password", name: legacy.identity?.name ?? null }
    : null;
}

export type NamedAccess = Access & { name: string };

export const EXPIRED = "Your session expired. Reload.";

/** The one check for server actions: someone with the permission and a name to put on what they create, or null. */
export async function requireAccess(
  permission: Permission,
): Promise<NamedAccess | null> {
  const access = await toolAccess(permission);
  return access?.name ? (access as NamedAccess) : null;
}

/** Ends whichever session let them in; an account signs out of the site. */
export async function endAccess(): Promise<void> {
  const access = await toolAccess();
  await endSession();
  if (access?.via === "account") await signOutAccount();
}
