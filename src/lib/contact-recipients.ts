import { ADVISORS, TEAM, type Person } from "@/v2/data/team";
import { TEAM_EMAIL } from "@/v2/lib/links";

// "kai=kai@example.com,sam=sam@example.com"
export function parsePrivateEmails(raw: string | undefined) {
  return new Map(
    (raw ?? "")
      .split(",")
      .map((pair) => pair.split("=").map((s) => s.trim()))
      .filter(([key, email]) => key && email)
      .map(([key, email]) => [key, email] as const),
  );
}

// Where the contact form may deliver: the team inbox, anyone listed with an
// email on /team, and the unpublished addresses behind a `contactKey`.
// Anything else returns null so the endpoint can't be used as an open relay.
export function resolveRecipient(
  to: string,
  privateEmails = parsePrivateEmails(process.env.PRIVATE_CONTACT_EMAILS),
  people: Pick<Person, "email" | "contactKey">[] = [...TEAM, ...ADVISORS],
): string | null {
  if (to === TEAM_EMAIL || people.some((p) => p.email === to)) return to;
  if (people.some((p) => p.contactKey === to)) {
    return privateEmails.get(to) ?? null;
  }
  return null;
}
