# Final Hardening Fix Evidence

Date: 2026-07-12
Base review: `23f875c..2228dd3`
Scope: final-review findings only

## Safety Boundary

The exporter no longer uses raw `fetch()` or unbounded `arrayBuffer()` for
image URLs. `scripts/lib/safe-image-download.mjs` calls the existing pinned
`fetchSafeResource()` transport from `src/lib/security/remote-url.ts`, so the
export path shares the application private-IP, mixed-DNS, redirect, timeout,
and request-budget policy. The downloader then enforces 2xx status, a 5 MiB
body limit, PNG/JPEG/WebP/GIF/AVIF MIME, and magic bytes before writing.

`src/lib/security/image-policy.mjs` is the common policy for uploads, admin
embedded images, captured data URLs, and exporter data URLs. Invalid MIME,
SVG, oversized data, invalid base64, and spoofed signatures resolve to a
rejection or placeholder/null and are never materialized.

## Asset Drift

The committed snapshot now contains a sorted `assetManifest` with each local
thumbnail path, byte size, and SHA-256 digest. The admin page and protected
sync route perform the filesystem comparison only on the admin/server path.
Public `/` still reads only the committed JSON and does not read the filesystem,
database, GitHub, metadata, capture, or image optimizer.

Exporter no-op reuse requires a valid canonical `generatedAt`, exact ordered
DB-backed fields, exact local asset set, and matching manifest bytes. Missing,
extra, non-file, duplicate, malformed, or changed assets force regeneration.

## Workflow Correlation

Each lease has a public UUID `request_marker` separate from the private lease
token. The route sends it as the workflow input `request_marker`; the workflow
uses `run-name: Sync Static Gallery :: ${{ inputs.request_marker }}`. Status
polling requests 30 recent dispatch runs and reconciles an active lease only
when `display_title` contains the exact marker. An unmatched or expired marker
remains unknown and cannot adopt an unrelated latest run or a timestamp match.
The lease token is not returned to the browser.

## Migration

`scripts/db-migrate.mjs` now owns a repeatable deployment path:

1. Create `hvc_schema_migrations` if needed.
2. Read sorted `src/db/migrations/*.sql` files.
3. Select only names not recorded in the migration table.
4. Apply each migration and record it in one transaction.

`0000_chemical_morph.sql`, `0001_add_github_url.sql`, and
`0002_static_gallery_sync_leases.sql` use idempotent DDL. Runtime
`CREATE TABLE IF NOT EXISTS` remains only as a compatibility fallback. The
migration tests use temporary fixture directories and read local SQL; no
production database was contacted.

## Focused TDD Evidence

The initial RED run covered the new image policy/downloader, migration
selection, malformed `generatedAt`, asset drift, exact marker, no-op refresh,
and 31/32-character environment boundary. It failed on the expected missing
modules and old behavior. GREEN results:

- `npm test -- src/lib/security/image-policy.test.ts scripts/lib/safe-image-download.test.mjs src/lib/storage/public-thumbnail.test.ts src/lib/storage/thumbnails.test.ts src/lib/security/remote-url.test.ts`: 5 files, 99 tests passed.
- `npm test -- scripts/lib/static-gallery-export-state.test.mjs scripts/apps-export-static-gallery.fixture.test.mjs src/lib/apps/static-gallery-sync-state.test.ts src/lib/apps/static-gallery-asset-integrity.test.ts`: 4 files, 32 tests passed.
- `npm test -- src/app/api/admin/sync-static-gallery/route.test.ts`: 21 tests passed.
- `npm test -- scripts/db-migrate.test.mjs src/lib/env.test.ts src/lib/auth/session.test.ts src/lib/storage/public-thumbnail.test.ts src/lib/storage/thumbnails.test.ts`: 5 files, 51 tests passed.
- `npm test`: 40 files, 273 tests passed.

## Full Verification

- `npm run lint`: passed.
- `npx tsc --noEmit`: passed.
- `npm audit --omit=dev`: found 0 vulnerabilities.
- `node --check scripts/apps-export-static-gallery.mjs`: passed.
- `node --check scripts/lib/safe-image-download.mjs`: passed.
- `node --check scripts/db-migrate.mjs`: passed.
- `npm run build`: passed. Output listed `/` as `○ (Static)` and listed no runtime thumbnail route.
- `npm run test:e2e`: 2 tests passed. Public E2E checks the visible thumbnail `naturalWidth > 0`, no forbidden runtime image requests, and mobile first-card visibility.
- `git diff --check`: passed.
- Local static integrity check: `appCount=56`, `uniqueIds=56`, `thumbnailAssets=56`, `referencedAssets=56`, `manifestEntries=56`, `missing=[]`, `extra=[]`, `badManifest=0`.
- Source route listing contains only admin backup and admin sync API routes under `src/app/api`; `/api/thumbnail` and `/api/app-thumbnail` are absent.
- The old page-capture design document no longer names `buildGeneratedThumbnailUrl()`.

## Operational Boundary

No production DB, GitHub API/dispatch, push, or deployment command was run.
The pre-existing `next-env.d.ts` change remains exactly the dev import
`./.next/dev/types/routes.d.ts`; it was kept unstaged and will remain
uncommitted.
