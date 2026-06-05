import { env } from "@/env";

export type SignupResult = { stored: boolean; reason?: string };

// Interest Intake tags each row by Type of Interest; splash signups get the "email list"
// option. Written by name (the API rejects option ids on write); typecast keeps signups
// working if it's relabeled — but update this to match, or a stray option gets recreated.
const INTEREST_FIELD = "Type of Interest";
const INTEREST_VALUE = "email list";

// Interest Intake's primary field. Optional on the form, so only sent when provided
// (avoids overwriting an existing name with a blank on a repeat submit).
const NAME_FIELD = "Name";

/**
 * Upsert an email into the Airtable signups table, keyed on the email field so
 * a repeat submission updates rather than duplicates. Uses `performUpsert`, so
 * it dedupes server-side with only `data.records:write` scope — no read needed.
 *
 * If Airtable isn't configured yet (no token / base / table), this no-ops with
 * a warning so local dev still works — the splash form succeeds, the email just
 * isn't persisted.
 */
export async function recordSignup(
  email: string,
  name?: string,
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
    [INTEREST_FIELD]: [INTEREST_VALUE],
  };
  if (name) fields[NAME_FIELD] = name;

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
