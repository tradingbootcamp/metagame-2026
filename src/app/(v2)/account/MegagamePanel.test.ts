import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("./actions", () => ({ chooseMegagameClass: vi.fn() }));

import MegagamePanel from "./MegagamePanel";

const render = (locked: boolean) =>
  renderToStaticMarkup(
    createElement(MegagamePanel, {
      levels: { wizard: 3, pirate: 0, alien: 1 },
      playerCode: "B3D5F7",
      locked,
    }),
  );

describe("MegagamePanel", () => {
  it("offers the faction picker before a volunteer level-up", () => {
    const html = render(false);
    expect(html).toContain("Pick a faction");
    expect(html).toContain('name="class"');
  });

  it("shows the current levels instead of the picker once locked", () => {
    const html = render(true);
    expect(html).not.toContain("Pick a faction");
    expect(html).not.toContain('name="class"');
    expect(html).toContain("Your classes");
    expect(html).toContain("B3D-5F7");
  });
});
