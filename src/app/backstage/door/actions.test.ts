import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAccess: vi.fn(),
  doorLookup: vi.fn(),
}));
vi.mock("@/lib/admin-auth", () => ({
  EXPIRED: "Your session expired. Reload.",
  requireAccess: mocks.requireAccess,
}));
vi.mock("@/lib/door-lookup", () => ({ doorLookup: mocks.doorLookup }));

import { lookUpTicket } from "./actions";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.doorLookup.mockResolvedValue({ tickets: [], more: false });
});

it("refuses anyone without checkin.view before looking anything up", async () => {
  mocks.requireAccess.mockResolvedValue(null);
  expect(await lookUpTicket("A2C4EF")).toEqual({
    error: "Your session expired. Reload.",
  });
  expect(mocks.requireAccess).toHaveBeenCalledWith("checkin.view");
  expect(mocks.doorLookup).not.toHaveBeenCalled();
});

it("looks up for someone holding it", async () => {
  mocks.requireAccess.mockResolvedValue({ name: "Vol", userId: "v" });
  expect(await lookUpTicket("A2C4EF")).toEqual({ tickets: [], more: false });
  expect(mocks.doorLookup).toHaveBeenCalledWith("A2C4EF");
});

it("treats a forged non-string as an empty search", async () => {
  mocks.requireAccess.mockResolvedValue({ name: "Vol", userId: "v" });
  await lookUpTicket({ like: "%" });
  expect(mocks.doorLookup).toHaveBeenCalledWith("");
});

it("reports a database failure without its message", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  mocks.requireAccess.mockResolvedValue({ name: "Vol", userId: "v" });
  mocks.doorLookup.mockRejectedValue(new Error("select * from tickets"));
  expect(await lookUpTicket("A2C4EF")).toEqual({
    error: "The lookup failed. Try again.",
  });
});
