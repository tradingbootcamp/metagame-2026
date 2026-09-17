import { readFile } from "node:fs/promises";
import path from "node:path";

// Serves a checked-in email (the same file that gets pasted into EmailOctopus)
// as an unlisted web page, with EO's merge tags neutralised.
export async function emailWebView(file: string, senderInfoLine: string) {
  let html = await readFile(path.join(process.cwd(), "emails", file), "utf8");
  const mergeTags: Record<string, string> = {
    "{{UnsubscribeURL}}": "#",
    "{{RewardsURL}}": "https://emailoctopus.com",
    "{{SenderInfoLine}}": senderInfoLine,
  };
  for (const [tag, value] of Object.entries(mergeTags))
    html = html.replaceAll(tag, value);
  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "x-robots-tag": "noindex, nofollow",
    },
  });
}
