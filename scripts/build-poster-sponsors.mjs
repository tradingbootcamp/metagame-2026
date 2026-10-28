// Rebuild only the sponsor footer overlays; the supplied poster PDFs stay intact.
import { readFileSync, existsSync } from "node:fs";
import { chromium } from "playwright";
const base = "assets/posters/sponsors";
const image = (file) => {
  const mime = file.endsWith(".svg") ? "image/svg+xml" : "image/png";
  return `data:${mime};base64,${readFileSync(file).toString("base64")}`;
};
const sources = {
  rogue: "public/images/sponsors/rogue_signal/rogue_signal_horiz.svg",
  goodhart:
    "public/images/sponsors/goodhart-labs-logos/svg/goodhart-labs-stacked-black.svg",
  dmodel: "public/images/sponsors/dmodel_logo.png",
  walrus: "brand-kit/Metagame_2026_Brand_Kit/sponsors/walrusfi/logo-nav.svg",
  arbor: "brand-kit/Metagame_2026_Brand_Kit/sponsors/arbor.png",
  francisco: "public/images/sponsors/francisco_san_logo.png",
  manifund: "public/images/sponsors/manifund_logo.png",
  asylum: "public/images/sponsors/outside_the_asylum.png",
  spire: "brand-kit/Metagame_2026_Brand_Kit/sponsors/spire/spire-logo-3.svg",
};
const variants = {
  "d20-letter": { width: 434, height: 84, scale: 1, chess: false },
  "d20-13x19": { width: 664, height: 186, scale: 664 / 434, chess: false },
  "chess-letter": { width: 300, height: 78, scale: 1, chess: true },
  "chess-13x19": { width: 465, height: 126, scale: 1.55, chess: true },
};
const installedChrome = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const browser = await chromium.launch({
  executablePath:
    process.env.SHOT_BROWSER ??
    (existsSync(installedChrome) ? installedChrome : undefined),
});
for (const [name, variant] of Object.entries(variants)) {
  const { width, height, scale, chess } = variant;
  const w = width / scale;
  const h = chess ? 78 : 84;
  const top = (height / scale - h) / 2;
  const gold = w * 0.59;
  const label = (text, x, y, size, spacing = 1) =>
    `<text x="${x}" y="${y}" text-anchor="middle" font-family="Consolas, monospace" font-weight="bold" font-size="${size}" letter-spacing="${spacing}" fill="#17335a">${text}</text>`;
  const logo = (key, cx, cy, maxWidth, maxHeight) =>
    `<image href="${image(sources[key])}" x="${cx - maxWidth / 2}" y="${cy - maxHeight / 2}" width="${maxWidth}" height="${maxHeight}" preserveAspectRatio="xMidYMid meet"/>`;
  const patronWidth = w / 5;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="${width}" height="${height}" fill="${chess ? "#fdf9ee" : "#fefaf1"}"/>
    <g transform="scale(${scale}) translate(0 ${top})">
      ${label("THANK YOU TO OUR SPONSORS", w / 2, 7, chess ? 5.4 : 6.2, chess ? 1 : 1.5)}
      ${label("GOLD", gold / 2, 18, 5.3)}
      ${label("SILVER", gold + (w - gold) / 2, 18, 5.3)}
      ${logo("rogue", gold * 0.26, 34, chess ? 76 : 102, chess ? 23 : 25)}
      ${logo("goodhart", gold * 0.74, 34, chess ? 76 : 102, chess ? 23 : 25)}
      ${logo("dmodel", gold + (w - gold) * 0.25, 34, chess ? 49 : 75, chess ? 16 : 20)}
      ${logo("walrus", gold + (w - gold) * 0.75, 34, chess ? 49 : 75, chess ? 16 : 20)}
      ${label("PATRON", w / 2, chess ? 53 : 56, 5.3)}
      ${["arbor", "francisco", "manifund", "asylum", "spire"].map((key, i) => logo(key, patronWidth * (i + 0.5), chess ? 66 : 71, patronWidth - (chess ? 7 : 12), chess ? 16 : 18)).join("")}
    </g>
  </svg>`;
  const page = await browser.newPage({
    viewport: { width, height },
    deviceScaleFactor: 4,
  });
  await page.setContent(`<style>body{margin:0}</style>${svg}`);
  await page.evaluate(() => document.fonts.ready);
  await page.locator("svg").screenshot({ path: `${base}/${name}.png` });
  await page.close();
  console.log(`${name}: ${width} × ${height} pt, 288 dpi`);
}
await browser.close();
