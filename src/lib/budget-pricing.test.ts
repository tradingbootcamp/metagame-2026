import { describe, expect, it } from "vitest";
import { costUsd, tokens, usd } from "./budget-pricing";

describe("budget pricing", () => {
  it("prices known models and shrugs at unknown ones", () => {
    expect(costUsd("claude-opus-5-5", 1_000_000, 0)).toBe(4);
    expect(costUsd("claude-haiku-5-5-20261001", 0, 1_000_000)).toBe(0.5);
    expect(costUsd("gpt-whatever", 1000, 1000)).toBeNull();
    expect(costUsd(null, 1000, 1000)).toBeNull();
  });

  it("formats", () => {
    expect(usd(0.004)).toBe("<$0.01");
    expect(usd(0.1234)).toBe("$0.12");
    expect(usd(null)).toBe("");
    expect(tokens(950)).toBe("950");
    expect(tokens(12_345)).toBe("12k");
    expect(tokens(1_234)).toBe("1.2k");
  });
});
