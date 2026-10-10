import { accountLabel, adminSession, signOutAccount } from "./auth";
import { createSessionAuth, type Session as BaseSession } from "./session-auth";
import type { Identity } from "./grader-identity";

// Access is a signed-in admin account, whose name is the grader identity. The
// shared password + "I am" dropdown is the fallback until the committee has
// accounts (META-1484); the two steps keep the roster (committee names, read
// from the assignee column in Airtable) off the screen of anyone without it.

/** `identity: null` = password accepted, still need to say who you are. */
export type Session = BaseSession<Identity>;

export type Access =
  | { via: "account"; identity: Identity }
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
  const account = await adminSession();
  if (account) {
    const label = await accountLabel(account.user);
    // Code sign-in registers without a name: email-only means "Someone else".
    return {
      via: "account",
      identity:
        label === account.user.email
          ? { kind: "anon" }
          : { kind: "grader", name: label },
    };
  }
  const legacy = await readSession();
  return legacy ? { via: "password", identity: legacy.identity } : null;
}

/** Ends whichever session let them in; an account signs out of the site. */
export async function endAccess(): Promise<void> {
  const access = await gradeAccess();
  await endSession();
  if (access?.via === "account") await signOutAccount();
}
