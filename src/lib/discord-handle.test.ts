import { describe, expect, it } from "vitest";
import { cleanDiscordHandle, prefillDiscord } from "./discord-handle";

describe("cleanDiscordHandle", () => {
  it("strips a leading @ and whitespace", () => {
    expect(cleanDiscordHandle("  @@ ada_l ")).toBe("ada_l");
    expect(cleanDiscordHandle("ada")).toBe("ada");
  });

  it("is undefined when nothing is left", () => {
    expect(cleanDiscordHandle(" @ ")).toBeUndefined();
    expect(cleanDiscordHandle("")).toBeUndefined();
    expect(cleanDiscordHandle(undefined)).toBeUndefined();
    expect(cleanDiscordHandle(null)).toBeUndefined();
  });
});

describe("prefillDiscord", () => {
  const email = "Ada@Example.com";
  const at = (day: number) => new Date(Date.UTC(2026, 9, day));
  const ticket = (
    purchaserEmail: string,
    purchaserDiscord: string | null,
    day: number,
  ) => ({ purchaserEmail, purchaserDiscord, createdAt: at(day) });

  it("keeps the profile's handle", () => {
    expect(
      prefillDiscord("ada_p", [ticket("ada@example.com", "ada_t", 1)], email),
    ).toBe("ada_p");
  });

  it("takes the newest handle from a ticket they bought", () => {
    expect(
      prefillDiscord(
        " ",
        [
          ticket("ada@example.com", "ada_old", 1),
          ticket("bob@example.com", "bob", 9),
          ticket("ada@example.com", null, 8),
          ticket("ada@example.com", "ada_new", 5),
        ],
        email,
      ),
    ).toBe("ada_new");
  });

  it("is empty with nothing to go on", () => {
    expect(prefillDiscord(null, [], email)).toBe("");
    expect(
      prefillDiscord(null, [ticket("bob@example.com", "bob", 1)], email),
    ).toBe("");
  });
});
