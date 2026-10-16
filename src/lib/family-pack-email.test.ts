import { expect, it } from "vitest";
import { renderTicketConfirmationEmail } from "./email";

it("includes each admission in the buyer's confirmation and escapes attendee HTML", () => {
  const email = renderTicketConfirmationEmail({
    to: "buyer@example.com",
    tierLabel: "Family & Friends Pack (4 weekend tickets)",
    usdPaid: 1500,
    groupTickets: [
      { name: "<img src=x>", email: "guest@example.com", code: "ABC123" },
    ],
  });
  expect(email.subject).toContain("Family & Friends Pack");
  expect(email.text).toContain("ABC-123");
  expect(email.text).toContain("guest@example.com");
  expect(email.html).toContain("&lt;img src=x&gt;");
  expect(email.html).not.toContain("<img src=x>");
  expect(email.html).toContain("check in separately");
  expect(email.text).not.toContain("Ticket code: undefined");
});
