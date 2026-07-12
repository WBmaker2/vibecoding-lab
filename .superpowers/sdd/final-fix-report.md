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

## Final Integration Re-review Fix Wave

Date: 2026-07-12
Fix base: `7364e15`

### Delivered Contracts

- The workflow `run-name` is quoted and parsed as YAML. The workflow runs
  `npm run db:migrate` after `npm ci` and before exporter access. The
  README still requires the pre-deploy migration because the admin route needs
  the lease table before it can dispatch the workflow.
- Request-specific polling uses `request_marker` and searches only for an
  exact marker in the bounded 30-run response. The lease row can be recovered
  for 24 hours after `requested_at`; an expired or missing exact run remains
  unknown. Markerless status is explicitly global `history`, and browser
  reload stores only the public marker in session storage. No lease token is
  serialized.
- The static verifier accepts `thumbnailUrl: null` placeholders and rejects
  remote/other URLs, unsafe or missing local references, non-file/extra assets,
  and size/SHA-256 manifest drift.
- Backup import preparation applies the shared MIME, 5 MiB, and magic-byte
  policy before a database client or INSERT. Valid supported data images remain;
  SVG, malformed, oversized, and spoofed data images become a placeholder with
  `thumbnailUrl: null`.
- The pinned DNS/public-IP/redirect/timeout/response-size transport executes
  from one Node-compatible `remote-url.mjs` runtime. The TypeScript module is
  a declaration-backed re-export, and scripts no longer import `.ts`.
- Declared oversized `File` objects and oversized encoded data URLs are
  rejected before their full byte buffers are allocated. Exactly 5 MiB remains
  accepted when MIME and signature are valid.

### Exact RED/GREEN Evidence

- Initial RED:
  `npm test -- scripts/sync-static-gallery-workflow.test.mjs scripts/lib/static-gallery-verifier.test.mjs scripts/lib/apps-import-backup-preparation.test.mjs`
  failed all 3 files: one YAML parse failure at the unquoted `::` and two
  expected missing-module collection failures.
- Initial GREEN: the same command passed 3 files and 3 tests.
- Boundary RED:
  `npm test -- scripts/sync-static-gallery-workflow.test.mjs scripts/lib/static-gallery-verifier.test.mjs scripts/lib/apps-import-backup-preparation.test.mjs src/lib/security/image-policy.test.ts src/lib/storage/thumbnails.test.ts`
  reported 4 failed and 36 passed tests across 5 files. The failures were the
  absent migration step, undetected manifest drift, data URL preallocation,
  and File preallocation.
- Boundary GREEN: the same command passed 5 files and 40 tests.
- Marker/runtime RED:
  `npm test -- src/app/api/admin/sync-static-gallery/route.test.ts src/lib/apps/static-gallery-sync-lease.test.ts src/features/admin/admin-workspace.test.tsx scripts/lib/safe-image-download.test.mjs`
  reported 7 failed and 49 passed tests across 4 files. Active/history scope,
  expired exact matching, reload persistence, and bounded lease lookup were
  missing; the initial child-process smoke also exposed its jsdom URL harness.
- Corrected transport RED temporarily restored the direct `.mjs` to `.ts`
  import. `npm test -- scripts/lib/safe-image-download.test.mjs` then reported
  1 failed and 5 passed tests with `MODULE_TYPELESS_PACKAGE_JSON` on stderr.
  Restoring the `.mjs` runtime made the same command pass all 6 tests with
  empty stderr.
- Marker/runtime GREEN:
  `npm test -- src/app/api/admin/sync-static-gallery/route.test.ts src/lib/apps/static-gallery-sync-lease.test.ts src/features/admin/admin-workspace.test.tsx scripts/lib/safe-image-download.test.mjs src/lib/security/remote-url.test.ts`
  passed 5 files and 107 tests.
- Self-review verifier RED: `npm test -- scripts/lib/static-gallery-verifier.test.mjs`
  reported 2 failed and 4 passed tests for malformed percent-encoding and an
  unreferenced manifest asset. GREEN passed all 6 verifier tests.
- Final focused run across all 10 re-review files passed 149 tests.

### Final Command Evidence

- `npm test`: 43 files, 293 tests passed.
- `npm run lint`: passed.
- `npx tsc --noEmit`: passed.
- `npm audit --omit=dev`: found 0 vulnerabilities.
- `npm run build`: passed; `/` was `○ (Static)`, and the build listed
  only the admin backup/sync API routes with no runtime thumbnail route.
- `npm run test:e2e`: 2 tests passed.
- Independent YAML parse exited 0 and printed
  `{"runName":"Sync Static Gallery :: ${{ inputs.request_marker }}","migrationRun":"npm run db:migrate"}`.
- The default transport child-process smoke passed with stdout `function` and
  empty stderr. Independent imports of `remote-url.mjs`, safe image download,
  verifier, and importer exited 0 without warnings or DB access.
- `node --check` passed for `remote-url.mjs`, `image-policy.mjs`,
  `safe-image-download.mjs`, verifier, importer, and `db-migrate.mjs`.
- `git diff --check`: passed.
- Static integrity:
  `{"appCount":56,"uniqueIds":56,"thumbnailAssets":56,"referencedAssets":56,"manifestEntries":56,"missing":[],"extra":[],"badManifest":[]}`.
- After build and E2E, `next-env.d.ts` was restored to the pre-existing
  `./.next/dev/types/routes.d.ts` import, remained unstaged, and generated
  `tsconfig.tsbuildinfo` was removed.

### Operational Boundary And Concerns

No production DB, GitHub API/dispatch, push, or deployment command was run.
The workflow migration requires its existing `POSTGRES_URL` secret. Exact
request history is intentionally bounded to 30 returned runs and a 24-hour
lease-row lookup; beyond that boundary the UI remains unknown/retry and never
labels an unrelated run as the request's completion.
