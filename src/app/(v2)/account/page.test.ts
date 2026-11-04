import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactElement } from "react";

const mocks = vi.hoisted(() => ({
  tabOverride: null as boolean | null,
  loadBalance: vi.fn(),
  listTokenVolunteers: vi.fn(),
  hasClaimedTicket: vi.fn(),
}));

const { stub } = vi.hoisted(() => ({
  stub: () => ({ default: () => null }),
}));
vi.mock("next/link", stub);
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("./AccountForms", () => ({
  PasswordForm: () => null,
  ProfileForm: () => null,
  SignOutButton: () => null,
}));
vi.mock("./AccountTabs", stub);
vi.mock("./AvatarForm", stub);
vi.mock("./MagnumOpusPanel", stub);
vi.mock("./MegagamePanel", stub);
vi.mock("./MegagameSummary", stub);
vi.mock("./SessionsPanel", stub);
vi.mock("./TicketsPanel", stub);
vi.mock("@/db", () => ({
  getDb: () => ({
    select: () => ({
      from: () => ({ where: () => ({ limit: async () => [] }) }),
    }),
  }),
  schema: { profiles: { userId: "user_id" } },
}));
vi.mock("@/lib/account-sessions", () => ({ accountSessions: () => [] }));
vi.mock("@/lib/access", () => ({
  can: async () => null,
  teamAccess: async () => null,
}));
vi.mock("@/lib/auth", () => ({
  currentSession: async () => ({
    user: { id: "u", email: "u@example.com", name: "U" },
  }),
  hasPassword: async () => false,
}));
vi.mock("@/lib/discord-handle", () => ({ prefillDiscord: () => "" }));
vi.mock("@/lib/megagame-store", () => ({
  ensurePlayerCode: async () => "CODE",
  hasVolunteerLevelEvent: async () => false,
  loadMegagameLevels: async () => ({ wizard: 0, pirate: 0, alien: 0 }),
}));
vi.mock("@/lib/schedule-store", () => ({
  loadRsvpCounts: async () => new Map(),
  loadSchedule: async () => ({ sessions: [], locations: [] }),
  loadViewerPlans: async () => ({}),
}));
vi.mock("@/lib/referral-store", () => ({
  mintReferralCodes: async () => undefined,
  referrerNames: async () => new Map(),
}));
vi.mock("@/lib/ticket-store", () => ({
  emailKey: (e: string) => e,
  hasClaimedTicket: mocks.hasClaimedTicket,
  ticketsForUser: async () => [],
}));
vi.mock("@/lib/site-settings", () => ({
  loadOverrides: async () => ({
    tab: { override: mocks.tabOverride },
    loans: { override: null },
  }),
}));
vi.mock("@/lib/token-store", () => ({
  listTokenVolunteers: mocks.listTokenVolunteers,
  loadBalance: mocks.loadBalance,
}));
vi.mock("@/lib/ticket-view", () => ({ ticketView: vi.fn() }));
vi.mock("@/v2/components/ui/button", () => ({ Button: () => null }));

import AccountPage from "./page";

type AccountTabsProps = {
  tabs: string[];
  panels: Record<string, unknown>;
};

async function render(tabOverride: boolean) {
  mocks.tabOverride = tabOverride;
  const page = (await AccountPage({
    searchParams: Promise.resolve({}),
  })) as ReactElement<{ children: ReactElement<AccountTabsProps> }>;
  return page.props.children.props;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.loadBalance.mockResolvedValue({ tokens: 3, loanTokens: 0 });
  mocks.listTokenVolunteers.mockResolvedValue(["Ann"]);
  mocks.hasClaimedTicket.mockResolvedValue(true);
});

describe("AccountPage Magnum Opus tab", () => {
  it("neither loads nor builds the panel while hidden", async () => {
    const { tabs, panels } = await render(false);
    expect(tabs).not.toContain("magnumOpus");
    expect(panels.magnumOpus).toBeNull();
    expect(mocks.loadBalance).not.toHaveBeenCalled();
    expect(mocks.listTokenVolunteers).not.toHaveBeenCalled();
    expect(mocks.hasClaimedTicket).not.toHaveBeenCalled();
  });

  it("loads and builds the panel once visible", async () => {
    const { tabs, panels } = await render(true);
    expect(tabs).toContain("magnumOpus");
    expect(panels.magnumOpus).not.toBeNull();
    expect(mocks.loadBalance).toHaveBeenCalledWith("u");
    expect(mocks.listTokenVolunteers).toHaveBeenCalled();
    expect(mocks.hasClaimedTicket).toHaveBeenCalledWith("u");
  });
});
