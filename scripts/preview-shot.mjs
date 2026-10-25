// Screenshot a preview deployment at phone and desktop widths, signed in as
// the seed admin, and flag any page wider than its viewport.
//   node scripts/preview-shot.mjs https://metagame-2026-xxx.vercel.app /backstage/tickets [/more/paths]
// Reads the Vercel bypass key from VERCEL_BYPASS or ~/.config/vercel/metagame-2026-bypass.
// Screenshots land in preview-shots/ (gitignored). Tap a selector before the
// phone shot with TAP='ul li button' to capture a modal. SHOT_BROWSER points
// at a Chromium binary when the one `npx playwright install` fetches is absent.
import { readFileSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright";

const [base, ...paths] = process.argv.slice(2);
if (!base || paths.length === 0) {
  console.error("usage: preview-shot.mjs <base-url> <path> [path...]");
  process.exit(2);
}
const bypass =
  process.env.VERCEL_BYPASS ??
  readFileSync(
    join(homedir(), ".config/vercel/metagame-2026-bypass"),
    "utf8",
  ).trim();
const email = process.env.SHOT_EMAIL ?? "admin@metagame.games";
const password = process.env.SHOT_PASSWORD ?? "metagame";
const out = "preview-shots";
mkdirSync(out, { recursive: true });

const sizes = [
  {
    name: "phone",
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  },
  { name: "desktop", viewport: { width: 1280, height: 900 } },
];

const browser = await chromium.launch({
  executablePath: process.env.SHOT_BROWSER,
});
let overflow = 0;
for (const size of sizes) {
  const ctx = await browser.newContext({
    ...size,
    deviceScaleFactor: 2,
    extraHTTPHeaders: {
      "x-vercel-protection-bypass": bypass,
      "x-vercel-set-bypass-cookie": "true",
    },
  });
  const r = await ctx.request.post(`${base}/api/auth/sign-in/email`, {
    data: { email, password },
    headers: { Origin: base },
  });
  if (!r.ok())
    console.warn(`sign-in ${r.status()} — pages will show the sign-in card`);
  const page = await ctx.newPage();
  for (const path of paths) {
    const slug = (path.replace(/^\/+/, "") || "index").replace(/[^\w-]+/g, "_");
    await page.goto(base + path, { waitUntil: "networkidle", timeout: 60_000 });
    await page.waitForTimeout(400);
    if (size.name === "phone" && process.env.TAP) {
      await page.locator(process.env.TAP).first().click();
      await page.waitForTimeout(500);
    }
    const width = await page.evaluate(
      () => document.documentElement.scrollWidth,
    );
    const wide = width > size.viewport.width;
    if (wide) overflow++;
    const file = `${out}/${slug}-${size.name}.png`;
    await page.screenshot({ path: file, fullPage: !process.env.TAP });
    console.log(
      `${wide ? "OVERFLOW" : "ok"} ${size.name} ${path} width=${width} → ${file}`,
    );
  }
  await ctx.close();
}
await browser.close();
process.exit(overflow ? 1 : 0);
