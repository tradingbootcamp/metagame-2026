import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";

vi.mock("./actions", () => ({ setTicketVoided: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: vi.fn() }));

import { VoidPanel, type AdminTicket } from "./TicketsTable";

const panel = (t: Partial<AdminTicket["t"]>) =>
  renderToStaticMarkup(
    createElement(VoidPanel, {
      canVoid: true,
      ticket: {
        id: "pi_1",
        status: "voided",
        voidedAt: new Date("2026-11-01"),
        voidedBy: "Libi",
        unvoidedAt: null,
        unvoidedBy: null,
        ...t,
      } as AdminTicket["t"],
    }),
  );

it("says who voided a ticket and offers the undo", () => {
  const html = panel({});
  expect(html).toContain("Voided");
  expect(html).toContain("Libi");
  expect(html).toContain("Undo void");
});

it("keeps the record of an undone void", () => {
  const html = panel({
    status: "paid",
    unvoidedAt: new Date("2026-11-02"),
    unvoidedBy: "Sam",
  });
  expect(html).toContain("Was voided");
  expect(html).toContain("Sam");
  expect(html).toContain("Void ticket");
});
