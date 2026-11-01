import { describe, expect, it } from "vitest";
import { MAX_BUCKETS, dashboardView, viewHref } from "./view";

const now = new Date("2026-11-07T18:07:00.000Z"); // 10:07 AM Pacific, Saturday
const iso = (d: Date) => d.toISOString();

describe("dashboardView", () => {
  it("defaults to today in 30 minute buckets, from Pacific midnight", () => {
    const v = dashboardView({}, now);
    expect(v.preset).toBe("today");
    expect(v.size).toBe("30m");
    expect(iso(v.from)).toBe("2026-11-07T08:00:00.000Z");
    expect(iso(v.to)).toBe(iso(now));
    expect(v.buckets).toHaveLength(21);
    expect(iso(v.buckets.at(-1)!)).toBe("2026-11-07T18:00:00.000Z");
    expect(v.tooMany).toBe(false);
    expect(v.cls).toBe("wizard");
  });

  it("aligns the last 2 hours to the bucket containing its start", () => {
    const v = dashboardView({ range: "2h" }, now);
    expect(v.size).toBe("5m");
    expect(iso(v.from)).toBe("2026-11-07T16:05:00.000Z");
    expect(v.buckets).toHaveLength(25);
  });

  it("covers the three con days in Pacific time, ending at Monday midnight", () => {
    const v = dashboardView({ range: "con", bucket: "1d" }, now);
    expect(iso(v.from)).toBe("2026-11-06T08:00:00.000Z");
    expect(iso(v.to)).toBe("2026-11-09T08:00:00.000Z");
    expect(v.buckets.map(iso)).toEqual([
      "2026-11-06T08:00:00.000Z",
      "2026-11-07T08:00:00.000Z",
      "2026-11-08T08:00:00.000Z",
    ]);
  });

  it("ignores an unknown range, bucket or class", () => {
    const v = dashboardView({ range: "week", bucket: "2h", cls: "bard" }, now);
    expect([v.preset, v.size, v.cls]).toEqual(["today", "30m", "wizard"]);
  });

  it("takes the first value of a repeated parameter", () => {
    const v = dashboardView({ bucket: ["1h", "5m"], cls: ["alien"] }, now);
    expect([v.size, v.cls]).toEqual(["1h", "alien"]);
  });

  it("flags a range with too many buckets and returns none", () => {
    const v = dashboardView({ range: "con", bucket: "5m" }, now);
    expect(v.tooMany).toBe(true);
    expect(v.buckets).toEqual([]);
    expect(MAX_BUCKETS).toBeLessThan(3 * 288);
  });
});

describe("viewHref", () => {
  it("keeps the other choices when one changes", () => {
    const v = dashboardView({ range: "con", bucket: "1h", cls: "pirate" }, now);
    expect(viewHref(v, { cls: "alien" })).toBe(
      "/backstage/megagame/dashboard?range=con&bucket=1h&cls=alien",
    );
  });

  it("drops the chosen bucket when the range changes, so the new range's default applies", () => {
    const v = dashboardView({ range: "con", bucket: "1h" }, now);
    expect(viewHref(v, { range: "2h" })).toBe(
      "/backstage/megagame/dashboard?range=2h&cls=wizard",
    );
  });
});
