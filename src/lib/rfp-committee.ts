import "server-only";
import { env } from "@/env";
import { COMMITTEE_NAMES } from "./rfp-labels";

/**
 * Committee name → lowercased account email, from the COMMITTEE_EMAILS JSON.
 * Never throws: public pages import this module. Never logs the value, since
 * it holds the addresses (JSON.parse's message would quote it).
 */
export function parseCommitteeEmails(
  raw: string | undefined,
): Record<string, string> {
  if (!raw?.trim()) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = null;
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    console.error(
      "[rfp-committee] COMMITTEE_EMAILS isn't a JSON object; ignoring it",
    );
    return {};
  }
  const emails = Object.fromEntries(
    Object.entries(parsed).flatMap(([name, email]) =>
      typeof email === "string" && email.includes("@")
        ? [[name, email.trim().toLowerCase()]]
        : [],
    ),
  );
  const missing = COMMITTEE_NAMES.filter((n) => !Object.hasOwn(emails, n));
  if (missing.length > 0) {
    console.error(
      `[rfp-committee] COMMITTEE_EMAILS has no email for ${missing.join(", ")}`,
    );
  }
  return emails;
}

/** Each committee name as the Grader and Shepherd selects spell it → account email. */
export const COMMITTEE_EMAILS = parseCommitteeEmails(env.COMMITTEE_EMAILS);

export const committeeConfigured = () =>
  Object.keys(COMMITTEE_EMAILS).length > 0;

/** The committee option name for an account email, if it has one. */
export function committeeName(email: string): string | null {
  const lower = email.toLowerCase();
  const hit = Object.entries(COMMITTEE_EMAILS).find(([, e]) => e === lower);
  return hit ? hit[0] : null;
}
