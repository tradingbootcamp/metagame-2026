// A session opens as a modal over whatever page links to it, by adding
// ?session=<slug> to that page's URL; /schedule/<slug> stays the session's
// own, shareable page.

export const SESSION_PARAM = "session";
export const SESSION_TITLE_ID = "session-title";

/** The slug of the session page `pathname` is, /schedule/<slug>, or null. */
export function sessionPageSlug(pathname: string): string | null {
  const match = /^\/schedule\/([^/]+)$/.exec(pathname);
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * `pathname` with the session modal open; `search` is the page's current
 * query string, kept. Links on a session's own page open over /schedule.
 */
export function openSessionHref(
  pathname: string,
  slug: string,
  search = "",
): string {
  const params = new URLSearchParams(search);
  params.set(SESSION_PARAM, slug);
  const page = sessionPageSlug(pathname) ? "/schedule" : pathname;
  return `${page}?${params}`;
}

/** Whether `href` is the page at `current` (any query), so the URL can be
 *  rewritten in place instead of routed. */
export function samePage(href: string, current: string): boolean {
  return new URL(href, current).pathname === new URL(current).pathname;
}

/** The current URL with the session modal closed. */
export function closeSessionHref(pathname: string, search: string): string {
  const params = new URLSearchParams(search);
  params.delete(SESSION_PARAM);
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}
