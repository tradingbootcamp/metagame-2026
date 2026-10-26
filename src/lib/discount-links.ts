import { PREFERRED_CAMPAIGN, promoCode } from "./tracking-links";

/** Derived from the code alone: retries and later edits keep the same link. */
export function discountTrackingUrl(origin: string, code: string): string {
  // Older custom codes were not length-limited. Keep their direct checkout path.
  const landing = !!code && promoCode(code) === code;
  const url = new URL(
    landing ? "/" : `/buy/${encodeURIComponent(code)}`,
    origin,
  );
  url.search = new URLSearchParams({
    utm_source: "comp-tool",
    utm_medium: "comp-link",
    utm_campaign: PREFERRED_CAMPAIGN,
    utm_term: code,
    ...(landing ? { promo: code } : {}),
  }).toString();
  if (landing) url.hash = "tickets";
  return url.toString();
}
