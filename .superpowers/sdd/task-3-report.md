# Task 3 Report: Remove Dynamic Thumbnail APIs

## RED/GREEN evidence

- RED: `npm test -- src/lib/storage/thumbnails.test.ts src/lib/storage/public-thumbnail.test.ts scripts/lib/static-gallery-export-state.test.mjs scripts/apps-export-static-gallery.fixture.test.mjs` failed 4 tests. The failures showed the old `/api/thumbnail` fallback, the old `/api/app-thumbnail` public URL, and exporter network fetches for legacy internal URLs.
- RED follow-up: `npm test -- src/lib/storage/thumbnails.test.ts` failed the added capture-rejection case with `Error: capture failure`.
- GREEN: the same focused suite plus repository/static-public-app tests passed with 6 files and 42 tests.
- GREEN follow-up: `npm test -- src/lib/storage/thumbnails.test.ts` passed 14/14 after capture rejection was normalized to `null`.

## Changes

- Deleted runtime thumbnail routes and their route test: `src/app/api/thumbnail/route.ts`, `src/app/api/app-thumbnail/[id]/[version]/route.ts`, and `src/app/api/app-thumbnail/[id]/[version]/route.test.ts`.
- Deleted `src/lib/storage/generated-thumbnail.ts`; auto thumbnail failure now returns placeholder/null, and public conversion never creates a runtime route URL.
- Kept embedded data URL validation/decoding for admin/export materialization while `toPublicThumbnailUrl()` returns `null` for embedded data.
- Moved the capture hostname label helper into `src/lib/storage/page-capture.ts`.
- Exporter reuses only a normalized prior `/app-thumbnails/<basename>` for the same app ID when an actual regular file exists; legacy internal URLs are never fetched. Missing legacy assets become `null`.
- Added focused exporter fixtures for reuse, no-file clearing, and zero network requests. Kept defensive legacy-route rejection constants/tests.
- Deleted exactly the three verified stale files: `class-journal2-thumb.png`, `paps-tracker-thumb.png`, and `talking-vacab-quiz-thumb.png`.
- Updated `README.md`. The existing update-history amendment in `docs/superpowers/plans/2026-07-11-hvc-hardening-sync-ui.md` was preserved.

## Verification

- `npm test`: passed, 31 files and 171 tests.
- `npm run lint`: passed.
- `node --check scripts/apps-export-static-gallery.mjs`: passed.
- `git diff --check`: passed.
- `rg -n 'buildGeneratedThumbnailUrl|/api/thumbnail|/api/app-thumbnail|generated-thumbnail' src scripts README.md`: only defensive constants and legacy rejection fixtures/tests remained; no route or producer remained.
- Snapshot/assets check: 56 apps, 56 unique IDs, 56 referenced thumbnails, 0 missing referenced thumbnails, 56 files, 0 stale files.
- Compiled route manifest: no thumbnail routes; `/page` is present; no built `.next/server/app/**/*thumbnail*` files.
- No production DB access, workflow dispatch, network publication, push, or deploy was performed.

## Self-review and concerns

- `next-env.d.ts` was left untouched in the commit scope as required, although local Next commands regenerated its existing working-tree change.
- `npm run build` compiled successfully but failed during the existing TypeScript check in `src/lib/security/remote-url.ts:1`: `node:dns/promises` has no exported `LookupAddress` under the installed type definitions. This is outside Task 3 ownership and was not changed. The generated route manifest still confirms both dynamic thumbnail APIs are absent, but the build command itself is not green until that pre-existing type issue is resolved.
