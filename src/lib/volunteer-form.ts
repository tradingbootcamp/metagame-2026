import { VOLUNTEER_FORM_URL } from "@/v2/lib/links";

// The Airtable form only reads attribution from `prefill_<Field Name>` params,
// and its tracking fields stay visible unless the URL also hides them. Keys are
// the Airtable field names — renaming a field there silently drops it.
const UTM_FIELDS = {
  utm_source: "UTM Source",
  utm_medium: "UTM Medium",
  utm_campaign: "UTM Campaign",
} as const;

const MAX_LEN = 200;

/** The volunteer form with its tracking fields hidden and prefilled from `params`' utm_* values. */
export function volunteerFormUrl(params: URLSearchParams): string {
  const url = new URL(VOLUNTEER_FORM_URL);
  for (const [param, field] of Object.entries(UTM_FIELDS)) {
    const value = params.get(param)?.trim().slice(0, MAX_LEN);
    if (value) url.searchParams.set(`prefill_${field}`, value);
    url.searchParams.set(`hide_${field}`, "true");
  }
  return url.toString();
}
