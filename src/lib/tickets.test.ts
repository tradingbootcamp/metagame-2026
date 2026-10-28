import { describe, expect, it } from "vitest";
import {
  NIGHT_MARKET_BOOTH_LABEL,
  dayPasses,
  isAdmissionLabel,
  supporterTier,
  ticketTiers,
  tierLabelForStripeCheckout,
} from "./tickets";

describe("tierLabelForStripeCheckout", () => {
  it("prefers the tier in site checkout metadata", () => {
    expect(
      tierLabelForStripeCheckout({
        metadata: { tier: "standard" },
        paymentLinkUrl: undefined,
        productName: "Metagame 2026",
      }),
    ).toBe("Standard");
    expect(
      tierLabelForStripeCheckout({
        metadata: { tier: "day-pass", day: "saturday" },
        paymentLinkUrl: undefined,
        productName: "Metagame 2026 Day Pass - Saturday",
      }),
    ).toBe("Saturday Day Pass");
  });

  it("matches old Payment Links by URL", () => {
    expect(
      tierLabelForStripeCheckout({
        metadata: null,
        paymentLinkUrl: supporterTier.chips[0].links.live,
        productName: "Metagame 2026 -- Supporter",
      }),
    ).toBe(supporterTier.label);
    expect(
      tierLabelForStripeCheckout({
        metadata: {},
        paymentLinkUrl: dayPasses[0].links.test,
        productName: "whatever",
      }),
    ).toBe(dayPasses[0].label);
  });

  it("maps dashboard-made checkouts by product name, case-insensitively", () => {
    expect(
      tierLabelForStripeCheckout({
        metadata: null,
        paymentLinkUrl: undefined,
        productName: "Metagame 2026",
      }),
    ).toBe(ticketTiers[0].label);
    expect(
      tierLabelForStripeCheckout({
        metadata: null,
        paymentLinkUrl: undefined,
        productName: "Metagame 2026 - Guest of Honor",
      }),
    ).toBe("Guest of Honor");
    expect(
      tierLabelForStripeCheckout({
        metadata: null,
        paymentLinkUrl: undefined,
        productName: "  metagame 2026 -- SUPPORTER ",
      }),
    ).toBe(supporterTier.label);
  });

  it("falls back to the raw product name, or undefined without one", () => {
    expect(
      tierLabelForStripeCheckout({
        metadata: null,
        paymentLinkUrl: "https://buy.stripe.com/unknown",
        productName: "Some New Product",
      }),
    ).toBe("Some New Product");
    expect(
      tierLabelForStripeCheckout({
        metadata: null,
        paymentLinkUrl: undefined,
        productName: undefined,
      }),
    ).toBeUndefined();
  });
});

describe("isAdmissionLabel", () => {
  it("treats the Night Market booth as a purchase, not an admission", () => {
    const label = tierLabelForStripeCheckout({
      metadata: null,
      paymentLinkUrl: undefined,
      productName: "Metagame Night Market Booth",
    });
    expect(label).toBe(NIGHT_MARKET_BOOTH_LABEL);
    expect(isAdmissionLabel(label)).toBe(false);
  });

  it("treats every ticket tier, and an unknown product, as an admission", () => {
    for (const label of [
      "Standard",
      "Supporter",
      "Guest of Honor",
      "Saturday Day Pass",
      "Some New Product",
      undefined,
    ]) {
      expect(isAdmissionLabel(label)).toBe(true);
    }
  });
});
