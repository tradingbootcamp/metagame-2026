import { emailWebView } from "@/lib/email-web-view";

// Unlisted web view of the announcement email, so it can be shared without
// a mail client.
export const runtime = "nodejs";
export const dynamic = "force-static";

export const GET = () =>
  emailWebView(
    "announcement.html",
    "Metagame LLC, EO Physical Return Address, 86-90 Paul Street, London, EC2A 4NE, United Kingdom",
  );
