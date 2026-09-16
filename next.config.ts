import type { NextConfig } from "next";
import { validateEnv } from "./src/env";

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
  // Key dates used to be its own page.
  redirects: async () => [
    { source: "/key-dates", destination: "/#key-dates", permanent: true },
  ],
  // Let LAN devices (phones) load /_next dev assets; without this the Network URL serves HTML but never hydrates.
  allowedDevOrigins: ["10.*.*.*", "192.168.*.*", "157.230.177.203"],
};

export default nextConfig;
