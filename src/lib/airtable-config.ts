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
  /** "Discount Codes" table — server-validated BTC discount codes (ground truth). */
  discountCodesTableId: "tble7XP43WyeKeHXd",
  /** "META Cryptic Clues" table — clues submitted from the FAQ whiteboard lightbox. */
  crypticCluesTableId: "tblzZTAMKKftdRROy",
  /** "RFP Submissions" table — session proposals + the speaker committee's rubric. */
  rfpSubmissionsTableId: "tbl31UWBj60gQemuw",
  /** "Egg Tracking" table — easter eggs found on the dividers. */
  eggTrackingTableId: "tblpz5jxmWsC6R4av",
} as const;
