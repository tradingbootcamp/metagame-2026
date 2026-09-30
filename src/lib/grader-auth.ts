import { createSessionAuth, type Session as BaseSession } from "./session-auth";
import type { Identity } from "./grader-identity";

// One shared password gets you in; the "I am" dropdown says who you are. If
// self-asserted identity stops being good enough, give each grader their own
// passcode and check it here; nothing outside this file needs to change.
//
// The two are separate steps so the roster (committee names, read from the
// assignee column in Airtable) is never rendered to someone who hasn't given
// the password.

/** `identity: null` = password accepted, still need to say who you are. */
export type Session = BaseSession<Identity>;

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
