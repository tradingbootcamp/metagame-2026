import { readFile } from "node:fs/promises";
import path from "node:path";

// Unlisted web view of the announcement email, so it can be shared without
// a mail client. Serves the checked-in HTML, which is the same file that
// gets pasted into EmailOctopus, with EO's merge tags neutralised.
export const runtime = "nodejs";
export const dynamic = "force-static";

const FILE = path.join(process.cwd(), "emails", "announcement.html");

const MERGE_TAGS: Record<string, string> = {
  "{{UnsubscribeURL}}": "#",
  "{{RewardsURL}}": "https://emailoctopus.com",
  "{{SenderInfoLine}}": "",
};

export async function GET() {
  let html = await readFile(FILE, "utf8");
  for (const [tag, value] of Object.entries(MERGE_TAGS))
    html = html.replaceAll(tag, value);
  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "x-robots-tag": "noindex, nofollow",
    },
  });
}
