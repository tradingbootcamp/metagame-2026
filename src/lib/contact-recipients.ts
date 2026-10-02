import { ADVISORS, TEAM, type Person } from "@/v2/data/team";
import { TEAM_EMAIL } from "@/v2/lib/links";

// The address behind a `contactKey`: CONTACT_EMAIL_<KEY>.
const contactEmail = (key: string) =>
  process.env[`CONTACT_EMAIL_${key.toUpperCase()}`]?.trim() || null;

// Where the contact form may deliver: the team inbox, or a team member's
// `contactKey`. Anything else returns null so the endpoint can't be used as an
// open relay.
export function resolveRecipient(
  to: string,
  people: Pick<Person, "contactKey">[] = [...TEAM, ...ADVISORS],
): string | null {
  if (to === TEAM_EMAIL) return to;
  return people.some((p) => p.contactKey === to) ? contactEmail(to) : null;
}
