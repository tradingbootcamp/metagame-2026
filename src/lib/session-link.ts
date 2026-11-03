// A session opens as a modal over whatever page links to it, by adding
// ?session=<slug> to that page's URL; /schedule/<slug> stays the session's
// own, shareable page.

export const SESSION_PARAM = "session";

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

/** The current URL with the session modal closed. */
export function closeSessionHref(pathname: string, search: string): string {
  const params = new URLSearchParams(search);
  params.delete(SESSION_PARAM);
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}
