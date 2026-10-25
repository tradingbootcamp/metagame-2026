import { beforeEach, expect, it, vi } from "vitest";
vi.mock("./admin-auth", () => ({ requireAccess: vi.fn() }));
import { requireAccess } from "./admin-auth";
import { posterDiscountAccess } from "./poster-discount-access";
beforeEach(() => vi.resetAllMocks());
it("requires both existing permissions", async () => {
  vi.mocked(requireAccess).mockResolvedValue({
    via: "password",
    name: "Staff",
  });
  expect(await posterDiscountAccess()).toMatchObject({ name: "Staff" });
  expect(vi.mocked(requireAccess).mock.calls).toEqual([
    ["links.manage"],
    ["promo.manage"],
  ]);
});
it.each(["links.manage", "promo.manage"])(
  "rejects missing %s",
  async (missing) => {
    vi.mocked(requireAccess).mockImplementation(async (permission) =>
      permission === missing ? null : { via: "password", name: "Staff" },
    );
    expect(await posterDiscountAccess()).toBeNull();
  },
);
