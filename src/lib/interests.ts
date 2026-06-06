// The follow-up "say more about your interest" options. `value` matches a
// Type of Interest select choice in Airtable exactly (lowercase) so writes land
// on existing options instead of typecast minting new ones; `label` is the UI text.
// Imported by both the client form and the server route (no env/server deps here).
export const INTEREST_OPTIONS = [
  { value: "email list", label: "Just the email list" },
  { value: "volunteering", label: "Volunteering" },
  { value: "speaking", label: "Speaking" },
  { value: "organizing", label: "Organizing" },
  { value: "sponsoring", label: "Sponsoring" },
] as const;

// The "Just the email list" choice; exclusive of the interest options in the UI.
export const EMAIL_LIST_VALUE = "email list";

export type InterestValue = (typeof INTEREST_OPTIONS)[number]["value"];

const VALUES = new Set<string>(INTEREST_OPTIONS.map((o) => o.value));

export function isInterestValue(v: unknown): v is InterestValue {
  return typeof v === "string" && VALUES.has(v);
}
