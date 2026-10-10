import { describe, expect, it } from "vitest";
import { matchLabel } from "./name-match";

describe("matchLabel", () => {
  const labels = ["Brian", "ricki s", "Dave"];

  it("reuses an existing spelling", () => {
    expect(matchLabel("brian", labels)).toBe("Brian");
    expect(matchLabel("Ricki S", labels)).toBe("ricki s");
  });

  it("matches on first name when the full name differs", () => {
    expect(matchLabel("Brian Smiley", labels)).toBe("Brian");
    expect(matchLabel("dave", ["Dave Jones"])).toBe("Dave Jones");
  });

  it("keeps the name when nothing matches", () => {
    expect(matchLabel("Sam", labels)).toBe("Sam");
    expect(matchLabel("Sam", [])).toBe("Sam");
  });
});
