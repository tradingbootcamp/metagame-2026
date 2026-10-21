import { describe, expect, it, vi } from "vitest";
import {
  randomTicketCode,
  ticketCode,
  withFreshTicketCode,
} from "./ticket-code";

const unique = () =>
  Object.assign(new Error("duplicate key"), { code: "23505" });

describe("randomTicketCode", () => {
  it("draws 6 characters from the code alphabet", () => {
    for (let i = 0; i < 200; i++) {
      expect(randomTicketCode()).toMatch(/^[0-9A-HJKMNP-TV-Z]{6}$/);
    }
  });

  it("isn't the derived code", () => {
    const codes = new Set(Array.from({ length: 50 }, randomTicketCode));
    expect(codes.size).toBeGreaterThan(45);
    expect(codes.has(ticketCode("pi_123"))).toBe(false);
  });
});

describe("withFreshTicketCode", () => {
  it("retries with a new code when the code is taken", async () => {
    const codes = ["AAAAAA", "BBBBBB"];
    const write = vi
      .fn()
      .mockRejectedValueOnce(unique())
      .mockImplementation(async (code: string) => code);
    await expect(
      withFreshTicketCode(write, () => codes.shift()!),
    ).resolves.toBe("BBBBBB");
    expect(write.mock.calls).toEqual([["AAAAAA"], ["BBBBBB"]]);
  });

  it("sees a unique violation wrapped in a cause", async () => {
    const write = vi
      .fn()
      .mockRejectedValueOnce(new Error("query failed", { cause: unique() }))
      .mockResolvedValue("ok");
    await expect(withFreshTicketCode(write)).resolves.toBe("ok");
  });

  it("rethrows other errors at once", async () => {
    const write = vi.fn().mockRejectedValue(new Error("boom"));
    await expect(withFreshTicketCode(write)).rejects.toThrow("boom");
    expect(write).toHaveBeenCalledTimes(1);
  });

  it("gives up after the last attempt", async () => {
    const write = vi.fn().mockRejectedValue(unique());
    await expect(withFreshTicketCode(write, undefined, 3)).rejects.toThrow(
      "duplicate key",
    );
    expect(write).toHaveBeenCalledTimes(3);
  });
});
