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
    // Key dates used to be its own page.
    { source: "/key-dates", destination: "/#key-dates", permanent: true },
    // Short link to the session-proposal (RFP) Airtable form.
    { source: "/propose", destination: RFP_FORM_URL, permanent: false },
    // Short links into Standard checkout; /buy/<code> pre-applies a promo code.
    {
      source: "/buy",
      destination: "/api/checkout/stripe?tier=standard",
      permanent: false,
    },
    {
      source: "/buy/:promo",
      destination: "/api/checkout/stripe?tier=standard&promo=:promo",
      permanent: false,
    },
  ],
  // Let LAN devices (phones) load /_next dev assets; without this the Network URL serves HTML but never hydrates.
  allowedDevOrigins: ["10.*.*.*", "192.168.*.*", "157.230.177.203"],
};

export default function config(phase: string): NextConfig {
  // The ER diagram under /admin/schema/erd is generated from drizzle/*.sql.
  // Done here rather than in a package.json script so it runs however the
  // site is built (pnpm build, next build, Vercel).
  if (phase === PHASE_PRODUCTION_BUILD || phase === PHASE_DEVELOPMENT_SERVER) {
    buildErd();
  }
  return nextConfig;
}
