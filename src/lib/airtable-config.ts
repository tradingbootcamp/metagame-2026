// Public Airtable identifiers for the Metagame 2026 base. These aren't secrets —
// they're useless without AIRTABLE_API_KEY (the one real credential, still in env) —
// so they live in committed config instead of masquerading as env vars. Repoint here
// if the destination base/table ever changes.
export const airtableConfig = {
  /** Metagame 2026 base. */
  baseId: "appROpPV6XUP4CSqX",
  /** "Interest Intake" table — email signups. */
  signupsTableId: "tbluUIxg0YnlMO1jQ",
  /** Email column in the signups table (also the upsert key). */
  signupEmailField: "Email",
  /** "Stripe Purchases" table — ticket purchases recorded by the webhook. */
  purchasesTableId: "tblMEDrxbS2abAHob",
} as const;
