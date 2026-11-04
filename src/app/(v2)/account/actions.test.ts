import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  liveSession: vi.fn(),
  currentSession: vi.fn(),
  borrowTokens: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/db", () => ({ getDb: vi.fn(), schema: {} }));
vi.mock("@/lib/access", () => ({ liveSession: mocks.liveSession }));
vi.mock("@/lib/auth", () => ({
  currentSession: mocks.currentSession,
  getAuth: vi.fn(),
  hasPassword: vi.fn(),
}));
vi.mock("@/lib/blob", () => ({}));
vi.mock("@/lib/megagame-store", () => ({
  loadMegagameLevels: async () => ({ wizard: 0, pirate: 0, alien: 0 }),
  setMegagameLevels: vi.fn(),
}));
vi.mock("@/lib/schedule-store", () => ({ invalidateSchedule: vi.fn() }));
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
vi.mock("@/v2/data/speakers", () => ({ isSpeakerAccount: vi.fn() }));

import { takeLoan } from "./actions";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.borrowTokens.mockResolvedValue(true);
  // What a still-valid cookie cache would say after the ban.
  mocks.currentSession.mockResolvedValue({ user: { id: "u" } });
});

describe("takeLoan", () => {
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
