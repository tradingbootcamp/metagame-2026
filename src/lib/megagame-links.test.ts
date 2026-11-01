import { beforeEach, describe, expect, it, vi } from "vitest";

const { auth, access, store } = vi.hoisted(() => ({
  auth: { currentSession: vi.fn() },
  access: { can: vi.fn() },
  store: { findPlayerByCode: vi.fn() },
}));
vi.mock("@/lib/auth", () => auth);
vi.mock("@/lib/access", () => access);
vi.mock("@/lib/megagame-store", () => store);

import { playerLinkTarget, questLinkTarget } from "./megagame-links";

const session = { user: { id: "u1" } };

beforeEach(() => {
  vi.clearAllMocks();
  auth.currentSession.mockResolvedValue(null);
  access.can.mockResolvedValue(null);
  store.findPlayerByCode.mockResolvedValue(null);
});

describe("questLinkTarget", () => {
  it("sends a volunteer to the quest page in the tool, code normalized", async () => {
    auth.currentSession.mockResolvedValue(session);
    access.can.mockResolvedValue(session);
    expect(await questLinkTarget("a2c-4ef")).toBe(
      "/backstage/megagame/q/A2C4EF",
    );
    expect(access.can).toHaveBeenCalledWith("megagame.verify");
  });

  it("sends a signed-out viewer to sign in and come back", async () => {
    expect(await questLinkTarget("A2C4EF")).toBe("/login?next=%2Fq%2FA2C4EF");
  });

  it("sends a signed-in viewer without the permission to their account", async () => {
    auth.currentSession.mockResolvedValue(session);
    expect(await questLinkTarget("A2C4EF")).toBe("/account");
  });
});

describe("playerLinkTarget", () => {
  it("sends a volunteer to the tool with the player added", async () => {
    access.can.mockResolvedValue(session);
    expect(await playerLinkTarget("b3d 5f7")).toEqual({
      redirect: "/backstage/megagame?player=B3D5F7",
    });
    expect(store.findPlayerByCode).not.toHaveBeenCalled();
  });

  it("shows anyone else the name and levels only", async () => {
    store.findPlayerByCode.mockResolvedValue({
      id: "u2",
      name: "Ada",
      pronouns: "she/her",
      imageUrl: "https://x.test/a.webp",
      levels: { wizard: 2, pirate: 0, alien: 0 },
      code: "B3D5F7",
    });
    expect(await playerLinkTarget("B3D5F7")).toEqual({
      player: { name: "Ada", levels: { wizard: 2, pirate: 0, alien: 0 } },
    });
  });

  it("reports an unknown code to anyone else", async () => {
    expect(await playerLinkTarget("B3D5F7")).toEqual({ player: null });
  });
});
