import type { NextConfig } from "next";
import { validateEnv } from "./src/env";

// Warn (don't fail) on missing required env vars at build / dev start.
validateEnv();

const nextConfig: NextConfig = {
  // Let LAN devices (phones) load /_next dev assets; without this the Network URL serves HTML but never hydrates.
  allowedDevOrigins: ["10.*.*.*", "192.168.*.*"],
};

export default nextConfig;
