import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  holdersOf: vi.fn(),
  rows: [] as { name: string }[],
}));

vi.mock("@/db", () => ({
  getDb: () => ({
    select: () => ({
      from: () => ({ where: async () => mocks.rows }),
    }),
  }),
  schema: { user: {}, tokenLedger: {} },
}));
vi.mock("./permission-store", () => ({ holdersOf: mocks.holdersOf }));

import { listTokenVolunteers } from "./token-store";

describe("listTokenVolunteers", () => {
  it("skips blank names and sorts the rest", async () => {
    mocks.holdersOf.mockResolvedValue(["a", "b", "c", "d"]);
    mocks.rows = [
      { name: "Zed" },
      { name: "" },
      { name: "   " },
      { name: " Ann " },
    ];
    await expect(listTokenVolunteers()).resolves.toEqual(["Ann", "Zed"]);
  });
});
