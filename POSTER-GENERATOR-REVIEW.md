# Poster generator review

Direct route: `/posters`. Public, no login, no homepage navigation link, noindex metadata. `GET /api/posters` accepts only an area selection, design, and size. It does not accept a destination URL or arbitrary tracking slug and performs no writes. Existing admin link creation and `/go` attribution behavior are unchanged.

Promo codes: `/go/<slug>?promo=CODE` forwards the code to the destination, the homepage stores it in localStorage with the last-touch UTMs, and the Standard ticket buttons add `promo=CODE` to the Stripe checkout URL, which already applies a linked code and shows the code box if it isn't redeemable. A stored code stays until another link sets one. Staff with `promo.manage` see a promo dropdown on `/posters`, fed by the promo tool's live codes, which puts `?promo=` on the QR; no tracking row is created or changed, and the same area link prints with or without a code.

Supported formats: D20 in portrait Letter and 13×19; chess in landscape Letter and 13×19. Every design and size pair maps to its own pinned source file in `assets/posters`.

## Existing admin link setup

The server reads only `Area / City` from MARKETING (`tblwmzJBpXq6GYsdY`) in the existing base, with pagination. Values are trimmed, deduplicated, sorted, and the three approved planning placeholders are omitted. No venues, people, record IDs, notes, or credentials are serialized to the public page. The browser receives only labels, selection values, and availability. The catalog uses a 60-second server cache with shared concurrent reads; the selected link is reread before each download.

An eligible tracking row must have:

- Source `poster`, Medium `print`, Campaign `metagame-2026`.
- Placement exactly matching the area label (case-insensitive, trimmed), or `Generic poster` for the generic option.
- Active checked, Template unchecked, a valid unique existing slug.
- Destination `https://metagame.games/` or `https://metagame.games/#tickets`, without other query parameters.

One matching row per area is required. Duplicate matches or duplicate slugs fail closed. The existing `/go/{slug}` mechanism supplies all UTMs, including the area's Placement and the reusable Slug. There is no per-person, venue, design, paper-size, or download attribution.

Read-only follow-up verification confirmed all 35 named area links pass the generator’s actual eligibility function using current tracking records. Berkeley retains its existing slug. The other 34 links were created by the separate setup worker through `/admin/links`. Generic was created through that same UI with Location `Generic poster`, slug `poster`, and record `rec88N3EdciNyHqBv`. Final read-only verification loaded all 200 MARKETING rows and 67 tracking rows, then ran the actual `posterAreas` and `posterChoices` code: 35 named areas plus Generic, all 36 available, zero unavailable. The generator discovers slugs from matching rows and does not hardcode them. Preserve Mox, Lighthaven, carina, spire, and all unrelated links.

Excluded labels: Bay Area — venue TBD; Bay Area — individual stores TBD; East Bay — venue TBD. Generic covers these after setup.

## Verification

The three supported rendered Berkeley PDFs decode to `https://metagame.games/go/berkeley`. Live read-only verification on 2026-10-22 returned HTTP 302 with Location `https://metagame.games/?utm_source=poster&utm_medium=print&utm_campaign=metagame-2026&utm_content=berkeley&utm_term=berkeley`.

Tests cover full redirect UTMs and last-touch replacement, including the missing-slug homepage fallback, unavailable/changed links, invalid requests, provider-error privacy, area filtering, pagination, concurrent reads, duplicate links, exact PDF dimensions, scanning, duplicate-code detection, and print margins. See `assets/posters/README.md` for source provenance, print limitations, and rendering instructions.

Branch publication and a review PR are authorized. Deployment, merge, and Airtable writes are outside this change. The PR uses the existing fork so the same-repository Vercel preview deployment workflow is skipped. The new route becomes public only after separately authorized deployment. Local verification does not require copying production credentials; a fixture-based UI check is distinct from the live Berkeley redirect check.

Local results (2026-10-22): the default production build (`next build`, Turbopack) passed, including TypeScript and all 50 static pages. The `/api/posters` deployment trace includes all three source PDFs. All 260 tests across 37 files passed after the Letter-only chess update, including invalid-pair and supported-pair coverage. The browser confirmed that switching from D20 13×19 to chess resets to Letter and removes 13×19, and a direct chess 13×19 request returns HTTP 400. ESLint had zero errors and one existing Scrabble hook warning. All changed code and documentation passed Prettier; repository-wide formatting flags 518 existing files. Browser checks at desktop and 390px mobile verified 35 areas plus Generic, no login, a successful Berkeley PDF download, unavailable Generic disabled, no horizontal overflow, and noindex. The browser test used a local, read-only Airtable fixture, not production credentials.

The Windows environment required a fixed writable TEMP directory for Vitest workers. The existing ERD build script calls an unavailable bare `pnpm` executable; generating the same ignored ERD output directly with the installed Liam CLI allowed Next type generation. An optional webpack production-build attempt failed in the shared root layout's Next Google-font loader (`Cannot read properties of null (reading '1')`), but the repository's default Turbopack build subsequently passed. No font, ERD, unrelated formatting, or application-wide changes were included to work around these checks.

## Existing admin workflow inspection

Route: `/admin/links`. `page.tsx` checks `adminAccess()` and requires a named identity; `actions.ts` checks `requireAdmin()` again before every creation. Access remains a signed-in admin account or the existing shared-password fallback. The public poster page imports no admin actions and cannot create links.

Required form values are Destination, Platform (`source`), Medium (`medium`), Campaign (the hidden `campaign` input), Location (`placement`), and Short name (`slug`). Label (`internalName`) is optional; Created By comes from the authenticated admin identity. Initial defaults are Homepage for Destination, `metagame-2026` for Campaign when present (otherwise the first available campaign), and blank Platform, Medium, and Location. There is no automatic poster/print default. Short name is suggested from Location with collision avoidance, while Internal name follows Location and Platform. Templates can populate destination and UTMs. After creation, destination/Platform/Medium/Campaign remain selected while Location/slug/internal name reset.

For this generator, use Homepage, Platform `poster`, Medium `print`, Campaign `metagame-2026`, Location equal to the exact area label, or Location `Generic poster` for the generic link. The existing admin action validates allowed destinations, required fields, and slug uniqueness, then calls the existing server-side creator (Active true, Template unset). The public catalog reads and validates those resulting links; it discovers a new link within its 60-second cache window and rereads the selected link before generating a PDF. Existing Berkeley and unrelated venue/person links remain unchanged. No admin implementation changes are needed.

## Final generic verification and deployment prerequisites

A live read-only request to `/go/poster` returned HTTP 302 with Location `https://metagame.games/?utm_source=poster&utm_medium=print&utm_campaign=metagame-2026&utm_content=generic-poster&utm_term=poster`. The public generator matches the existing `Generic poster` placement and discovers its slug; no extra mapping is required.

Deployment remains pending explicit review/authorization. Retain the existing server-only `AIRTABLE_API_KEY` with read access to MARKETING and Tracking Links, and canonical `NEXT_PUBLIC_SITE_URL=https://metagame.games`. Package all three hash-pinned source PDFs through the existing `outputFileTracingIncludes` entry. Keep `/admin/links` protected, omit homepage navigation, and retain noindex for `/posters`. After authorized deployment, smoke-test `/posters`, an area download and Generic download, and verify chess 13×19 returns HTTP 400. No further link creation or data migration is required.
