import { VOLUNTEER_APPLY_PATH } from "@/v2/lib/links";

// The volunteer short link (/volunteer-form) forwards to the journey with the
// UTMs the volunteer table records. The page stores them on arrival
// (UtmCapture), and the application sends them to Airtable's UTM fields.
const UTM_PARAMS = ["utm_source", "utm_medium", "utm_campaign"] as const;

const MAX_LEN = 200;

/** The volunteer journey's path, carrying `params`' utm_* values. */
export function volunteerFormUrl(params: URLSearchParams): string {
  const out = new URLSearchParams();
  for (const key of UTM_PARAMS) {
    const value = params.get(key)?.trim().slice(0, MAX_LEN);
    if (value) out.set(key, value);
  }
  const query = out.toString();
  return query ? `${VOLUNTEER_APPLY_PATH}?${query}` : VOLUNTEER_APPLY_PATH;
}
