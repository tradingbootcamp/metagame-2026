import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  user: {} as Record<string, unknown>,
  unclaim: vi.fn(),
  hasClaimed: vi.fn(),
  release: vi.fn(),
  report: vi.fn(),
}));
vi.mock("@/db", () => ({ getDb: vi.fn(), schema: {} }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/headers", () => ({ headers: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("better-auth/api", () => ({ APIError: class {} }));
vi.mock("@/lib/auth", () => ({
  currentSession: async () => ({ user: h.user }),
  getAuth: vi.fn(),
  hasPassword: vi.fn(),
}));
vi.mock("@/lib/blob", () => ({}));
vi.mock("@/lib/megagame-store", () => ({}));
vi.mock("@/lib/error-report", () => ({ reportError: h.report }));
vi.mock("@/lib/schedule-store", () => ({
  invalidateSchedule: vi.fn(),
  releaseUpcomingSeats: h.release,
}));
vi.mock("@/lib/ticket-store", () => ({
  hasClaimedTicket: h.hasClaimed,
  normalizeTicketCode: (c: string) => c,
  ticketLabel: () => "Standard",
  unclaimTicket: h.unclaim,
}));
vi.mock("@/v2/data/speakers", () => ({ isSpeakerAccount: () => false }));

import { unclaimMine } from "./actions";

beforeEach(() => {
  h.user = { id: "me", email: "me@example.com", role: "user" };
  h.unclaim.mockReset();
  h.unclaim.mockResolvedValue({ tier: "standard" });
  h.hasClaimed.mockReset();
  h.hasClaimed.mockResolvedValue(false);
  h.release.mockReset();
  h.release.mockResolvedValue(undefined);
  h.report.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("giving up a ticket", () => {
  it("releases the seats when it was their only ticket", async () => {
    await expect(unclaimMine("pi_1")).resolves.toEqual({
      released: "Standard",
    });
    expect(h.release).toHaveBeenCalledExactlyOnceWith("me", "me@example.com");
  });

  it("looks for another ticket only after this one is gone", async () => {
    await unclaimMine("pi_1");
    expect(h.unclaim.mock.invocationCallOrder[0]).toBeLessThan(
      h.hasClaimed.mock.invocationCallOrder[0],
    );
  });

  it("keeps the seats while they hold another valid ticket", async () => {
    h.hasClaimed.mockResolvedValue(true);
    await unclaimMine("pi_1");
    expect(h.release).not.toHaveBeenCalled();
  });

  it("keeps an admin's seats, since admins RSVP without a ticket", async () => {
    h.user = { ...h.user, role: "admin" };
    await unclaimMine("pi_1");
    expect(h.release).not.toHaveBeenCalled();
  });

  it("touches nothing when the ticket wasn't theirs to give up", async () => {
    h.unclaim.mockResolvedValue(null);
    await expect(unclaimMine("pi_1")).resolves.toEqual({
      error: "That ticket isn't claimed by you.",
    });
    expect(h.release).not.toHaveBeenCalled();
  });

  it("still reports the give-up when releasing fails, and tells the team", async () => {
    h.release.mockRejectedValue(new Error("db down"));
    await expect(unclaimMine("pi_1")).resolves.toEqual({
      released: "Standard",
    });
    expect(h.report).toHaveBeenCalledOnce();
  });
});
