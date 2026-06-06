import { env } from "@/env";
import { EMAIL_LIST_VALUE, type InterestValue } from "@/lib/interests";

export type SignupResult = { stored: boolean; reason?: string };

// Interest Intake tags each row by Type of Interest; every splash signup gets the
// "email list" option. Written by name (the API rejects option ids on write); typecast
// keeps signups working if it's relabeled — but update this to match, or a stray option
// gets recreated.
const INTEREST_FIELD = "Type of Interest";

// Interest Intake's primary field. Optional on the form, so only sent when provided
// (avoids overwriting an existing name with a blank on a repeat submit).
const NAME_FIELD = "Name";
// Free-text "anything else" from the follow-up form.
const NOTES_FIELD = "Notes";
// Marks dev/test submissions so they're filterable from real signups.
const TEST_FIELD = "Test";

type SignupFields = {
  name?: string;
  interests?: InterestValue[];
  notes?: string;
};

/**
 * Upsert an email into the Airtable signups table, keyed on the email field so
 * a repeat submission updates rather than duplicates. Uses `performUpsert`, so
 * it dedupes server-side with only `data.records:write` scope — no read needed.
 *
 * Both the initial signup and the optional interest follow-up call this: the
 * follow-up re-sends the same email plus `interests`/`notes`, and the upsert
 * merges them onto the existing row. An upsert PATCH *replaces* the multi-select,
 * so we always re-include "email list" to keep the original tag.
 *
 * If Airtable isn't configured yet (no token / base / table), this no-ops with
 * a warning so local dev still works — the splash form succeeds, the email just
 * isn't persisted.
 */
export async function recordSignup(
  email: string,
  { name, interests = [], notes }: SignupFields = {},
): Promise<SignupResult> {
  const {
    AIRTABLE_API_KEY,
    AIRTABLE_BASE_ID,
    AIRTABLE_TABLE_ID,
    AIRTABLE_EMAIL_FIELD,
  } = env;

  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID || !AIRTABLE_TABLE_ID) {
    console.warn(`[signup] Airtable not configured — not stored: ${email}`);
    return { stored: false, reason: "airtable-not-configured" };
  }

  const fields: Record<string, unknown> = {
    [AIRTABLE_EMAIL_FIELD]: email,
    [INTEREST_FIELD]: Array.from(new Set([EMAIL_LIST_VALUE, ...interests])),
    [TEST_FIELD]: process.env.NODE_ENV !== "production",
  };
  if (name) fields[NAME_FIELD] = name;
  if (notes) fields[NOTES_FIELD] = notes;

  const res = await fetch(
    `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE_ID)}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        performUpsert: { fieldsToMergeOn: [AIRTABLE_EMAIL_FIELD] },
        records: [{ fields }],
        typecast: true,
      }),
    },
  );

  if (!res.ok) {
    throw new Error(`Airtable responded ${res.status}: ${await res.text()}`);
  }

  return { stored: true };
}
