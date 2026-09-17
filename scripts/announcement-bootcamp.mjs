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

swap(
  `                  We&rsquo;re back! Metagame is a weekend conference devoted to
                  games, in the broadest sense of the word: any experience`,
  `                  <div style="margin: 0 0 14px 0">
                    Did you know Arbor also runs non-trading events? We are
                    excited to announce our second annual Metagame Conference!
                  </div>
                  Metagame 2026 is a weekend conference dedicated to games and
                  strategy in all shapes and flavors. If you like our bootcamps,
                  we think you&rsquo;d enjoy Metagame and would love to see you
                  there! It&rsquo;s a conference devoted to games in the broadest
                  sense of the word: any experience`,
);

swap(
  `                  Metagame 2026
                </div>
                <table`,
  `                  Metagame 2026
                </div>
                <table
                  role="presentation"
                  cellpadding="0"
                  cellspacing="0"
                  border="0"
                  style="margin-top: 12px"
                >
                  <tr>
                    <td
                      valign="middle"
                      style="
                        padding: 0 10px 0 0;
                        font-family: Arial, Helvetica, sans-serif;
                        font-size: 18px;
                        font-weight: bold;
                        line-height: 1.2;
                        color: #173059;
                      "
                    >
                      Presented by
                    </td>
                    <td valign="middle" style="padding: 0 7px 0 0; line-height: 0">
                      <img
                        src="https://www.trading.camp/trading-bootcamp/arbor-tree-logo-medlight.png"
                        width="36"
                        height="32"
                        alt=""
                        style="display: block; width: 36px; height: 32px; border: 0"
                      />
                    </td>
                    <td
                      valign="middle"
                      style="
                        font-family: Arial, Helvetica, sans-serif;
                        font-size: 22px;
                        font-weight: bold;
                        line-height: 1.2;
                        color: #173059;
                      "
                    >
                      Arbor
                    </td>
                  </tr>
                </table>
                <table`,
);

swap(
  `                  or reply to this email.`,
  `                  or email
                  <a
                    href="mailto:team@metagame.games"
                    style="color: #d8502b; font-weight: bold; text-decoration: none"
                    >team@metagame.games</a>.`,
);

swap(
  `                  You received this email because you subscribed to our list.
                  You can`,
  `                  You received this email because you subscribed to updates from
                  Arbor Trading Bootcamp. Metagame is another Arbor event, and we
                  thought you&rsquo;d want to hear about it. You can`,
);

writeFileSync(new URL("announcement-bootcamp.html", dir), html);
