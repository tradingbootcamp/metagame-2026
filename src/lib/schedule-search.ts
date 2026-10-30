// Matching for the schedule search box, pure so both schedules share it and
// it can be tested without a browser.

export type SearchableSession = {
  id: string;
  title: string;
  hosts: { name: string }[];
  /** ISO, or null for an unplaced draft (backstage only). */
  startsAt: string | null;
};

export type SearchHit<S extends SearchableSession> = {
  session: S;
  /** Which part matched, so the row can say "host: …" when the title didn't. */
  via: "title" | "host";
};

/** Lowercase, accents stripped, so "Jose" finds "José" and vice versa. */
export const fold = (s: string): string =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

const tokens = (q: string): string[] => fold(q).split(/\s+/).filter(Boolean);

/**
 * Sessions whose title or a host's name contains every word of the query, in
 * any order. Title matches rank above host-only ones, titles that start with
 * the query above those that merely contain it, then earliest first with
 * unplaced drafts last. Empty query: no hits.
 */
export function searchSessions<S extends SearchableSession>(
  sessions: readonly S[],
  query: string,
  limit = 8,
): SearchHit<S>[] {
  const words = tokens(query);
  if (words.length === 0) return [];
  const whole = words.join(" ");

  const scored: { hit: SearchHit<S>; rank: number }[] = [];
  for (const session of sessions) {
    const title = fold(session.title);
    const hosts = session.hosts.map((h) => fold(h.name));
    const inTitle = words.every((w) => title.includes(w));
    const inHosts = words.every(
      (w) => hosts.some((h) => h.includes(w)) || title.includes(w),
    );
    if (!inTitle && !inHosts) continue;
    const rank = inTitle ? (title.startsWith(whole) ? 0 : 1) : 2;
    scored.push({ hit: { session, via: inTitle ? "title" : "host" }, rank });
  }

  scored.sort(
    (a, b) =>
      a.rank - b.rank ||
      byStart(a.hit.session.startsAt, b.hit.session.startsAt) ||
      a.hit.session.title.localeCompare(b.hit.session.title),
  );
  return scored.slice(0, limit).map((s) => s.hit);
}

const byStart = (a: string | null, b: string | null): number => {
  if (a === b) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return a.localeCompare(b);
};
