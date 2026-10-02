import { afterEach, describe, expect, it, vi } from "vitest";
import { TEAM_EMAIL } from "@/v2/lib/links";
import { resolveRecipient } from "./contact-recipients";

const people = [{ contactKey: "kai" }, { contactKey: "unset" }, {}];
const resolve = (to: string) => resolveRecipient(to, people);

describe("resolveRecipient", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("passes the team inbox through", () => {
    expect(resolve(TEAM_EMAIL)).toBe(TEAM_EMAIL);
  });
  it("resolves a contact key to its env address", () => {
    vi.stubEnv("CONTACT_EMAIL_KAI", "kai@example.com");
    expect(resolve("kai")).toBe("kai@example.com");
  });
  it("rejects addresses, unlisted keys and keys with no env var", () => {
    vi.stubEnv("CONTACT_EMAIL_KAI", "kai@example.com");
    vi.stubEnv("CONTACT_EMAIL_NOBODY", "x@example.com");
    expect(resolve("kai@example.com")).toBeNull();
    expect(resolve("evil@example.com")).toBeNull();
    expect(resolve("nobody")).toBeNull();
    expect(resolve("unset")).toBeNull();
  });
});
