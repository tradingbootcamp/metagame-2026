import { describe, expect, it } from "vitest";
import {
  MAX_LIST,
  listHref,
  parsePlayerIds,
  withPlayer,
  withoutPlayer,
} from "./player-list";

describe("player list in the URL", () => {
  it("parses a comma list, dropping blanks and repeats", () => {
    expect(parsePlayerIds("u1,,u2,u1")).toEqual(["u1", "u2"]);
    expect(parsePlayerIds(undefined)).toEqual([]);
    expect(parsePlayerIds(["u1,u2", "u3"])).toEqual(["u1", "u2"]);
  });

  it("caps the list length", () => {
    const many = Array.from({ length: MAX_LIST + 5 }, (_, i) => `u${i}`);
    expect(parsePlayerIds(many.join(","))).toHaveLength(MAX_LIST);
  });

  it("adds at the end once and removes by id", () => {
    expect(withPlayer(["u1"], "u2")).toEqual(["u1", "u2"]);
    expect(withPlayer(["u1", "u2"], "u1")).toEqual(["u1", "u2"]);
    expect(withoutPlayer(["u1", "u2"], "u1")).toEqual(["u2"]);
  });

  it("builds hrefs that keep the list, and none when it is empty", () => {
    expect(listHref("/backstage/megagame", ["u1", "u2"])).toBe(
      "/backstage/megagame?players=u1%2Cu2",
    );
    expect(listHref("/backstage/megagame", [])).toBe("/backstage/megagame");
  });

  it("adds extra parameters after the list", () => {
    expect(listHref("/q", ["u1"], { c: "id1" })).toBe("/q?players=u1&c=id1");
    expect(listHref("/q", [], { c: "id1" })).toBe("/q?c=id1");
  });
});
