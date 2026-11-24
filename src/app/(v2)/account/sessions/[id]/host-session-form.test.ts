import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({ state: {} as Record<string, unknown> }));
vi.mock("react", async (original) => ({
  ...(await original<typeof import("react")>()),
  useActionState: () => [h.state, () => {}, false],
}));
vi.mock("./actions", () => ({
  addCohost: () => {},
  removeCohost: () => {},
  saveHostSession: () => {},
}));

import HostSessionForm from "./HostSessionForm";

const render = (state: Record<string, unknown>, rsvpIsCommitment = false) => {
  h.state = state;
  return renderToStaticMarkup(
    createElement(HostSessionForm, {
      sessionId: "s",
      initial: {
        title: "Stored title",
        description: "Stored description",
        category: "talk",
        ages: "all",
        needs: "",
        maxCapacity: "20",
        minCapacity: "",
      },
      rsvpIsCommitment,
      hosts: [],
      viewerId: "me",
    }),
  );
};

describe("HostSessionForm", () => {
  it("fills in what's stored until a save is refused", () => {
    const html = render({ savedAt: 1 }, true);
    expect(html).toContain('value="Stored title"');
    expect(html).toContain("Stored description</textarea>");
    expect(html).toContain('value="20"');
    expect(html).toContain('<option value="talk" selected=""');
    expect(html).toMatch(/type="checkbox"[^>]*checked=""/);
  });

  it("fills in what was submitted after a refused save", () => {
    const html = render(
      {
        error: "13 people are already going",
        values: {
          title: "New title",
          description: "New description",
          category: "workshop",
          ages: "adults",
          maxCapacity: "4",
        },
      },
      true,
    );
    expect(html).toContain('value="New title"');
    expect(html).toContain("New description</textarea>");
    expect(html).toContain('value="4"');
    expect(html).toContain('<option value="workshop" selected=""');
    expect(html).toContain('<option value="adults" selected=""');
    expect(html).not.toContain("Stored");
    // An unticked box isn't in the submission, so it stays unticked.
    expect(html).not.toMatch(/type="checkbox"[^>]*checked=""/);
  });
});
