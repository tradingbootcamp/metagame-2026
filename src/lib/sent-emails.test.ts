import { describe, expect, it } from "vitest";
import {
  emailSubject,
  groupEmailFiles,
  isEmailSlug,
  listSentEmails,
  previewEmail,
  readSentEmail,
} from "./sent-emails";

describe("groupEmailFiles", () => {
  it("makes one entry per .html with the variants beside it", () => {
    expect(
      groupEmailFiles([
        "CLAUDE.md",
        "welcome.html",
        "announcement.txt",
        "announcement.min.html",
        "announcement.html",
        "stray.min.html",
        "Bad Name.html",
      ]),
    ).toEqual([
      { slug: "announcement", variants: ["html", "min", "txt"] },
      { slug: "welcome", variants: ["html"] },
    ]);
  });
});

describe("emailSubject", () => {
  it("reads the title, decoding entities", () => {
    expect(
      emailSubject("<html><title>\n  You&#8217;re on &amp; in </title>", "x"),
    ).toBe("You’re on & in");
  });
  it("falls back to the slug", () => {
    expect(emailSubject("<html></html>", "welcome")).toBe("welcome");
  });
});

it("previewEmail fills the EmailOctopus tags and leaves the rest", () => {
  expect(
    previewEmail(
      '<a href="{{UnsubscribeURL}}">x</a> {{Other}} {{SenderInfoLine}}',
    ),
  ).toBe(
    '<a href="#">x</a> {{Other}} Metagame · (sender address filled in by EmailOctopus)',
  );
});

it("isEmailSlug rejects paths", () => {
  expect(isEmailSlug("welcome")).toBe(true);
  expect(isEmailSlug("../welcome")).toBe(false);
  expect(isEmailSlug("a/b")).toBe(false);
  expect(isEmailSlug("")).toBe(false);
});

describe("the emails/ folder", () => {
  it("lists the saved emails", async () => {
    const emails = await listSentEmails();
    const welcome = emails.find((e) => e.slug === "welcome");
    expect(welcome).toMatchObject({
      subject: "You're on the Metagame mailing list",
      variants: ["html"],
    });
    expect(welcome!.bytes).toBeGreaterThan(0);
  });
  it("reads a variant and refuses an unknown or unsafe slug", async () => {
    expect(await readSentEmail("welcome")).toContain("<html");
    expect(await readSentEmail("welcome", "txt")).toBeNull();
    expect(await readSentEmail("nope")).toBeNull();
    expect(await readSentEmail("../package")).toBeNull();
  });
});
