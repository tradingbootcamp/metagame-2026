import { beforeEach, describe, expect, it, vi } from "vitest";

const resend = vi.hoisted(() => ({ batch: { send: vi.fn() } }));
vi.mock("resend", () => ({
  Resend: class {
    batch = resend.batch;
  },
}));
vi.mock("@/env", () => ({ env: { RESEND_API_KEY: "re_test" } }));

import {
  renderWaitlistPromotionEmail,
  sendWaitlistPromotionEmails,
  type WaitlistPromotion,
} from "./email";

const promotion: WaitlistPromotion = {
  to: "ada@example.com",
  name: "Ada",
  title: "Hidden <Roles> & Friends",
  slug: "hidden-roles",
  when: "Sat, Nov 7, 2:00 PM – 3:00 PM Pacific",
};

beforeEach(() => {
  resend.batch.send.mockReset();
  resend.batch.send.mockResolvedValue({ data: {}, error: null });
});

describe("renderWaitlistPromotionEmail", () => {
  it("names the session and time, with the session's link", () => {
    const { subject, text, html } = renderWaitlistPromotionEmail(promotion);
    expect(subject).toBe("You're off the waitlist: Hidden <Roles> & Friends");
    expect(text).toContain("Hidden <Roles> & Friends");
    expect(text).toContain(promotion.when);
    expect(text).toContain("https://metagame.games/schedule/hidden-roles");
    expect(html).toContain(promotion.when);
    expect(html).toContain(
      'href="https://metagame.games/schedule/hidden-roles"',
    );
  });

  it("escapes what hosts and attendees typed", () => {
    const { html } = renderWaitlistPromotionEmail({
      ...promotion,
      name: "<b>Ada</b>",
    });
    expect(html).toContain("Hidden &lt;Roles&gt; &amp; Friends");
    expect(html).toContain("Hi &lt;b&gt;Ada&lt;/b&gt;,");
    expect(html).not.toContain("<Roles>");
  });

  it("greets a blank name without the gap", () => {
    expect(
      renderWaitlistPromotionEmail({ ...promotion, name: "  " }).text,
    ).toMatch(/^Hi there,/);
  });
});

describe("sendWaitlistPromotionEmails", () => {
  it("sends each person their own email in one request", async () => {
    await sendWaitlistPromotionEmails([
      promotion,
      { ...promotion, to: "grace@example.com" },
    ]);
    expect(resend.batch.send).toHaveBeenCalledTimes(1);
    expect(
      resend.batch.send.mock.calls[0][0].map((e: { to: string }) => e.to),
    ).toEqual(["ada@example.com", "grace@example.com"]);
  });

  it("stays within Resend's batch limit", async () => {
    await sendWaitlistPromotionEmails(Array(101).fill(promotion));
    expect(
      resend.batch.send.mock.calls.map((c) => (c[0] as unknown[]).length),
    ).toEqual([100, 1]);
  });

  it("sends again when Resend rate-limits the request", async () => {
    resend.batch.send
      .mockResolvedValueOnce({
        data: null,
        error: { name: "rate_limit_exceeded", message: "slow down" },
        headers: { "retry-after": "0" },
      })
      .mockResolvedValueOnce({ data: {}, error: null });
    await sendWaitlistPromotionEmails([promotion]);
    expect(resend.batch.send).toHaveBeenCalledTimes(2);
  });

  it("throws what Resend answers with, for the caller to handle", async () => {
    resend.batch.send.mockResolvedValue({
      data: null,
      error: { message: "nope" },
    });
    await expect(sendWaitlistPromotionEmails([promotion])).rejects.toThrow(
      "nope",
    );
  });
});
