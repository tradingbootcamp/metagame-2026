import { adminSession } from "./auth";
import { createSessionAuth, type Session as BaseSession } from "./session-auth";

// Team-only tools under /admin. Access is a signed-in account with the admin
// role; the shared password + self-asserted name is a fallback until the whole
// team has accounts (META-1484), then it goes.

export type AdminIdentity = { name: string };
export type Session = BaseSession<AdminIdentity>;

export type Access =
  | { via: "account"; name: string; userId: string; email: string }
  /** `name: null` = password accepted, still need to say who you are. */
  | { via: "password"; name: string | null; userId?: undefined };

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
    return { via: "account", name, userId: id, email };
  }
  const legacy = await readSession();
  return legacy
    ? { via: "password", name: legacy.identity?.name ?? null }
    : null;
}

export const EXPIRED = "Your session expired. Reload.";

/**
 * The one check for server actions and pages: an admin with a name to put on
 * what they create. Swap for `can()` when the permission system lands.
 */
export async function requireAdmin(): Promise<Access & { name: string }> {
  const access = await adminAccess();
  if (!access?.name) throw new Error(EXPIRED);
  return access as Access & { name: string };
}
