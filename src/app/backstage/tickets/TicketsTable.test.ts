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
        refunded: true,
        ...t,
      } as AdminTicket["t"],
    }),
  );

it("warns before undoing a staff void on a refunded ticket", () => {
  const html = panel({});
  expect(html).toContain("fully refunded");
  expect(html).toContain("valid anyway");
  expect(html).toContain("Undo void");
});

it("still says refunded after the void is undone", () => {
  const html = panel({ status: "paid" });
  expect(html).toContain("fully refunded");
  expect(html).not.toContain("valid anyway");
});

it("says nothing of refunds otherwise", () => {
  expect(panel({ refunded: false })).not.toContain("refunded");
});
