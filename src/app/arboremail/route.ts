import { emailWebView } from "@/lib/email-web-view";

// Unlisted web view of the Trading Bootcamp list's version of the announcement.
export const runtime = "nodejs";
export const dynamic = "force-static";

export const GET = () =>
  emailWebView(
    "announcement-bootcamp.html",
    "Arbor Trading Bootcamp, EO Physical Return Address, 86-90 Paul Street, London, EC2A 4NE, United Kingdom",
  );
