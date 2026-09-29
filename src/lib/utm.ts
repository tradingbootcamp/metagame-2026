// First-touch UTM attribution: the UTMs a visitor first landed with ride along
// into checkout (Stripe session metadata / OpenNode charge metadata) and end up
// on their Airtable purchase row.

export const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign"] as const;

export type Utm = Partial<Record<(typeof UTM_KEYS)[number], string>>;

const STORAGE_KEY = "first-touch-utm";
const MAX_LEN = 200;

/** The UTM values `get` returns, trimmed and capped; blanks and non-strings dropped. */
export function pickUtm(get: (key: string) => unknown): Utm {
  const utm: Utm = {};
  for (const key of UTM_KEYS) {
    const value = get(key);
    if (typeof value === "string" && value.trim()) {
      utm[key] = value.trim().slice(0, MAX_LEN);
    }
  }
  return utm;
}

/** Store the landing URL's UTMs, unless an earlier visit already did. */
export function captureFirstTouchUtm(search: string): void {
  try {
    if (localStorage.getItem(STORAGE_KEY)) return;
    const params = new URLSearchParams(search);
    const utm = pickUtm((key) => params.get(key));
    if (Object.keys(utm).length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(utm));
    }
  } catch {
    // Storage blocked — attribution is best-effort.
  }
}

export function readFirstTouchUtm(): Utm {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    return pickUtm((key) => stored?.[key]);
  } catch {
    return {};
  }
}

/** `href` with the stored first-touch UTMs set as query params. Client-only. */
export function withFirstTouchUtm(href: string): string {
  const url = new URL(href, window.location.origin);
  for (const [key, value] of Object.entries(readFirstTouchUtm())) {
    url.searchParams.set(key, value);
  }
  return url.pathname + url.search;
}
