// Local hot-reload preview for the ticket-confirmation email template.
// Run from the repo root:  pnpm dlx tsx watch scripts/email-preview.mjs
// Then open http://localhost:4300 — edits to src/lib/email.ts reload live.
// ?variant=comped previews the $0-comp rendering.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { renderTicketConfirmationEmail } from "../src/lib/email.ts";

const PORT = 4300;
const BOOT = String(Date.now()); // changes on each tsx-watch restart → browser reloads

const VARIANTS = {
  paid: {
    to: "brian+test@metagame.games",
    purchaserName: "Brian",
    tierLabel: "Standard",
    usdPaid: 325,
    usdFull: 425,
    discountCode: "EARLYBIRD",
    ticketCode: "T549ND",
    receiptUrl:
      "https://pay.stripe.com/receipts/payment/CAcQARoXChVhY2N0XzFRZVFkMUN0TzQ0M0VHM24o85Kk1AYyBje6uF01PzosFuW6Gl6shlxk8803XXwStlJ3OPQw4aJQaLVcl0X5XmA4B9KybbZRmQNQTd8",
  },
  supporter: {
    to: "brian+test@metagame.games",
    purchaserName: "Brian",
    tierLabel: "Supporter",
    ticketCode: "S9AGHG",
    usdPaid: 650,
    receiptUrl:
      "https://pay.stripe.com/receipts/payment/CAcQARoXChVhY2N0XzFRZVFkMUN0TzQ0M0VHM24o85Kk1AYyBje6uF01PzosFuW6Gl6shlxk8803XXwStlJ3OPQw4aJQaLVcl0X5XmA4B9KybbZRmQNQTd8",
  },
  btc: {
    to: "brian+btctest@metagame.games",
    purchaserName: "Brian BTC Test",
    tierLabel: "Standard",
    btcPaid: 0.005,
    btcFull: 0.0065,
    discountCode: "EARLYBIRD",
    ticketCode: "DK5058",
    receiptUrl:
      "https://checkout.dev.opennode.com/ca86fc1a-2498-4bae-a55f-0a59c45d558d",
  },
  comped: {
    to: "brian+test@metagame.games",
    purchaserName: "Brian",
    tierLabel: "Standard",
    usdPaid: 0,
    usdFull: 425,
    discountCode: "COMP-RICKI",
  },
};

const MIME = {
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".jpg": "image/jpeg",
};

createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (url.pathname === "/boot") {
    res.writeHead(200, { "content-type": "text/plain" }).end(BOOT);
    return;
  }
  // Serve public/ assets so image URLs work before they're deployed
  const ext = extname(url.pathname);
  if (MIME[ext]) {
    try {
      const buf = await readFile(
        join(import.meta.dirname, "..", "public", url.pathname),
      );
      res.writeHead(200, { "content-type": MIME[ext] }).end(buf);
    } catch {
      res.writeHead(404).end();
    }
    return;
  }

  const variant = VARIANTS[url.searchParams.get("variant")] ?? VARIANTS.paid;
  const { subject, html } = renderTicketConfirmationEmail(variant, ""); // "" → local assets
  const nav = Object.keys(VARIANTS)
    .map((v) => `<a href="/?variant=${v}" style="margin-right:12px">${v}</a>`)
    .join("");
  res.writeHead(200, { "content-type": "text/html; charset=utf-8" })
    .end(`<!doctype html>
<title>${subject}</title>
<div style="background:#ddd;padding:8px 16px;font-family:monospace">
  ${nav} &nbsp;|&nbsp; subject: <b>${subject}</b>
</div>
<div style="background:#fff;padding:24px">${html}</div>
<script>
  const boot = "${BOOT}";
  setInterval(async () => {
    try {
      if ((await (await fetch("/boot")).text()) !== boot) location.reload();
    } catch {} // server mid-restart; retry next tick
  }, 700);
</script>`);
}).listen(PORT, () => console.log(`email preview → http://localhost:${PORT}`));
