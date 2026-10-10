import { adminSession, signOutAccount } from "./auth";
import { createSessionAuth, type Session as BaseSession } from "./session-auth";

// Team-only tools under /admin. Access is a signed-in account with the admin
// role; the shared password + self-asserted name is a fallback until the whole
// team has accounts (META-1484), then it goes.

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
  path: "/admin",
  passwordEnv: "ADMIN_PASSWORD",
  secretEnv: "ADMIN_SESSION_SECRET",
  parseIdentity,
});

/** Who may use the team tools on this request, or null. */
export async function adminAccess(): Promise<Access | null> {
  const account = await adminSession();
  if (account) {
    const { id, name, email } = account.user;
    // Code sign-in registers without a name; the email is the label then.
    return { via: "account", name: name.trim() || email, userId: id };
  }
  const legacy = await readSession();
  return legacy
    ? { via: "password", name: legacy.identity?.name ?? null }
    : null;
}

export type NamedAccess = Access & { name: string };

export const EXPIRED = "Your session expired. Reload.";

/**
 * The one check for server actions: an admin with a name to put on what they
 * create, or null. Swap for `can()` when the permission system lands.
 */
export async function requireAdmin(): Promise<NamedAccess | null> {
  const access = await adminAccess();
  return access?.name ? (access as NamedAccess) : null;
}

/** Ends whichever session let them in; an account signs out of the site. */
export async function endAccess(): Promise<void> {
  const access = await adminAccess();
  await endSession();
  if (access?.via === "account") await signOutAccount();
}
