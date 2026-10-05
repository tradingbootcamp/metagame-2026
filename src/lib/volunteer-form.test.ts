import { describe, expect, it } from "vitest";
import { VOLUNTEER_FORM_URL } from "@/v2/lib/links";
import { volunteerFormUrl } from "./volunteer-form";

const build = (query: string) =>
  new URL(volunteerFormUrl(new URLSearchParams(query)));

describe("volunteerFormUrl", () => {
  it("prefills the tracking fields from utm params", () => {
    const url = build(
      "utm_source=discord&utm_medium=social&utm_campaign=metagame-2026",
    );
    expect(url.origin + url.pathname).toBe(VOLUNTEER_FORM_URL);
    expect(url.searchParams.get("prefill_UTM Source")).toBe("discord");
    expect(url.searchParams.get("prefill_UTM Medium")).toBe("social");
    expect(url.searchParams.get("prefill_UTM Campaign")).toBe("metagame-2026");
  });

  it("hides the tracking fields even with no utm params", () => {
    const url = build("");
    expect(url.searchParams.get("hide_UTM Source")).toBe("true");
    expect(url.searchParams.get("hide_UTM Medium")).toBe("true");
    expect(url.searchParams.get("hide_UTM Campaign")).toBe("true");
    expect(
      [...url.searchParams.keys()].some((k) => k.startsWith("prefill_")),
    ).toBe(false);
  });

  it("drops blank values and params the form has no field for", () => {
    const url = build("utm_source=%20&utm_term=volunteer-email&foo=bar");
    expect(url.searchParams.has("prefill_UTM Source")).toBe(false);
    expect(url.searchParams.has("utm_term")).toBe(false);
    expect(url.searchParams.has("foo")).toBe(false);
  });
});
