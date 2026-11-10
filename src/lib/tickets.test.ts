import { describe, expect, it } from "vitest";
import {
  EGG_TIER_2027,
  dayPasses,
  isEggTier2027,
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

describe("isEggTier2027", () => {
  it("matches the 2027 Payment Link or a 2027 product", () => {
    expect(
      isEggTier2027({
        paymentLinkUrl: EGG_TIER_2027.links.live,
        productName: "Egg",
      }),
    ).toBe(true);
    expect(
      isEggTier2027({
        paymentLinkUrl: undefined,
        productName: "Metagame 2027 - Egg Tier",
      }),
    ).toBe(true);
    expect(
      tierLabelForStripeCheckout({
        metadata: null,
        paymentLinkUrl: EGG_TIER_2027.links.live,
        productName: "Metagame 2027",
      }),
    ).toBe("Metagame 2027 - Egg Tier");
  });

  it("still matches the retired fixed-price links", () => {
    expect(
      isEggTier2027({
        paymentLinkUrl: EGG_TIER_2027.retiredLinks.live,
        productName: "Egg",
      }),
    ).toBe(true);
    expect(
      tierLabelForStripeCheckout({
        metadata: null,
        paymentLinkUrl: EGG_TIER_2027.retiredLinks.test,
        productName: "Egg",
      }),
    ).toBe("Metagame 2027 - Egg Tier");
  });

  it("leaves 2026 checkouts alone", () => {
    expect(
      isEggTier2027({
        paymentLinkUrl: ticketTiers[0].links.live,
        productName: "Metagame 2026",
      }),
    ).toBe(false);
  });
});
