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
    listQuests: vi.fn(),
    levelGrid: vi.fn(),
    claimedTicketHolderCount: vi.fn(),
    questCompletionCounts: vi.fn(),
    distinctCompletingPlayers: vi.fn(),
    completionsByVolunteer: vi.fn(),
    completionSeries: vi.fn(),
    levelEventSeries: vi.fn(),
    liveLevelEventsBefore: vi.fn(),
    recentOverrides: vi.fn(),
    recentVoids: vi.fn(),
  },
  data: { loadPlayerRows: vi.fn() },
}));
vi.mock("@/lib/admin-auth", () => auth);
vi.mock("@/lib/megagame-store", () => store);
vi.mock("./data", () => data);
vi.mock("./actions", () => ({}));
vi.mock("next/server", () => ({ connection: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/site-origin", () => ({
  siteOriginFromHeaders: vi.fn(async () => "https://x.test"),
}));

import SignIn from "../SignIn";
import MegagameHome from "./page";
import LevelUpPage from "./level/page";
import QuestPage from "./q/[code]/page";
import QuestsPage from "./quests/page";
import DashboardPage from "./dashboard/page";

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

describe("quest management page", () => {
  it("needs megagame.manage and loads nothing without it", async () => {
    const el = await QuestsPage();
    expect(auth.toolAccess).toHaveBeenCalledWith("megagame.manage");
    expectSignInOnly(el, "/backstage/megagame/quests");
  });

  it("is refused to a volunteer holding only megagame.verify", async () => {
    auth.toolAccess.mockImplementation(async (p: string) =>
      p === "megagame.verify" ? { name: "Vol", userId: "v1" } : null,
    );
    expectSignInOnly(await QuestsPage(), "/backstage/megagame/quests");
  });

  it("loads the quests for a manager", async () => {
    auth.toolAccess.mockResolvedValue({ name: "Boss", userId: "m1" });
    store.listQuests.mockResolvedValue([]);
    await QuestsPage();
    expect(store.listQuests).toHaveBeenCalled();
  });
});

describe("dashboard page", () => {
  it("needs megagame.verify, keeps its choices through sign-in, and loads nothing without it", async () => {
    const el = await DashboardPage(
      props({}, { range: "con", bucket: "1h", cls: "alien" }),
    );
    expect(auth.toolAccess).toHaveBeenCalledWith("megagame.verify");
    expectSignInOnly(
      el,
      "/backstage/megagame/dashboard?range=con&bucket=1h&cls=alien",
    );
  });

  it("loads the figures for a volunteer, with the series over the chosen range", async () => {
    auth.toolAccess.mockResolvedValue({ name: "Vol", userId: "v1" });
    store.levelGrid.mockResolvedValue({
      wizard: [0, 1, 0, 0, 0, 0],
      pirate: [0, 0, 0, 0, 0, 0],
      alien: [0, 0, 0, 0, 0, 0],
    });
    store.claimedTicketHolderCount.mockResolvedValue(10);
    store.questCompletionCounts.mockResolvedValue([]);
    store.distinctCompletingPlayers.mockResolvedValue(0);
    store.completionsByVolunteer.mockResolvedValue([]);
    store.completionSeries.mockResolvedValue([]);
    store.levelEventSeries.mockResolvedValue([]);
    store.liveLevelEventsBefore.mockResolvedValue([]);
    store.recentOverrides.mockResolvedValue([]);
    store.recentVoids.mockResolvedValue([]);
    await DashboardPage(props({}, { range: "con", bucket: "1d" }));
    expect(store.completionSeries).toHaveBeenCalledWith(
      "1d",
      new Date("2026-11-06T08:00:00.000Z"),
      new Date("2026-11-09T08:00:00.000Z"),
    );
    expect(store.levelEventSeries).toHaveBeenCalledWith(
      "1d",
      new Date("2026-11-06T08:00:00.000Z"),
      new Date("2026-11-09T08:00:00.000Z"),
    );
    expect(store.liveLevelEventsBefore).toHaveBeenCalledWith(
      new Date("2026-11-09T08:00:00.000Z"),
    );
  });

  it("skips the series queries when the range has too many buckets", async () => {
    auth.toolAccess.mockResolvedValue({ name: "Vol", userId: "v1" });
    for (const fn of Object.values(store)) fn.mockResolvedValue([]);
    store.levelGrid.mockResolvedValue({
      wizard: [0, 0, 0, 0, 0, 0],
      pirate: [0, 0, 0, 0, 0, 0],
      alien: [0, 0, 0, 0, 0, 0],
    });
    store.claimedTicketHolderCount.mockResolvedValue(0);
    store.distinctCompletingPlayers.mockResolvedValue(0);
    await DashboardPage(props({}, { range: "con", bucket: "5m" }));
    expect(store.completionSeries).not.toHaveBeenCalled();
    expect(store.levelEventSeries).not.toHaveBeenCalled();
    expect(store.liveLevelEventsBefore).not.toHaveBeenCalled();
  });
});
