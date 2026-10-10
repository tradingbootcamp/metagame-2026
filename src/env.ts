/**
 * Central environment-variable contract. validateEnv() (wired into next.config.ts)
 * warns on missing required vars locally so dev works without creds, but throws on
 * Vercel so a misconfigured deploy fails the build instead of silently shipping.
 * Keep in sync with .env.example.
 */

type EnvSpec = {
  name: string;
  required: boolean;
  description: string;
};

const ENV_SPEC: EnvSpec[] = [
  {
    name: "AIRTABLE_API_KEY",
    required: true,
    description:
      "Airtable personal access token (data.records:write) — destination for email signups + ticket purchases. Base/table ids live in src/lib/airtable-config.ts.",
  },
  {
    name: "STRIPE_SECRET_KEY",
    required: false,
    description:
      "Stripe secret key (sk_…) — used server-side by the ticket webhook to verify events and read purchase details. Without it the webhook no-ops.",
  },
  {
    name: "STRIPE_WEBHOOK_SECRET",
    required: false,
    description:
      "Stripe webhook signing secret (whsec_…) for /api/stripe-webhook. Per-endpoint and per-mode; without it the webhook can't verify and no-ops.",
  },
  {
    name: "STRIPE_TEST_99_CODE",
    required: false,
    description:
      "Promo code for the in-prod 99%-off test purchase; live purchases using it get flagged Test in Airtable.",
  },
  {
    name: "STRIPE_PROMO_KEY",
    required: false,
    description:
      "Restricted Stripe key (Promotion codes: Write, Coupons: Read) for the promo-code tool at /admin/promo. Separate from STRIPE_SECRET_KEY on purpose; without it the Stripe rail is unavailable.",
  },
  {
    name: "COMP_COUPON_ID",
    required: false,
    description:
      "Id of the hand-made 100%-off Stripe coupon: the default selection in /admin/promo's coupon dropdown.",
  },
  {
    name: "RESEND_API_KEY",
    required: false,
    description:
      "Resend API key — sends ticket-confirmation + admin-alert emails from the Stripe webhook. Without it email sends no-op with a warning.",
  },
  {
    name: "OPENNODE_KEY",
    required: false,
    description:
      "OpenNode API key for Bitcoin ticket checkout. Without it the BTC routes throw a clear error and BTC checkout is unavailable.",
  },
  {
    name: "GRADER_PASSWORD",
    required: false,
    description:
      "Shared password for the speaker committee's grading tool at /grade. Fallback while the committee gets accounts; admin accounts sign in without it. Remove once they do.",
  },
  {
    name: "GRADER_SESSION_SECRET",
    required: false,
    description:
      "Random string used to sign the /grade session cookie. Rotating it signs everyone out.",
  },
  {
    name: "ADMIN_PASSWORD",
    required: false,
    description:
      "Shared password for the team tools under /admin. Fallback while the team gets accounts; admin accounts sign in without it. Remove once they do.",
  },
  {
    name: "ADMIN_SESSION_SECRET",
    required: false,
    description:
      "Random string used to sign the /admin session cookie. Rotating it signs everyone out.",
  },
  {
    name: "OPENNODE_ENV",
    required: false,
    description:
      'OpenNode environment: "dev" (sandbox, default) or "live". Picks the API + hosted-checkout host.',
  },
  {
    name: "DATABASE_URL",
    required: false,
    description:
      "Neon Postgres connection string (set by the Neon integration on Vercel; a personal branch locally). Without it, anything that touches the database throws a clear error.",
  },
  {
    name: "BETTER_AUTH_SECRET",
    required: false,
    description:
      "Signs Better Auth session cookies and hashes sign-in codes. Any long random string; rotating it signs everyone out. Without it, /login and /account throw a clear error.",
  },
];

let alreadyValidated = false;

/** Warns on missing required env vars locally; throws on Vercel so a bad deploy fails the build. */
export function validateEnv(): void {
  // next.config is evaluated more than once per build; only act once per process.
  if (alreadyValidated) return;
  alreadyValidated = true;

  const missing = ENV_SPEC.filter((v) => v.required && !process.env[v.name]);
  if (missing.length === 0) return;

  const lines = missing.map((v) => `   • ${v.name} — ${v.description}`);
  const summary = `Missing ${missing.length} required environment variable${missing.length > 1 ? "s" : ""}:`;

  // On Vercel, fail the build instead of shipping a deploy that silently drops signups.
  if (process.env.VERCEL) {
    throw new Error([summary, ...lines].join("\n"));
  }

  console.warn(
    [
      "",
      `⚠  ${summary}`,
      ...lines,
      "   Copy .env.example to .env.local and fill these in.",
      "",
    ].join("\n"),
  );
}

/** Typed, server-side accessor for the secret env values. */
export const env = {
  AIRTABLE_API_KEY: process.env.AIRTABLE_API_KEY,
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  STRIPE_TEST_99_CODE: process.env.STRIPE_TEST_99_CODE,
  STRIPE_PROMO_KEY: process.env.STRIPE_PROMO_KEY,
  COMP_COUPON_ID: process.env.COMP_COUPON_ID,
  DATABASE_URL: process.env.DATABASE_URL,
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
} as const;
