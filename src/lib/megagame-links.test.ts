import { beforeEach, describe, expect, it, vi } from "vitest";

const { auth, access } = vi.hoisted(() => ({
  auth: { currentSession: vi.fn() },
  access: { can: vi.fn() },
}));
vi.mock("@/lib/auth", () => auth);
vi.mock("@/lib/access", () => access);

import { resolveQuestLink } from "./megagame-links";

const session = { user: { id: "u1" } };

beforeEach(() => {
  vi.clearAllMocks();
  auth.currentSession.mockResolvedValue(null);
  access.can.mockResolvedValue(null);
});

describe("resolveQuestLink", () => {
  it("sends a volunteer to the quest on the board, code normalized", async () => {
    auth.currentSession.mockResolvedValue(session);
    access.can.mockResolvedValue(session);
    expect(await resolveQuestLink("a2c-4ef")).toEqual({
      kind: "board",
      href: "/backstage/megagame?quest=A2C4EF",
    });
    expect(access.can).toHaveBeenCalledWith("megagame.verify");
  });

  it("keeps a player list on the way to the board and through sign-in", async () => {
    expect(await resolveQuestLink("A2C4EF", "u1,u2")).toMatchObject({
      signInHref: `/login?next=${encodeURIComponent("/q/A2C4EF?players=u1%2Cu2")}`,
    });
    auth.currentSession.mockResolvedValue(session);
    access.can.mockResolvedValue(session);
    expect(await resolveQuestLink("A2C4EF", ["u1,u2"])).toEqual({
      kind: "board",
      href: "/backstage/megagame?quest=A2C4EF&players=u1%2Cu2",
    });
  });

  it("shows a signed-out viewer the note, with sign-in coming back here", async () => {
    expect(await resolveQuestLink("A2C4EF")).toEqual({
      kind: "note",
      code: "A2C4EF",
      signInHref: "/login?next=%2Fq%2FA2C4EF",
    });
  });

  it("shows a signed-in viewer without the permission the note", async () => {
    auth.currentSession.mockResolvedValue(session);
    expect(await resolveQuestLink("A2C4EF")).toEqual({
      kind: "note",
      code: "A2C4EF",
      signInHref: null,
    });
  });

  it("leaves a malformed code off the note", async () => {
    expect(await resolveQuestLink("not-a-real-quest-code")).toMatchObject({
      kind: "note",
      code: null,
    });
  });
});
