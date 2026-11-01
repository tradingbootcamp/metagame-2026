import { beforeEach, describe, expect, it, vi } from "vitest";

const { auth, store, data } = vi.hoisted(() => ({
  auth: { toolAccess: vi.fn(), requireAccess: vi.fn(), EXPIRED: "expired" },
  store: {
    findQuestByCode: vi.fn(),
    findPlayerByCode: vi.fn(),
    recentConfirmations: vi.fn(),
    confirmationOutcome: vi.fn(),
    liveCompletions: vi.fn(),
    playersByIds: vi.fn(),
    completionsInClass: vi.fn(),
    levelEventsFor: vi.fn(),
  },
  data: { loadPlayerRows: vi.fn() },
}));
vi.mock("@/lib/admin-auth", () => auth);
vi.mock("@/lib/megagame-store", () => store);
vi.mock("./data", () => data);
vi.mock("./actions", () => ({}));
vi.mock("next/server", () => ({ connection: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

import SignIn from "../SignIn";
import MegagameHome from "./page";
import LevelUpPage from "./level/page";
import QuestPage from "./q/[code]/page";

const C = "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b";
const props = <T>(params: T, searchParams: Record<string, string>) =>
  ({
    params: Promise.resolve(params),
    searchParams: Promise.resolve(searchParams),
  }) as never;

beforeEach(() => {
  vi.clearAllMocks();
  auth.toolAccess.mockResolvedValue(null);
});

const expectSignInOnly = (el: unknown, next: string) => {
  expect(el).toMatchObject({ type: SignIn, props: { next } });
  for (const fn of [...Object.values(store), data.loadPlayerRows])
    expect(fn).not.toHaveBeenCalled();
};

describe("megagame pages without megagame.verify", () => {
  it("home shows only the sign-in, keeping the list", async () => {
    const el = await MegagameHome(props({}, { players: "u1,u2" }));
    expect(auth.toolAccess).toHaveBeenCalledWith("megagame.verify");
    expectSignInOnly(el, "/backstage/megagame?players=u1%2Cu2");
  });

  it("quest page shows only the sign-in and never loads the quest or its answers", async () => {
    const el = await QuestPage(props({ code: "a2c4ef" }, { players: "u1" }));
    expect(auth.toolAccess).toHaveBeenCalledWith("megagame.verify");
    expectSignInOnly(el, "/backstage/megagame/q/A2C4EF?players=u1");
  });

  it("quest page keeps a confirmation id through sign-in", async () => {
    const el = await QuestPage(
      props({ code: "a2c4ef" }, { players: "u1", c: C }),
    );
    expectSignInOnly(el, `/backstage/megagame/q/A2C4EF?players=u1&c=${C}`);
  });

  it("quest page drops a malformed confirmation id", async () => {
    const el = await QuestPage(props({ code: "a2c4ef" }, { c: "nope" }));
    expectSignInOnly(el, "/backstage/megagame/q/A2C4EF");
  });

  it("level-up page shows only the sign-in", async () => {
    const el = await LevelUpPage(props({}, { u: "u1" }));
    expect(auth.toolAccess).toHaveBeenCalledWith("megagame.verify");
    expectSignInOnly(el, "/backstage/megagame/level?u=u1");
  });
});
