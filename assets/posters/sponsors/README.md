# Poster sponsor footers

Each poster gets an opaque PNG drawn over its footer: the thank-you heading, then Gold and Silver logos on the top row and Patrons below, unlabeled (size and position carry the tier). The logos are the sponsors' own files, contained proportionally without redrawing.

To change the roster or layout, edit `scripts/build-poster-sponsors.mjs` and run `node scripts/build-poster-sponsors.mjs` (Playwright's Chromium, or `SHOT_BROWSER=<path>`). It rewrites the four PNGs at 288 dpi. Commit them and check a render of each poster.

| Variant      | Footer box on the source page (points, from top-left) |
| ------------ | ----------------------------------------------------- |
| D20 Letter   | x 89, top 688, width 434, height 84                   |
| D20 13x19    | x 136, top 1144, width 664, height 186                |
| Chess Letter | x 35, top 511, width 300, height 78                   |
| Chess 13x19  | x 55, top 782, width 465, height 126                  |
