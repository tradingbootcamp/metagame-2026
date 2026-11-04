import { beforeEach, describe, expect, it, vi } from "vitest";

const { mocks, store, order } = vi.hoisted(() => {
  const order: string[] = [];
  const store = {
    loadMegagameLevels: vi.fn(async () => ({ wizard: 0, pirate: 0, alien: 0 })),
    setMegagameLevels: vi.fn(async () => {
      order.push("set");
    }),
    recordPickerJoin: vi.fn(async () => {
      order.push("event");
    }),
    hasVolunteerLevelEvent: vi.fn(async () => false),
  };
  const mocks = {
    liveSession: vi.fn(),
    currentSession: vi.fn(),
    borrowTokens: vi.fn(),
  };
  return { mocks, store, order };
});

vi.mock("@/lib/megagame-store", () => store);
vi.mock("@/lib/access", () => ({ liveSession: mocks.liveSession }));
vi.mock("@/lib/auth", () => ({
  currentSession: mocks.currentSession,
  getAuth: vi.fn(),
  hasPassword: vi.fn(),
}));
vi.mock("@/db", () => ({ getDb: vi.fn(), schema: {} }));
vi.mock("@/lib/blob", () => ({ deleteImage: vi.fn(), uploadImage: vi.fn() }));
vi.mock("@/lib/site-settings", () => ({
  loadOverrides: async () => ({
    tab: { override: true },
    loans: { override: true },
  }),
}));
vi.mock("@/lib/ticket-store", () => ({ hasClaimedTicket: async () => true }));
vi.mock("@/lib/token-store", () => ({
  borrowTokens: mocks.borrowTokens,
  loadBalance: async () => ({ tokens: 0, loanTokens: 0 }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/schedule-store", () => ({ invalidateSchedule: vi.fn() }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/v2/data/speakers", () => ({ isSpeakerAccount: vi.fn(() => false) }));

import { chooseMegagameClass, takeLoan } from "./actions";

const pick = (cls: string) => {
  const form = new FormData();
  form.set("class", cls);
  return chooseMegagameClass({}, form);
};

describe("chooseMegagameClass", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    order.length = 0;
    mocks.currentSession.mockResolvedValue({ user: { id: "u1" } });
  });

  it("writes the picker event before setting the levels", async () => {
    expect(await pick("pirate")).toEqual({});
    expect(store.recordPickerJoin).toHaveBeenCalledWith("u1", "pirate");
    expect(store.setMegagameLevels).toHaveBeenCalledWith("u1", {
      wizard: 0,
      pirate: 1,
      alien: 0,
    });
    expect(order).toEqual(["event", "set"]);
  });

  it("writes nothing when the player is already in that class", async () => {
    store.loadMegagameLevels.mockResolvedValueOnce({
      wizard: 0,
      pirate: 2,
      alien: 0,
    });
    await pick("pirate");
    expect(store.recordPickerJoin).not.toHaveBeenCalled();
    expect(store.setMegagameLevels).not.toHaveBeenCalled();
  });

  it("refuses an unknown class without writing", async () => {
    expect(await pick("sorcerer")).toEqual({ error: "Pick a class." });
    expect(store.recordPickerJoin).not.toHaveBeenCalled();
  });

  it("refuses once a volunteer has recorded a level, without writing", async () => {
    store.hasVolunteerLevelEvent.mockResolvedValueOnce(true);
    const result = await pick("alien");
    expect(result.error).toBeTruthy();
    expect(store.hasVolunteerLevelEvent).toHaveBeenCalledWith("u1");
    expect(store.recordPickerJoin).not.toHaveBeenCalled();
    expect(store.setMegagameLevels).not.toHaveBeenCalled();
  });

  it("refuses to reset a level above 1, which the picker never set", async () => {
    store.loadMegagameLevels.mockResolvedValueOnce({
      wizard: 2,
      pirate: 0,
      alien: 0,
    });
    const result = await pick("alien");
    expect(result.error).toBeTruthy();
    expect(store.recordPickerJoin).not.toHaveBeenCalled();
    expect(store.setMegagameLevels).not.toHaveBeenCalled();
  });

  it("still lets a player with only picker rows switch class", async () => {
    store.loadMegagameLevels.mockResolvedValueOnce({
      wizard: 1,
      pirate: 0,
      alien: 0,
    });
    expect(await pick("alien")).toEqual({});
    expect(store.recordPickerJoin).toHaveBeenCalledWith("u1", "alien");
    expect(store.setMegagameLevels).toHaveBeenCalledWith("u1", {
      wizard: 0,
      pirate: 0,
      alien: 1,
    });
  });
});

describe("takeLoan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.borrowTokens.mockResolvedValue(true);
    // What a still-valid cookie cache would say after the ban.
    mocks.currentSession.mockResolvedValue({ user: { id: "u" } });
  });

  it("refuses a session the database no longer honors, whatever the cookie says", async () => {
    mocks.liveSession.mockResolvedValue(null);
    await expect(takeLoan(1)).resolves.toEqual({
      error: expect.stringMatching(/session expired/i),
    });
    expect(mocks.borrowTokens).not.toHaveBeenCalled();
  });

  it("lends to a live session without any team permission", async () => {
    mocks.liveSession.mockResolvedValue({ user: { id: "u" } });
    await expect(takeLoan(1)).resolves.toEqual({});
    expect(mocks.borrowTokens).toHaveBeenCalledWith("u", 1, expect.any(Number));
  });
});
