import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SPEAKERS } from "@/v2/data/speakers";
import SpeakersSection from "./SpeakersSection";

// Static image imports are bare strings under vitest, which next/image rejects.
vi.mock("next/image", () => ({ default: () => null }));

describe("SpeakersSection", () => {
  it("lists the speakers without promising more are coming", () => {
    const html = renderToStaticMarkup(
      createElement(SpeakersSection, { factionsFor: () => [] }),
    );
    expect(html).toContain(SPEAKERS[0].name);
    expect(html).toContain("And many more");
    expect(html.toLowerCase()).not.toContain("coming soon");
  });
});
