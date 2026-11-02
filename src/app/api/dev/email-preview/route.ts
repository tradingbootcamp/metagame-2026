import { readFile } from "node:fs/promises";
import path from "node:path";
import { notFound } from "next/navigation";

// Dev-only preview for the hand-written emails in emails/. Their image URLs
// point at the deployed site (as sent mail must), which 404s until the site
// is live — so this serves a copy with the host swapped to this dev server.
// Open http://localhost:3000/api/dev/email-preview?file=announcement
export const runtime = "nodejs";

const DIR = path.join(process.cwd(), "emails");
const SITE = /https:\/\/(www\.)?metagame\.games/g;

export async function GET(req: Request) {
  if (process.env.NODE_ENV === "production") notFound();
  const file = new URL(req.url).searchParams.get("file") ?? "announcement";
  if (!/^[a-z0-9-]+$/i.test(file))
    return new Response("bad file", { status: 400 });
  let html: string;
  try {
    html = await readFile(path.join(DIR, `${file}.html`), "utf8");
  } catch {
    return new Response(`no emails/${file}.html`, { status: 404 });
  }
  const origin = new URL(req.url).origin;
  return new Response(html.replace(SITE, origin), {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}
