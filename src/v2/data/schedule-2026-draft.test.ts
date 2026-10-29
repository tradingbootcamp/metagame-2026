import { describe, expect, it } from "vitest";
import { CONFERENCE_DAYS } from "@/lib/schedule";
import { DRAFT_SCHEDULE_2026 } from "./schedule-2026-draft";

describe("the draft 2026 schedule snapshot", () => {
  it("keeps the team's holds and notes off the clock", () => {
    for (const s of DRAFT_SCHEDULE_2026)
      expect(s.title.trimStart().startsWith("["), s.title).toBe(false);
  });

  it("runs within the weekend, each session ending after it starts", () => {
    const days = CONFERENCE_DAYS.map((d) => d.key as string);
    for (const s of DRAFT_SCHEDULE_2026) {
      expect(days, s.title).toContain(s.day);
      expect(s.end, s.title).toBeGreaterThan(s.start);
    }
  });
});
