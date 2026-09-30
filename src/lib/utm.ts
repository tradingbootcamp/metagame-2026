import posthog from "posthog-js";

// First-touch attribution: the UTMs a visitor first landed with, when they
// first visited, and their PostHog id ride along into checkout (Stripe session
// metadata / OpenNode charge metadata) and end up on their Airtable purchase row.

const LANDING_KEYS = ["utm_source", "utm_medium", "utm_campaign"] as const;
export const UTM_KEYS = [...LANDING_KEYS, "first_visit", "posthog_id"] as const;

export type Utm = Partial<Record<(typeof UTM_KEYS)[number], string>>;

const STORAGE_KEY = "first-touch-utm";
const FIRST_VISIT_KEY = "first-visit";
const MAX_LEN = 200;

/** The UTM values `get` returns, trimmed and capped; blanks and non-strings dropped. */
export function pickUtm(
  get: (key: string) => unknown,
  keys: readonly (keyof Utm)[] = UTM_KEYS,
): Utm {
  const utm: Utm = {};
  for (const key of keys) {
    const value = get(key);
    if (typeof value === "string" && value.trim()) {
      utm[key] = value.trim().slice(0, MAX_LEN);
    }
  }
  // Client-supplied, and Airtable rejects the whole row on a bad date.
  if (utm.first_visit) {
    const date = new Date(utm.first_visit);
    if (isNaN(date.getTime())) delete utm.first_visit;
    else utm.first_visit = date.toISOString();
  }
  return utm;
}

/** Store the landing URL's UTMs and the visit time, unless an earlier visit already did. */
export function captureFirstTouchUtm(search: string): void {
  try {
    if (!localStorage.getItem(FIRST_VISIT_KEY)) {
      localStorage.setItem(FIRST_VISIT_KEY, new Date().toISOString());
    }
    if (localStorage.getItem(STORAGE_KEY)) return;
    const params = new URLSearchParams(search);
    const utm = pickUtm((key) => params.get(key), LANDING_KEYS);
    if (Object.keys(utm).length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(utm));
    }
  } catch {
    // Storage blocked — attribution is best-effort.
  }
}

/**
 * Drop utm_* from the address bar once they've been read. PostHog captured them
 * at init, and in history_change mode it only re-fires a pageview when the
 * pathname changes, so a query-only replaceState is silent.
 */
export function stripUtmFromUrl(): void {
  const url = new URL(window.location.href);
  const had = [...url.searchParams.keys()].filter((k) => k.startsWith("utm_"));
  if (had.length === 0) return;
  for (const k of had) url.searchParams.delete(k);
  window.history.replaceState(window.history.state, "", url);
}

export function readFirstTouchUtm(): Utm {
  let stored: Record<string, unknown> = {};
  let firstVisit: string | null = null;
  try {
    stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") ?? {};
    firstVisit = localStorage.getItem(FIRST_VISIT_KEY);
  } catch {}
  let posthogId: string | undefined;
  try {
    // Only set when PostHog initialized (NEXT_PUBLIC_POSTHOG_KEY present).
    if (posthog.__loaded) posthogId = posthog.get_distinct_id();
  } catch {}
  return pickUtm(
    (key) =>
      ({ first_visit: firstVisit, posthog_id: posthogId })[key] ?? stored[key],
  );
}

/** `href` with the stored first-touch UTMs set as query params. Client-only. */
export function withFirstTouchUtm(href: string): string {
  const url = new URL(href, window.location.origin);
  for (const [key, value] of Object.entries(readFirstTouchUtm())) {
    url.searchParams.set(key, value);
  }
  return url.pathname + url.search;
}
