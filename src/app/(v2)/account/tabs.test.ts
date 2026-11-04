import { afterEach, describe, expect, it, vi } from "vitest";
import { parseAccountTab, visibleAccountTabs } from "./tabs";
import { MAGNUM_OPUS_OPENS } from "@/lib/magnum-opus";

afterEach(() => vi.unstubAllEnvs());

describe("Magnum Opus tab", () => {
  it("opens at 18:00 Pacific on Friday 6 Nov 2026", () => {
    expect(
      new Date(MAGNUM_OPUS_OPENS).toLocaleString("en-US", {
        timeZone: "America/Los_Angeles",
        weekday: "long",
        hour: "numeric",
        minute: "2-digit",
        month: "short",
        day: "numeric",
      }),
    ).toBe("Friday, Nov 6, 6:00 PM");
  });

  it("is hidden in production until then", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(visibleAccountTabs(null, MAGNUM_OPUS_OPENS - 1)).not.toContain(
      "magnumOpus",
    );
    expect(visibleAccountTabs(null, MAGNUM_OPUS_OPENS)).toContain("magnumOpus");
  });

  it("is always shown in local dev", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(visibleAccountTabs(null, 0)).toContain("magnumOpus");
  });

  it("sends a link to the hidden tab to the profile", () => {
    vi.stubEnv("NODE_ENV", "production");
    const tabs = visibleAccountTabs(null, MAGNUM_OPUS_OPENS - 1);
    expect(parseAccountTab("magnumOpus", tabs)).toBe("profile");
  });

  it("follows the override over the schedule and local dev", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(visibleAccountTabs(true, MAGNUM_OPUS_OPENS - 1)).toContain(
      "magnumOpus",
    );
    expect(visibleAccountTabs(false, MAGNUM_OPUS_OPENS)).not.toContain(
      "magnumOpus",
    );
    vi.stubEnv("NODE_ENV", "development");
    expect(visibleAccountTabs(false, 0)).not.toContain("magnumOpus");
  });
});
