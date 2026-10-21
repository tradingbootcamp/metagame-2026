import "server-only";
import { COMMITTEE_NAMES } from "./rfp-labels";

// The committee's account emails, kept off the client: rfp-labels.ts ships in
// browser bundles and only carries the names.

/** Each committee name as the Grader and Shepherd selects spell it → account email. */
export const COMMITTEE_EMAILS: Record<string, string> = {
  "John Bromels": "jbromels@gmail.com",
  "Brian Smiley": "brian@metagame.games",
  "Ben Karcher": "ben@metagame.games",
  "Brendan Hurst": "brendan@metagame.games",
  "Tommy Honton": "tommy@tommyhonton.com",
  "Sparr Risher": "sparr0@gmail.com",
  "Michael Sheely": "michael.sheely2@gmail.com",
  "Ricki Heicklen": "ricki@metagame.games",
  Jisk: "ja.kopczynski@gmail.com",
  "Scott Gillies": "scottdgillies@gmail.com",
  "Julian Wise": "julian.w.wise@gmail.com",
};

for (const name of COMMITTEE_NAMES) {
  if (!Object.hasOwn(COMMITTEE_EMAILS, name)) {
    throw new Error(`COMMITTEE_NAMES lists ${name}, which has no email here`);
  }
}

/** The committee option name for an account email, if it has one. */
export function committeeName(email: string): string | null {
  const lower = email.toLowerCase();
  const hit = Object.entries(COMMITTEE_EMAILS).find(([, e]) => e === lower);
  return hit ? hit[0] : null;
}
