# Poster sources and print verification

Artwork exported by Brian on 2026-10-22 as full-page PDFs (vector text over a 288 dpi raster, no QR code in the chess files; the dice files still carry the old `mox-post` code, which the generator masks). These files are server assets, not public downloads. `poster-pdf.ts` pins their SHA-256 hashes and geometry; replacing an asset requires remeasuring its QR box and repeating render verification.

| File                      | Page size (points) | Embedded image | QR box (points, from top-left) |
| ------------------------- | ------------------ | -------------- | ------------------------------ |
| poster_d20_lettersize.pdf | 612 × 792          | 2448 × 3168    | x 91, top 578, 89.5 square     |
| poster_d20_13x19.pdf      | 936 × 1368         | 3744 × 5472    | x 138.5, top 961, 138.5 square |
| poster_chess_letter.pdf   | 792 × 612          | 3168 × 2448    | x 38.5, top 364, 107.5 square  |
| poster_chess_13x19.pdf    | 1368 × 936         | 5472 × 3744    | x 58, top 556, 166 square      |

The QR box sits inside each design's white rounded square (the dice banner's white tile; the chess design's white square with a navy border) with about a point of white around it; the composer keeps a two-module quiet zone inside the box and the tile edge supplies the rest. The generator paints a white mask over the box, then a vector QR with a four-module quiet zone. Artwork and the existing non-tracking domain text remain. No new readable tracking URL is printed. The full original page is embedded proportionally without cropping, within a minimum 18-point (quarter-inch) margin. Both designs are available in Letter and 13×19 (dice portrait, chess landscape).

Effective resolution is 288 dpi of the source page scaled to about 275 dpi after the margin, at every size. The new QR remains vector at every supported size.

Run the regular tests with `pnpm test`. With Poppler's `pdftoppm` on PATH, run `POSTER_RENDER_CHECK=1 pnpm exec vitest run src/lib/poster-pdf.test.ts` (PowerShell: set `$env:POSTER_RENDER_CHECK='1'` first). The render check writes review PDFs and PNGs under ignored `tmp/poster-verification/`, checks exact page dimensions, decodes the new code, checks for a second surviving QR, and checks the white print margins. Visually inspect all four PNGs as well. Tests use the verified Berkeley slug; they do not create or change tracking records.

Verified 2026-10-22 against the four current files: every output decodes to the Berkeley short URL, no second code survives (including at half resolution), and the margins are pure white.
