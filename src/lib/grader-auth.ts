import { can } from "./access";
import { accountLabel, signOutAccount } from "./auth";
import { committeeUserId } from "./rfp-sessions";
import { createSessionAuth, type Session as BaseSession } from "./session-auth";
import type { Identity } from "./grader-identity";

// Access is a signed-in account with `submissions.grade`, which grades as
// itself. The shared password + "I am" dropdown is the fallback until the
// committee has accounts (META-1484); it identifies by committee name, which
// maps to an account by email, so a grade is never saved without one.

/** `identity: null` = password accepted, still need to say who you are. */
export type Session = BaseSession<Identity>;

export type Access =
  | { via: "account"; identity: Identity; userId: string }
  | { via: "password"; identity: Identity | null };

function parseIdentity(value: unknown): Identity | null {
  if (!value || typeof value !== "object") return null;
  const { kind, name } = value as { kind?: unknown; name?: unknown };
  if (kind === "anon") return { kind: "anon" };
  return typeof name === "string" ? { kind: "grader", name } : null;
}

export const {
  isConfigured,
  checkPassword,
  startSession,
  endSession,
  readSession,
} = createSessionAuth<Identity>({
  cookie: "mg_grader",
  path: "/grade",
  passwordEnv: "GRADER_PASSWORD",
  secretEnv: "GRADER_SESSION_SECRET",
  parseIdentity,
});

/** Who may grade on this request, or null. */
export async function gradeAccess(): Promise<Access | null> {
  const account = await can("submissions.grade");
  if (account) {
    const label = accountLabel(account.user);
    // Code sign-in registers without a name: email-only means "Someone else".
    return {
      via: "account",
      userId: account.user.id,
      identity:
        label === account.user.email
          ? { kind: "anon" }
          : { kind: "grader", name: label },
    };
  }
  const legacy = await readSession();
  return legacy ? { via: "password", identity: legacy.identity } : null;
}

/**
 * The account the viewer acts as: their own, or for the password fallback the
 * one their committee name maps to. Null when there isn't one, so "assigned
 * to me" has nothing to match and a grade can't be attributed.
 */
export async function graderUserId(access: Access): Promise<string | null> {
  if (access.via === "account") return access.userId;
  if (access.identity?.kind !== "grader") return null;
  return committeeUserId(access.identity.name);
}

/** Ends whichever session let them in; an account signs out of the site. */
export async function endAccess(): Promise<void> {
  const access = await gradeAccess();
  await endSession();
  if (access?.via === "account") await signOutAccount();
}
