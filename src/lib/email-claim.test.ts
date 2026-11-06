import { afterEach, describe, expect, it, vi } from "vitest";
import {
  renderTicketConfirmationEmail,
  type TicketConfirmationEmail,
} from "./email";
import { eventHasStarted } from "./event-clock";

const individual = {
  to: "buyer@example.com",
  tierLabel: "Standard",
  ticketCode: "ABC123",
};

const cases: [string, TicketConfirmationEmail, string][] = [
  ["an individual buyer", individual, "Claim your ticket"],
  [
    "a family pack attendee",
    { ...individual, tierLabel: "Family & Friends Pack — Standard weekend" },
    "Claim your ticket",
  ],
  [
    "a family pack buyer",
    {
      to: "buyer@example.com",
      tierLabel: "Family & Friends Pack (2 weekend tickets)",
      groupTickets: [
        { name: "Guest", email: "guest@example.com", code: "DEF456" },
      ],
    },
    "Each attendee claims theirs",
  ],
];

describe("ticket confirmation once the one-week-out email has stopped", () => {
  afterEach(() => vi.useRealTimers());

  it.each(cases)("tells %s how to claim", (_who, data, link) => {
    vi.useFakeTimers({ now: new Date("2026-11-07T18:00:00Z") });
    expect(eventHasStarted()).toBe(true);

    const { html, text } = renderTicketConfirmationEmail(data);
    expect(html).toContain("claimed ticket is");
    expect(html).toContain(
      `<a href="https://metagame.games/account?tab=tickets">${link}</a>`,
    );
    expect(text).toContain(
      `${link} (https://metagame.games/account?tab=tickets)`,
    );
    expect(text).toContain("claimed ticket is");
  });
});
