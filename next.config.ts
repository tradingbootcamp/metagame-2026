import type { NextConfig } from "next";
import {
  PHASE_DEVELOPMENT_SERVER,
  PHASE_PRODUCTION_BUILD,
} from "next/constants";
import { buildErd } from "./scripts/build-erd.mjs";
import { validateEnv } from "./src/env";
import { RFP_FORM_URL } from "./src/v2/lib/links";

// Warn (don't fail) on missing required env vars at build / dev start.
validateEnv();

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/posters": ["./assets/posters/*.pdf"],
    // The sent-email catalog reads emails/ at request time. Keys are globs,
    // so `[slug]` can't be spelled out.
    "/backstage/emails": ["./emails/*"],
    "/backstage/emails/**": ["./emails/*"],
  },
  // public/ files are served max-age=0 by default, so the hero backdrop
  // revalidated on every visit. Filenames are stable; bump them if the
  // images change.
  headers: async () => [
    {
      source: "/images/puzzle/:path*",
      headers: [
        { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
      ],
    },
  ],
  redirects: async () => [
    // The team tools were /admin until the permission system made them
    // everyone's; bookmarks and old links keep working.
    { source: "/admin", destination: "/backstage", permanent: true },
    {
      source: "/admin/:path*",
      destination: "/backstage/:path*",
      permanent: true,
    },
    // The speaker committee board moved under /backstage with the other tools.
    {
      source: "/speaker_committee",
      destination: "/backstage/speaker-committee",
      permanent: true,
    },
    // The committee board replaced /grade's own overview; the rubric for one
    // proposal stays at /grade/<id>.
    {
      source: "/grade",
      destination: "/backstage/speaker-committee",
      permanent: true,
    },
    // Key dates used to be its own page.
    { source: "/key-dates", destination: "/#key-dates", permanent: true },
    // Short link to the session-proposal (RFP) Airtable form.
    { source: "/propose", destination: RFP_FORM_URL, permanent: false },
    // Short links into Standard checkout land on the buy modal (/#buy), which
    // prefills the promo or referral code and still takes the other one, so a
    // referred friend with a better comp code can use it. The modal links on
    // to /api/checkout/stripe.
    { source: "/buy", destination: "/#buy", permanent: false },
    {
      source: "/buy/:promo",
      destination: "/?promo=:promo#buy",
      permanent: false,
    },
    {
      source: "/invite/:ref",
      destination: "/?ref=:ref#buy",
      permanent: false,
    },
  ],
  // Let LAN devices (phones) load /_next dev assets; without this the Network URL serves HTML but never hydrates.
  allowedDevOrigins: ["10.*.*.*", "192.168.*.*", "157.230.177.203"],
};

export default function config(phase: string): NextConfig {
  // The ER diagram under /backstage/schema/erd is generated from drizzle/*.sql.
  // Done here rather than in a package.json script so it runs however the
  // site is built (pnpm build, next build, Vercel).
  if (phase === PHASE_PRODUCTION_BUILD || phase === PHASE_DEVELOPMENT_SERVER) {
    buildErd();
  }
  return nextConfig;
}
