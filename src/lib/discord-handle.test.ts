import { describe, expect, it } from "vitest";
import { cleanDiscordHandle } from "./discord-handle";

describe("cleanDiscordHandle", () => {
  it("strips a leading @ and whitespace", () => {
    expect(cleanDiscordHandle("  @@ ada_l ")).toBe("ada_l");
    expect(cleanDiscordHandle("ada")).toBe("ada");
  });

  it("is null when nothing is left", () => {
    expect(cleanDiscordHandle(" @ ")).toBeNull();
    expect(cleanDiscordHandle("")).toBeNull();
    expect(cleanDiscordHandle(undefined)).toBeNull();
    expect(cleanDiscordHandle(null)).toBeNull();
  });
});
