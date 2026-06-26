// Stripe Payment Links are public, no-auth checkout URLs — no secret key or API
// call is involved, so both test- and live-mode links are safe to commit. Live
// links serve only in production; local dev and Vercel previews use the sandbox
// (test_) links so testing never fires a real charge.
//
// BTC prices are hardcoded (no live conversion). The actual BTC charge is now
// code-driven: full price by default, lowered by a validated Airtable discount
// code (see src/lib/discount-codes.ts). `earlyBird.btc` here is just the
// advertised default the homepage button shows.

export type StripeMode = "test" | "live";

const stripeMode: StripeMode =
  process.env.VERCEL_ENV === "production" ? "live" : "test";

/** A price point in both currencies. usd = dollars, btc = whole bitcoin. */
export type Price = {
  usd: number;
  btc: number;
};

export type TicketTier = {
  id: string;
  label: string;
  prices: {
    full: Price; // pre-discount, shown struck-through for anchoring
    earlyBird: Price; // what they pay once the promo / BTC discount applies
  };
  promoCode?: string; // Stripe promotion code, prefilled into the checkout URL
  links: Record<StripeMode, string>;
};

export const ticketTiers: TicketTier[] = [
  {
    id: "standard",
    label: "Standard",
    prices: {
      full: { usd: 425, btc: 0.0065 },
      // The actual BTC charge is now code-driven (Airtable "Discount Codes" table);
      // earlyBird.btc here is just the advertised default the homepage button shows,
      // matching the seeded EARLYBIRD code. Don't read it for the charge amount.
      earlyBird: { usd: 325, btc: 0.005 },
    },
    // Must match the promotion code string created in Stripe ($100-off coupon).
    promoCode: "EARLYBIRD",
    links: {
      test: "https://buy.stripe.com/test_7sY8wO7kj5J5cF56J4fw402",
      live: "https://buy.stripe.com/fZu8wO5cb2wT5cD6J4fw405",
    },
  },
];

/** Look up a tier by id; undefined when none matches. */
export function getTicket(id: string): TicketTier | undefined {
  return ticketTiers.find((t) => t.id === id);
}

// ── Supporter tier ──────────────────────────────────────────────────────────
// A pay-what-you-want tier (floor $525 / ₿0.0087) sitting alongside the standard
// ticket. USD checkout uses one Stripe Payment Link per quick-pick amount; BTC
// checkout goes through the OpenNode modal with an editable amount.

/** One quick-pick amount: a USD Stripe preset + its hardcoded BTC equivalent. */
export type SupporterChip = {
  usd: number; // Stripe price preset (dollars)
  btc: number; // ~equivalent whole BTC, hardcoded
  links: Record<StripeMode, string>; // Payment Link for this chip's custom-amount Stripe price
};

export type SupporterTier = {
  id: "supporter";
  label: string;
  floor: Price; // minimum accepted in either currency
  defaultChipUsd: number; // which chip is selected when the modal opens
  chips: SupporterChip[];
};

// TODO_PAYMENT_LINK: Brian — fill in each chip's test/live Stripe Payment Link
// below (the only thing left to fill in here). Grep `TODO_PAYMENT_LINK` to find
// them. Until then the UI renders fine but USD checkout opens nothing.
export const supporterTier: SupporterTier = {
  id: "supporter",
  label: "Supporter",
  floor: { usd: 525, btc: 0.0087 },
  defaultChipUsd: 650,
  chips: [
    {
      usd: 525,
      btc: 0.0087,
      links: { test: "TODO_PAYMENT_LINK", live: "TODO_PAYMENT_LINK" },
    },
    {
      usd: 650,
      btc: 0.0108,
      links: { test: "TODO_PAYMENT_LINK", live: "TODO_PAYMENT_LINK" },
    },
    {
      usd: 750,
      btc: 0.0124,
      links: { test: "TODO_PAYMENT_LINK", live: "TODO_PAYMENT_LINK" },
    },
    {
      usd: 1024,
      btc: 0.017,
      links: { test: "TODO_PAYMENT_LINK", live: "TODO_PAYMENT_LINK" },
    },
  ],
};

/**
 * The supporter chip's Payment Link for the active Stripe mode, or null when it's
 * still an unfilled placeholder — so the UI can render without navigating nowhere.
 */
export function supporterChipUrl(chip: SupporterChip): string | null {
  const link = chip.links[stripeMode];
  if (!link || link === "TODO_PAYMENT_LINK") return null;
  return link;
}

/**
 * Checkout URL for the active Stripe mode, with the early-bird promo code
 * prefilled. Returns null when no link is configured for this mode yet, so the
 * UI can hide the CTA rather than link somewhere dead.
 */
export function ticketUrl(tier: TicketTier): string | null {
  const base = tier.links[stripeMode];
  if (!base) return null;
  return tier.promoCode
    ? `${base}?prefilled_promo_code=${tier.promoCode}`
    : base;
}
