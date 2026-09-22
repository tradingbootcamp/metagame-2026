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

// Must be NEXT_PUBLIC_* — this module is imported by client components (the ticket
// buttons + modals), and Next only inlines NEXT_PUBLIC_ vars into the browser bundle.
// Plain VERCEL_ENV is undefined client-side, which silently pinned every link to test.
// Vercel auto-exposes NEXT_PUBLIC_VERCEL_ENV for Next.js projects.
const stripeMode: StripeMode =
  process.env.NEXT_PUBLIC_VERCEL_ENV === "production" ? "live" : "test";

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

export const supporterTier: SupporterTier = {
  id: "supporter",
  label: "Supporter",
  floor: { usd: 525, btc: 0.0087 },
  defaultChipUsd: 650,
  chips: [
    {
      usd: 525,
      btc: 0.0087,
      links: {
        test: "https://buy.stripe.com/test_00wcN43430oLcF5aZkfw40b",
        live: "https://buy.stripe.com/4gM9AS5cb1sP8oP6J4fw406",
      },
    },
    {
      usd: 650,
      btc: 0.0108,
      links: {
        test: "https://buy.stripe.com/test_eVq14m0VV2wT7kL8Rcfw40c",
        live: "https://buy.stripe.com/bJeaEW1ZZ2wT48z8Rcfw407",
      },
    },
    {
      usd: 750,
      btc: 0.0124,
      links: {
        test: "https://buy.stripe.com/test_6oU4gy343fjF9sTebwfw40d",
        live: "https://buy.stripe.com/3cIeVc9sr4F1dJ91oKfw408",
      },
    },
    {
      usd: 1024,
      btc: 0.017,
      links: {
        test: "https://buy.stripe.com/test_4gM4gy3435J56gH9Vgfw40e",
        live: "https://buy.stripe.com/4gMaEWcED7RdeNdgjEfw409",
      },
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

// ── Day passes ──────────────────────────────────────────────────────────────
// Single-day admission, USD via Stripe only (no BTC rail). Promo codes are off on
// these links: EARLYBIRD isn't product-restricted and would knock $100 off an $85 pass.

export type DayPass = {
  id: "friday" | "saturday" | "sunday";
  label: string;
  usd: number;
  /** The admitted day — drives the confirmation email's date line + calendar link. */
  date: { long: string; ymd: string };
  links: Record<StripeMode, string>;
};

export const dayPasses: DayPass[] = [
  {
    id: "friday",
    label: "Friday Day Pass",
    usd: 85,
    date: { long: "Friday, November 6, 2026", ymd: "20261106" },
    links: {
      test: "https://buy.stripe.com/test_7sYdR8gUT2wT5cDc3ofw40f",
      live: "https://buy.stripe.com/00w8wOdIH3AX8oPaZkfw40a",
    },
  },
  {
    id: "saturday",
    label: "Saturday Day Pass",
    usd: 200,
    date: { long: "Saturday, November 7, 2026", ymd: "20261107" },
    links: {
      test: "https://buy.stripe.com/test_28E8wOfQP7Rd5cDd7sfw40g",
      live: "https://buy.stripe.com/00wcN43430oLcF5aZkfw40b",
    },
  },
  {
    id: "sunday",
    label: "Sunday Day Pass",
    usd: 200,
    date: { long: "Sunday, November 8, 2026", ymd: "20261108" },
    links: {
      test: "https://buy.stripe.com/test_aFacN4343dbxcF58Rcfw40h",
      live: "https://buy.stripe.com/eVq14m0VV2wT7kL8Rcfw40c",
    },
  },
];

/** Checkout URL for a day pass in the active Stripe mode. */
export function dayPassUrl(pass: DayPass): string | null {
  return pass.links[stripeMode] || null;
}

/** The day pass a Stripe Payment Link URL (either mode) sells, if any. */
export function dayPassForPaymentLinkUrl(
  url: string | null | undefined,
): DayPass | undefined {
  if (!url) return undefined;
  return dayPasses.find((p) => Object.values(p.links).includes(url));
}

/**
 * Tier label ("Standard" / "Supporter" / "Friday Day Pass") for a Stripe Payment Link URL, matched
 * against the links above (both modes). Undefined for an unknown link — e.g. one
 * created in the dashboard outside this file.
 */
export function tierLabelForPaymentLinkUrl(
  url: string | null | undefined,
): string | undefined {
  if (!url) return undefined;
  for (const tier of ticketTiers) {
    if (Object.values(tier.links).includes(url)) return tier.label;
  }
  for (const chip of supporterTier.chips) {
    if (Object.values(chip.links).includes(url)) return supporterTier.label;
  }
  return dayPassForPaymentLinkUrl(url)?.label;
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

/** The same checkout at full price: no promo code prefilled. */
export function fullPriceTicketUrl(tier: TicketTier): string | null {
  return tier.links[stripeMode] || null;
}
