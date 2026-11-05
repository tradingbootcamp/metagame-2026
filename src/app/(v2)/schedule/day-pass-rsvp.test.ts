import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeNeon } from "@/test/fake-neon";

const h = vi.hoisted(() => ({
  db: null as unknown,
  user: {} as Record<string, unknown>,
  tickets: [] as unknown[],
  rsvp: vi.fn(),
  cancel: vi.fn(),
  rsvpTicket: vi.fn(),
}));
vi.mock("@/db", async () => ({
  getDb: () => h.db,
  schema: await vi.importActual("@/db/schema"),
}));
vi.mock("@/lib/auth", () => ({
  currentSession: async () => ({ user: h.user }),
}));
vi.mock("@/lib/schedule-store", () => ({
  rsvp: h.rsvp,
  cancelRsvp: h.cancel,
  loadSessionRsvps: async () => ({ going: [], waitlist: [] }),
  setBookmark: vi.fn(),
}));
vi.mock("@/lib/ticket-store", () => ({
  ticketsForUser: async () => h.tickets,
}));
vi.mock("./data", () => ({ rsvpTicket: h.rsvpTicket }));

import { rsvpTo } from "./actions";

const SESSION = "11111111-1111-4111-8111-111111111111";
const SATURDAY = "2026-11-07T20:00:00.000Z";

const fridayPass = {
  status: "paid",
  tier: "Friday Day Pass",
  ownerUserId: "me",
  holderUserId: null,
  purchaserEmail: "me@example.com",
};

function sessionRow(startsAt: string | null, guests: string[] | null = null) {
  h.db = fakeNeon((s) => {
    if (s.sql.includes('"rsvps_open"')) return [[true, guests, startsAt]];
    if (s.sql.includes('"status"')) return [["published"]];
  }).db;
}

beforeEach(() => {
  h.user = { id: "me", email: "me@example.com", role: "user" };
  h.tickets = [fridayPass];
  h.rsvp.mockReset();
  h.rsvp.mockResolvedValue("going");
  h.cancel.mockReset();
  h.rsvpTicket.mockReset();
  h.rsvpTicket.mockResolvedValue({ has: true, claimable: [] });
});

describe("rsvpTo with a day pass", () => {
  it("refuses a session on a day the pass doesn't cover", async () => {
    sessionRow(SATURDAY);
    const result = await rsvpTo(SESSION);
    expect(result.error).toContain("Friday, November 6, 2026");
    expect(result.error).toContain("Sat, Nov 7");
    expect(h.rsvp).not.toHaveBeenCalled();
  });

  it("leaves an RSVP they already have alone", async () => {
    sessionRow(SATURDAY);
    await rsvpTo(SESSION);
    expect(h.cancel).not.toHaveBeenCalled();
  });

  it("seats them on their own day", async () => {
    sessionRow("2026-11-06T20:00:00.000Z");
    await expect(rsvpTo(SESSION)).resolves.toMatchObject({ status: "going" });
    expect(h.rsvp).toHaveBeenCalledOnce();
  });

  it("doesn't touch a weekend ticket", async () => {
    h.tickets = [{ ...fridayPass, tier: "Standard" }];
    sessionRow(SATURDAY);
    await expect(rsvpTo(SESSION)).resolves.toMatchObject({ status: "going" });
  });

  it("lets admins through, as the ticket check does", async () => {
    h.user = { ...h.user, role: "admin" };
    sessionRow(SATURDAY);
    await expect(rsvpTo(SESSION)).resolves.toMatchObject({ status: "going" });
  });

  it("the guest list outranks the pass", async () => {
    sessionRow(SATURDAY, ["me@example.com"]);
    await expect(rsvpTo(SESSION)).resolves.toMatchObject({ status: "going" });
  });

  it("no ticket at all still gets the ticket prompt", async () => {
    h.rsvpTicket.mockResolvedValue({ has: false, claimable: [] });
    h.tickets = [];
    sessionRow(SATURDAY);
    await expect(rsvpTo(SESSION)).resolves.toMatchObject({
      error: "You need a ticket to RSVP.",
    });
  });
});
