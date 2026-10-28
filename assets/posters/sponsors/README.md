# Poster sponsor footer

Approved visually by David on October 28, 2026 at 04:43 UTC, including the supplied Walrus Security mark. Spire PR #342 remains a separate homepage/brand-kit change; these posters work independently of it.

## Roster

- Gold: Rogue Signal (also called Druid), Goodhart Labs.
- Silver: d_model, WalrusFi.
- Patron: Arbor, Francisco San, Manifund, Outside the Asylum (Isaac King), The Spire.

This is the roster confirmed in David's current sponsor audit, with The Spire separately confirmed as Patron. Aliases are one sponsor each. No Night Market exhibitors were added. WalrusFi's exact supplied source is already on `main` through PR #331 and is reused rather than copied here.

## Original artwork

- Existing seven marks are read directly from their existing website or brand-kit paths by `scripts/build-poster-sponsors.mjs`. They are proportionally contained in the footer, without recoloring or redrawing.
- WalrusFi uses `brand-kit/Metagame_2026_Brand_Kit/sponsors/walrusfi/logo-nav.svg`, merged in PR #331. Its supplied artwork reads **Walrus Security**. The sponsor audit calls the sponsor WalrusFi; the supplied brand text is preserved, not rewritten. This naming difference was explicitly presented in the approved visual review.
- Spire uses `brand-kit/Metagame_2026_Brand_Kit/sponsors/spire/spire-logo-3.svg`, the same canonical path and unchanged David-supplied bytes as PR #342. This PR includes that one shared source asset so it works before #342 merges; it does not include #342's homepage changes. The identical path avoids a second poster-only source copy after both merge. SHA-256: `02a7252a7238b907637cb71b6fccbac7a0addbb656dcf3c1a280b3690a134e10`.
- Existing source PDFs in `assets/posters/` remain byte for byte unchanged, including original artwork, text, QR geometry, and dimension/hash checks.

## Composition

Four opaque PNG footer overlays are generated at 288 dpi from actual source logos. Gold and Silver are labeled side by side, with a single Patron row underneath. Gold marks are larger than Silver, and Silver larger than Patron. The original thank-you heading is retained. Only the existing sponsor/footer area is covered. New PNGs are embedded before the existing QR masking/vector rendering and print-margin composition.

| Variant      | Source-page footer box (points, top-left origin) |
| ------------ | ------------------------------------------------ |
| D20 Letter   | x 89, top 688, width 434, height 84              |
| D20 13x19    | x 136, top 1144, width 664, height 186           |
| Chess Letter | x 35, top 511, width 300, height 78              |
| Chess 13x19  | x 55, top 782, width 465, height 126             |

Rebuild with `node scripts/build-poster-sponsors.mjs`, using the installed Chromium or `SHOT_BROWSER`. The checked PNGs are the reviewed print assets. The heading/tier labels use Consolas; original sponsor lettering stays inside its supplied artwork.

Run `POSTER_RENDER_CHECK=1 pnpm exec vitest run src/lib/poster-pdf.test.ts` and visually inspect all four renders. This validates exact dimensions, the Berkeley tracking QR, no surviving second QR, and white quarter-inch print margins. No tracking records or discount definitions are created or changed.

The `/posters` iframe and download action both call `/api/posters`, so they use these same composed designs. The page's 13x19 chess preview uses the matching 19:13 landscape ratio. `next.config.ts` explicitly includes the footer PNGs in the poster API's deployment bundle.
