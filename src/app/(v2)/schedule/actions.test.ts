import { beforeEach, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  session: { user: { id: "u1", role: "admin", banned: false } } as unknown,
  setBookmark: vi.fn(),
  getDb: vi.fn(),
  allowed: vi.fn(async (): Promise<boolean> => true),
  rsvp: vi.fn(),
  cancelRsvp: vi.fn(),
}));
vi.mock("@/db", () => ({
  getDb: h.getDb,
  schema: { sessions: { id: "id", status: "status", rsvpsOpen: "open" } },
}));
vi.mock("@/lib/auth", () => ({ currentSession: async () => h.session }));
vi.mock("@/lib/schedule-store", () => ({
  cancelRsvp: h.cancelRsvp,
  constraintMessage: (err: { constraint?: string }) =>
    err.constraint ? { error: "A message for people." } : null,
  loadSessionRsvps: vi.fn(),
  rsvp: h.rsvp,
  setBookmark: h.setBookmark,
}));
vi.mock("./data", () => ({
  attendeeActionsAllowed: h.allowed,
  rsvpTicket: vi.fn(),
}));

import { bookmark, rsvpTo, unRsvp } from "./actions";

const ID = "6f1c2a0e-3d4b-4c5d-8e9f-0a1b2c3d4e5f";

beforeEach(() => {
  vi.clearAllMocks();
  h.session = { user: { id: "u1", role: "admin", banned: false } };
  h.allowed.mockResolvedValue(true);
});

it("logs a database failure and doesn't relay it", async () => {
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  const failure = new Error('Failed query: insert into "bookmarks" params: x');
  h.setBookmark.mockRejectedValueOnce(failure);
  const result = await bookmark(ID, true);
  expect(result).toEqual({ error: "That didn't save. Try again." });
  expect(log).toHaveBeenCalledWith(expect.any(String), failure);
});

it("passes on a constraint's message, which is written for people", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  h.setBookmark.mockRejectedValueOnce(
    Object.assign(new Error("raw"), { constraint: "c" }),
  );
  expect(await bookmark(ID, true)).toEqual({ error: "A message for people." });
});

it("catches a failure reading the session too", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  h.session = { user: { id: "u1", role: "user", banned: false } };
  h.getDb.mockImplementationOnce(() => {
    throw new Error("connection refused at 10.0.0.1");
  });
  expect(await bookmark(ID, true)).toEqual({
    error: "That didn't save. Try again.",
  });
});

it("answers a malformed id without reaching the database", async () => {
  expect(await bookmark("not-a-uuid", true)).toEqual({
    error: "No such session.",
  });
  expect(h.setBookmark).not.toHaveBeenCalled();
});

it("still works when nothing goes wrong", async () => {
  expect(await bookmark(ID, true)).toEqual({ bookmarked: true });
});

it("refuses every attendee action while they're closed", async () => {
  h.allowed.mockResolvedValue(false);
  const closed = { error: expect.stringContaining("closed") };
  expect(await rsvpTo(ID)).toEqual(closed);
  expect(await unRsvp(ID)).toEqual(closed);
  expect(await bookmark(ID, true)).toEqual(closed);
  expect(h.getDb).not.toHaveBeenCalled();
  expect(h.rsvp).not.toHaveBeenCalled();
  expect(h.cancelRsvp).not.toHaveBeenCalled();
  expect(h.setBookmark).not.toHaveBeenCalled();
});
