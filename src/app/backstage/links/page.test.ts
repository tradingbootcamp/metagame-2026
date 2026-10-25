import { beforeEach, expect, it, vi } from "vitest";

vi.mock("next/server", () => ({ connection: vi.fn() }));
vi.mock("@/lib/admin-auth", () => ({ toolAccess: vi.fn() }));
vi.mock("@/lib/site-origin", () => ({
  siteOriginFromHeaders: vi.fn().mockResolvedValue("https://metagame.games"),
}));
vi.mock("@/lib/tracking-links", () => ({
  listTrackingLinks: vi.fn().mockResolvedValue([]),
  loadLinkOptions: vi.fn().mockResolvedValue({}),
}));
vi.mock("../SignIn", () => ({ default: "sign-in" }));
vi.mock("../SignInForms", () => ({ NameForm: "name-form" }));
vi.mock("./LinksTool", () => ({ default: "links-tool" }));

import Page from "./page";
import { toolAccess } from "@/lib/admin-auth";
import { listTrackingLinks, loadLinkOptions } from "@/lib/tracking-links";

beforeEach(() => vi.clearAllMocks());

it("requires links permission before reading the poster registry", async () => {
  vi.mocked(toolAccess).mockResolvedValue(null);
  const page = await Page({
    searchParams: Promise.resolve({ view: "posters" }),
  });
  expect(toolAccess).toHaveBeenCalledWith("links.manage");
  expect(page.props.next).toBe("/backstage/links?view=posters");
  expect(listTrackingLinks).not.toHaveBeenCalled();
  expect(loadLinkOptions).not.toHaveBeenCalled();
});

it("still requires a staff name before reading links", async () => {
  vi.mocked(toolAccess).mockResolvedValue({ via: "password", name: null });
  const page = await Page({
    searchParams: Promise.resolve({ view: "posters" }),
  });
  expect(page.type).toBe("name-form");
  expect(listTrackingLinks).not.toHaveBeenCalled();
});

it.each([
  ["posters", "posters"],
  [undefined, "all"],
  ["unknown", "all"],
  [["posters", "all"], "all"],
])(
  "passes only a supported view to the authorized tool: %s",
  async (input, view) => {
    vi.mocked(toolAccess).mockResolvedValue({ via: "password", name: "Me" });
    const page = await Page({ searchParams: Promise.resolve({ view: input }) });
    expect(page.props.view).toBe(view);
    expect(listTrackingLinks).toHaveBeenCalledOnce();
    expect(loadLinkOptions).toHaveBeenCalledOnce();
  },
);
