import { describe, expect, it } from "vitest";
import {
  isCompleteMegagameCode,
  matchAnswer,
  normalizeAnswer,
  normalizeMegagameCode,
} from "./megagame-rules";

describe("normalizeMegagameCode", () => {
  it("drops separators and uppercases", () => {
    expect(normalizeMegagameCode("a2c-4ef")).toBe("A2C4EF");
    expect(normalizeMegagameCode("a2c 4ef")).toBe("A2C4EF");
    expect(normalizeMegagameCode("A2C4EF")).toBe("A2C4EF");
  });

  it("folds the Crockford lookalikes the same way ticket codes do", () => {
    expect(normalizeMegagameCode("ilou12")).toBe("110V12");
  });

  it("takes the code out of a pasted QR URL", () => {
    expect(normalizeMegagameCode("https://metagame.games/q/A2C-4EF")).toBe(
      "A2C4EF",
    );
    expect(
      normalizeMegagameCode("https://metagame.games/q/A2C-4EF?utm_source=x"),
    ).toBe("A2C4EF");
    expect(normalizeMegagameCode("https://metagame.games/q/A2C-4EF/")).toBe(
      "A2C4EF",
    );
    expect(normalizeMegagameCode("https://metagame.games/q/A2C-4EF#top")).toBe(
      "A2C4EF",
    );
  });

  it("works the same for a player badge URL", () => {
    expect(normalizeMegagameCode("https://metagame.games/p/A2C-4EF")).toBe(
      "A2C4EF",
    );
  });

  it("does not truncate over-long input", () => {
    expect(normalizeMegagameCode("A2C4EFGH")).toBe("A2C4EFGH");
    expect(isCompleteMegagameCode("A2C4EFGH")).toBe(false);
  });

  it("handles empty input", () => {
    expect(normalizeMegagameCode("")).toBe("");
    expect(isCompleteMegagameCode("")).toBe(false);
  });
});

describe("isCompleteMegagameCode", () => {
  it("wants the full length", () => {
    expect(isCompleteMegagameCode("A2C4E")).toBe(false);
    expect(isCompleteMegagameCode("A2C4EF")).toBe(true);
  });
});

describe("normalizeAnswer", () => {
  it("keeps only letters and numbers, lowercased and unaccented", () => {
    expect(normalizeAnswer("  The Red Door ")).toBe("thereddoor");
    expect(normalizeAnswer("crème brûlée")).toBe("cremebrulee");
    expect(normalizeAnswer("it's a trap!")).toBe("itsatrap");
    expect(normalizeAnswer("")).toBe("");
  });
});

describe("matchAnswer", () => {
  it("ignores case and surrounding whitespace", () => {
    expect(matchAnswer("  The Red Door ", ["the red door"])).toEqual({
      matched: true,
      answer: "the red door",
    });
  });

  it("ignores accents in either direction", () => {
    expect(matchAnswer("creme brulee", ["crème brûlée"]).matched).toBe(true);
    expect(matchAnswer("crème brûlée", ["creme brulee"]).matched).toBe(true);
  });

  it("ignores punctuation", () => {
    expect(matchAnswer("it's a trap!", ["Its a trap"]).matched).toBe(true);
  });

  it("ignores internal whitespace", () => {
    expect(matchAnswer("red    door", ["red door"]).matched).toBe(true);
  });

  it("treats hyphenation and spacing as interchangeable", () => {
    expect(matchAnswer("co-op", ["co op"]).matched).toBe(true);
    expect(matchAnswer("co-op", ["coop"]).matched).toBe(true);
  });

  it("returns the accepted answer as stored", () => {
    expect(matchAnswer("second One", ["First", "Second one"])).toEqual({
      matched: true,
      answer: "Second one",
    });
  });

  it("reports no match", () => {
    expect(matchAnswer("blue door", ["the red door"])).toEqual({
      matched: false,
      answer: null,
    });
  });

  it("never matches an empty entry", () => {
    expect(matchAnswer("", ["", "red"])).toEqual({
      matched: false,
      answer: null,
    });
    expect(matchAnswer("!!!", ["", "red"]).matched).toBe(false);
  });

  it("never matches against an empty accepted list", () => {
    expect(matchAnswer("anything", [])).toEqual({
      matched: false,
      answer: null,
    });
  });
});
