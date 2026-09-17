// Builds emails/announcement-bootcamp.html (the Trading Bootcamp list's version)
// from emails/announcement.html, so the two never drift. Re-run after editing the base:
//   node scripts/announcement-bootcamp.mjs
import { readFileSync, writeFileSync } from "node:fs";

const dir = new URL("../emails/", import.meta.url);
let html = readFileSync(new URL("announcement.html", dir), "utf8");

function swap(anchor, replacement) {
  if (html.split(anchor).length !== 2) throw new Error(`anchor not found exactly once: ${anchor.slice(0, 60)}`);
  html = html.replace(anchor, replacement);
}

swap(
  "      Early bird tickets available through September 30\n",
  "      Arbor also runs non-trading events: Metagame 2026, Nov 6&ndash;8 in Berkeley. Early bird tickets through September 30\n",
);

const card = `          <table
            role="presentation"
            class="container"`;
swap(
  `        <td align="center" style="padding: 24px 12px">\n${card}`,
  `        <td align="center" style="padding: 24px 12px">
          <table
            role="presentation"
            class="container"
            width="600"
            cellpadding="0"
            cellspacing="0"
            border="0"
            style="width: 600px; max-width: 600px"
          >
            <tr>
              <td
                align="center"
                style="
                  padding: 4px 28px 22px 28px;
                  font-family: Arial, Helvetica, sans-serif;
                  font-size: 16px;
                  line-height: 1.55;
                  color: #173059;
                "
              >
                Did you know Arbor also runs non-trading events? We are
                excited to announce our second annual Metagame Conference!
              </td>
            </tr>
          </table>
${card}`,
);

swap(
  `                  Metagame 2026
                </div>
                <table`,
  `                  Metagame 2026
                </div>
                <div
                  style="
                    margin: 8px 0 0 0;
                    font-family: 'Courier New', Courier, monospace;
                    font-size: 12px;
                    letter-spacing: 2px;
                    text-transform: uppercase;
                    color: #8a827d;
                  "
                >
                  by Arbor
                </div>
                <table`,
);

writeFileSync(new URL("announcement-bootcamp.html", dir), html);
