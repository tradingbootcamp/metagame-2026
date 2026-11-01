import { beforeEach, describe, expect, it, vi } from "vitest";

const { store, tickets } = vi.hoisted(() => ({
  store: { playersByIds: vi.fn(), liveCompletions: vi.fn() },
  tickets: { claimedCounts: vi.fn() },
}));
vi.mock("@/lib/megagame-store", () => store);
vi.mock("@/lib/ticket-store", () => tickets);

import { loadPlayerRows } from "./data";

const player = (id: string, wizard = 1) => ({
  id,
  name: id.toUpperCase(),
  pronouns: null,
  imageUrl: null,
  levels: { wizard, pirate: 0, alien: 0 },
  code: null,
});

beforeEach(() => {
  vi.clearAllMocks();
  store.playersByIds.mockResolvedValue([player("u1"), player("u2", 0)]);
  store.liveCompletions.mockResolvedValue([]);
  tickets.claimedCounts.mockResolvedValue(new Map([["u1", 1]]));
});

describe("loadPlayerRows", () => {
  it("without a quest, warns only about a missing ticket", async () => {
    const rows = await loadPlayerRows(["u1", "u2"], null);
    expect(rows.map((r) => [r.player.id, r.status])).toEqual([
      ["u1", { kind: "ok", warnings: [] }],
      ["u2", { kind: "ok", warnings: ["No claimed ticket."] }],
    ]);
    expect(store.liveCompletions).not.toHaveBeenCalled();
  });

  it("with a quest, blocks a live completion and says when and by whom", async () => {
    const at = new Date("2026-11-07T18:00:00Z");
    store.liveCompletions.mockResolvedValue([
      {
        id: "k1",
        userId: "u1",
        confirmationId: "c1",
        confirmedAt: at,
        confirmedByName: "Vol",
      },
    ]);
    const quest = { id: "q1", class: "wizard", minLevel: null, maxLevel: null };
    const rows = await loadPlayerRows(["u1", "u2"], quest);
    expect(store.liveCompletions).toHaveBeenCalledWith("q1", ["u1", "u2"]);
    expect(rows[0].status).toEqual({ kind: "completed" });
    expect(rows[0].completion).toEqual({ at, by: "Vol" });
    expect(rows[1].status).toEqual({
      kind: "ok",
      warnings: ["Not a wizard yet.", "No claimed ticket."],
    });
  });

  it("skips every query for an empty list", async () => {
    expect(await loadPlayerRows([], null)).toEqual([]);
    expect(store.playersByIds).not.toHaveBeenCalled();
  });
});
