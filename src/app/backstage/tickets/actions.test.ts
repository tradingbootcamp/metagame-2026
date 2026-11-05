import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAccess: vi.fn(),
  voidTicket: vi.fn(),
  unvoidTicket: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/admin-auth", () => ({
  EXPIRED: "Your session expired. Reload.",
  requireAccess: mocks.requireAccess,
}));
vi.mock("@/lib/ticket-void", () => ({
  voidTicket: mocks.voidTicket,
  unvoidTicket: mocks.unvoidTicket,
}));

import { setTicketVoided } from "./actions";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireAccess.mockResolvedValue({ name: "Libi", userId: "u" });
  mocks.voidTicket.mockResolvedValue(true);
  mocks.unvoidTicket.mockResolvedValue(true);
});

it("needs tickets.void for both directions", async () => {
  mocks.requireAccess.mockResolvedValue(null);
  for (const next of [true, false])
    expect(await setTicketVoided("pi_1", next)).toEqual({
      error: "Your session expired. Reload.",
    });
  expect(mocks.requireAccess).toHaveBeenCalledWith("tickets.void");
  expect(mocks.voidTicket).not.toHaveBeenCalled();
  expect(mocks.unvoidTicket).not.toHaveBeenCalled();
});

it("voids and undoes as the signed-in account", async () => {
  expect(await setTicketVoided("pi_1:ticket:2", true)).toEqual({});
  expect(mocks.voidTicket).toHaveBeenCalledWith("pi_1:ticket:2", "Libi");
  expect(await setTicketVoided("pi_1:ticket:2", false)).toEqual({});
  expect(mocks.unvoidTicket).toHaveBeenCalledWith("pi_1:ticket:2", "Libi");
});

it("rejects a forged id", async () => {
  expect(await setTicketVoided({ id: 1 }, true)).toEqual({
    error: "No such ticket.",
  });
  expect(mocks.voidTicket).not.toHaveBeenCalled();
});

it("reports when nothing changed", async () => {
  mocks.voidTicket.mockResolvedValue(false);
  mocks.unvoidTicket.mockResolvedValue(false);
  for (const next of [true, false])
    expect((await setTicketVoided("pi_1", next)).error).toMatch(
      /nothing changed/i,
    );
});

it("reports a failed write", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  mocks.voidTicket.mockRejectedValue(new Error("db down"));
  expect(await setTicketVoided("pi_1", true)).toEqual({
    error: "That didn't save. Try again.",
  });
});
