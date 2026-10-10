import { describe, expect, it } from "vitest";
import { safeNextPath } from "./next-path";

describe("safeNextPath", () => {
  it("keeps same-site paths", () => {
    expect(safeNextPath("/account")).toBe("/account");
    expect(safeNextPath("/schedule?day=sat#top")).toBe("/schedule?day=sat#top");
  });

  it("falls back for anything that could leave the site", () => {
    expect(safeNextPath("https://evil.example")).toBe("/account");
    expect(safeNextPath("//evil.example")).toBe("/account");
    expect(safeNextPath("/\\evil.example")).toBe("/account");
    expect(safeNextPath("/a\r\nLocation: x")).toBe("/account");
  });

  it("falls back for missing values and login loops", () => {
    expect(safeNextPath(undefined)).toBe("/account");
    expect(safeNextPath(["/a"])).toBe("/account");
    expect(safeNextPath("/login?next=/account")).toBe("/account");
    expect(safeNextPath("", "/")).toBe("/");
  });
});
