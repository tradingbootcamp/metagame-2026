import { describe, expect, it } from "vitest";
import { EARLY_BIRD_ENDS_AT } from "@/lib/early-bird";
import { KEY_DATES, upcomingKeyDates } from "./key-dates";

describe("key dates without a ticket sales cutoff", () => {
  it.each(["2026-10-29T06:59:59Z", "2026-10-30T07:00:00Z"])(
    "keeps the event upcoming at %s without a sales deadline",
    (now) => {
      expect(
        upcomingKeyDates(Date.parse(now)).map((date) => date.title),
      ).toEqual(["Metagame 2026!", "The Metagame team takes a looong nap"]);
    },
  );

  it("preserves early-bird pricing and the event's Pacific end boundary", () => {
    expect(KEY_DATES[0].endsAt).toBe(EARLY_BIRD_ENDS_AT);
    expect(upcomingKeyDates(EARLY_BIRD_ENDS_AT)).not.toContain(KEY_DATES[0]);
    const event = KEY_DATES.find((date) => date.milestone)!;
    expect(event.label).toBe("Nov 6–8");
    expect(upcomingKeyDates(Date.parse("2026-11-09T07:59:59Z"))).toContain(
      event,
    );
    expect(upcomingKeyDates(Date.parse("2026-11-09T08:00:00Z"))).not.toContain(
      event,
    );
  });
});
