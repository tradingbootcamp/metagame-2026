import { describe, expect, it } from "vitest";
import { TEAM_EMAIL } from "@/v2/lib/links";
import { parsePrivateEmails, resolveRecipient } from "./contact-recipients";

const priv = parsePrivateEmails("kai = kai@example.com, nobody=x@example.com");
const people = [{ email: "ricki@metagame.games" }, { contactKey: "kai" }];
const resolve = (to: string, emails = priv) =>
  resolveRecipient(to, emails, people);

describe("resolveRecipient", () => {
  it("passes the team inbox and published team addresses through", () => {
    expect(resolve(TEAM_EMAIL)).toBe(TEAM_EMAIL);
    expect(resolve("ricki@metagame.games")).toBe("ricki@metagame.games");
  });
  it("resolves a contact key to its private address", () => {
    expect(resolve("kai")).toBe("kai@example.com");
  });
  it("rejects unknown addresses, unlisted keys and raw private addresses", () => {
    expect(resolve("evil@example.com")).toBeNull();
    expect(resolve("nobody")).toBeNull();
    expect(resolve("kai@example.com")).toBeNull();
    expect(resolve("kai", parsePrivateEmails(undefined))).toBeNull();
  });
});
