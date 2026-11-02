import { describe, expect, it } from "vitest";
import { VOLUNTEER_APPLY_PATH } from "@/v2/lib/links";
import { volunteerFormUrl } from "./volunteer-form";

const build = (query: string) =>
  new URL(volunteerFormUrl(new URLSearchParams(query)), "https://x.test");

describe("volunteerFormUrl", () => {
  it("carries the utm params to the volunteer journey", () => {
    const url = build(
      "utm_source=discord&utm_medium=social&utm_campaign=metagame-2026",
    );
    expect(url.pathname).toBe(VOLUNTEER_APPLY_PATH);
    expect(url.searchParams.get("utm_source")).toBe("discord");
    expect(url.searchParams.get("utm_medium")).toBe("social");
    expect(url.searchParams.get("utm_campaign")).toBe("metagame-2026");
  });

  it("is the bare path with no utm params", () => {
    expect(volunteerFormUrl(new URLSearchParams(""))).toBe(
      VOLUNTEER_APPLY_PATH,
    );
  });

  it("drops blank values and params the table has no field for", () => {
    const url = build("utm_source=%20&utm_term=volunteer-email&foo=bar");
    expect(url.searchParams.has("utm_source")).toBe(false);
    expect(url.searchParams.has("utm_term")).toBe(false);
    expect(url.searchParams.has("foo")).toBe(false);
  });
});
