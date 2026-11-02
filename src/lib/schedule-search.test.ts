import { describe, expect, it } from "vitest";
import { searchSessions, type SearchableSession } from "./schedule-search";

const s = (
  id: string,
  title: string,
  hosts: string[],
  startsAt: string | null = "2026-11-07T18:00:00.000Z",
): SearchableSession => ({
  id,
  title,
  hosts: hosts.map((name) => ({ name })),
  startsAt,
});

const sessions = [
  s("a", "Opening Ceremony", ["Ricki Heicklen"], "2026-11-06T18:00:00.000Z"),
  s("b", "Ceremony of the Dice", ["José Ortiz"], "2026-11-08T18:00:00.000Z"),
  s("c", "Poker Theory", ["Ricki Heicklen", "Ben West"]),
  s("d", "Unplaced Draft", ["Ben West"], null),
];

describe("searchSessions", () => {
  it("returns nothing for a blank query", () => {
    expect(searchSessions(sessions, "")).toEqual([]);
    expect(searchSessions(sessions, "   ")).toEqual([]);
  });

  it("matches titles, prefix matches first, then by start time", () => {
    const ids = searchSessions(sessions, "ceremony").map((h) => h.session.id);
    expect(ids).toEqual(["b", "a"]);
  });

  it("matches hosts and says so", () => {
    const hits = searchSessions(sessions, "ricki");
    expect(hits.map((h) => h.session.id)).toEqual(["a", "c"]);
    expect(hits.every((h) => h.via === "host")).toBe(true);
  });

  it("needs every word, in any order, across title and hosts", () => {
    expect(
      searchSessions(sessions, "west poker").map((h) => h.session.id),
    ).toEqual(["c"]);
    expect(searchSessions(sessions, "west dice")).toEqual([]);
  });

  it("ignores case and accents", () => {
    expect(searchSessions(sessions, "JOSE").map((h) => h.session.id)).toEqual([
      "b",
    ]);
  });

  it("puts unplaced sessions last and honours the limit", () => {
    expect(searchSessions(sessions, "ben").map((h) => h.session.id)).toEqual([
      "c",
      "d",
    ]);
    expect(searchSessions(sessions, "ben", 1).map((h) => h.session.id)).toEqual(
      ["c"],
    );
  });
});
