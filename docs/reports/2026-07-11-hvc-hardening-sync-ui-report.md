# HVC Hardening, Static Sync, And Public UI Report

Date: 2026-07-12

## Outcome

The six planned priorities are complete and locally verified:

1. Admin mutations, remote URL handling, uploads, metadata fetching, and page
   capture were hardened with fail-closed authentication and SSRF boundaries.
2. Static gallery export and workflow logic now detect semantic no-op runs,
   preserve unchanged snapshot bytes and `generatedAt`, and skip expensive
   verification/build/deploy work when nothing changed.
3. Runtime `/api/thumbnail` and `/api/app-thumbnail` routes were removed; public
   cards use committed static thumbnail assets only.
4. Public/admin E2E gates, security headers, and production dependencies were
   repaired and audited.
5. The protected admin workspace now shows real snapshot/change/workflow state,
   with bounded, token-fenced, idempotent dispatch handling and no-op protection.
6. The public archive is now compact and work-focused, with immediate top-10
   representative tags, four-tag cards, accessible update history, and a first
   card visible in the initial mobile viewport.

No production database operation, GitHub request or workflow dispatch, push, or
deployment was performed while completing Task 6.

## Final Review Fix Wave

The final review findings were closed in the shared worktree without contacting
the production database, GitHub API, dispatching Actions, pushing, or deploying.

- Exporter image downloads now use the existing pinned `fetchSafeResource`
  transport. Absolute credential-free HTTP(S), public DNS answers, every
  redirect, timeout, redirect count, 5 MiB body limit, allow-listed image MIME,
  and magic bytes are enforced before a file is written.
- Uploads, embedded data URLs, captured data URLs, and exporter data URLs share
  the same image policy. Invalid MIME, SVG, oversized, and spoofed signatures
  resolve to rejection or placeholder/null and are never materialized.
- The committed snapshot now carries 56 sorted asset manifest entries with byte
  sizes and SHA-256 digests. Admin-only integrity checks make missing, extra,
  non-file, or changed assets pending; public `/` remains snapshot-only.
- Dispatch correlation uses a public UUID `request_marker` input and the exact
  `Sync Static Gallery :: <marker>` workflow run title. Status polling checks
  30 recent runs and never adopts an unrelated latest run or lease token.
- `npm run db:migrate` now selects sorted unapplied migrations through the
  repeatable `hvc_schema_migrations` table. `0000`, `0001`, and `0002` are safe
  for clean and existing schemas; runtime table creation remains a compatibility
  fallback.
- No-op `{ dispatched: false }` refreshes the admin route so the baseline cannot
  remain stale after another instance completes a sync. `SESSION_SECRET` now has
  the same 32-character minimum in env parsing and session behavior.

## Public UI Delivery

- `getRepresentativeTags(apps, limit = 10)` counts app frequency once per app,
  sorts ties by Korean label, and is memoized by the archive page.
- The top 10 tags render immediately; `모든 태그 보기` expands the full set and
  `모든 태그 접기` restores at most 10 controls. If the active tag is outside
  the representative set, it replaces the final representative chip until the
  user clears it. Only one tag remains active.
- Cards render four tags plus `+N`, use an 8px radius, preserve a stable 16:9
  thumbnail area, and defer offscreen rendering with
  `content-visibility: auto` / `contain-intrinsic-size: 440px`.
- The visible CTA remains `앱 열기`; its accessible name is
  `<title> 앱 새 창에서 열기`.
- The hero and results state are unframed, the mascot is at most 96px desktop
  and 64px mobile, helper/placeholder text is `#6b7280` or darker, and the
  mobile tag row scrolls horizontally inside its own region without causing
  page overflow.

## Update History

The compact `업데이트 내역` button opens a modal titled
`Hong's Vibe Coding Lab 업데이트 내역`. It has an explicit `닫기` control,
Escape handling, body-scroll restoration, and trigger-focus return.

- `2026-04-04` / `개발` / `교실용 웹앱을 모아 찾고 열 수 있는 공개 아카이브를 시작했습니다.`
- `2026-05-11` / `개선` / `공개 목록과 썸네일을 정적 자산으로 전환해 Vercel 사용량을 줄였습니다.`
- `2026-07-12` / `개선` / `관리자 보안, 무변경 동기화, 상태 표시, 테스트와 모바일 탐색 화면을 개선했습니다.`

## Static And No-Op Contracts

- `src/data/public-apps.json`: 56 apps, 56 unique IDs.
- `public/app-thumbnails/`: 56 assets, 0 missing references.
- `/` remains force-static and reads the committed snapshot only.
- Build output lists `/` as `○ (Static) prerendered as static content`.
- No `/api/thumbnail` or `/api/app-thumbnail` route exists in source or build.
- Public Playwright requests contain no `/_next/image`, `/api/thumbnail`, or
  `/api/app-thumbnail` target.
- Existing semantic no-op export behavior was preserved and remained covered by
  the full unit/fixture run. Task 6 added no DB, GitHub, metadata, capture, or
  runtime thumbnail request to the public path.

## Verification

### TDD Evidence

- RED representative/card run: missing ranking module, all six card tags, and
  old `앱 열기` accessible name caused the expected failures.
- RED update-history run: component module missing during collection.
- RED hero/layout run: 7 expected failures for hidden tags, old note panel,
  framed hero, and non-compact card styles.
- GREEN Task 6 focused run: 6 files, 16 tests passed.

### Final Commands

- `npm test`: 36 files, 241 tests passed.
- `npm run lint`: passed.
- `npm run build`: passed; `/` static, no dynamic thumbnail routes.
- `npm run test:e2e`: 2 tests passed.
- `npm audit --omit=dev`: `found 0 vulnerabilities`.
- `node --check scripts/apps-export-static-gallery.mjs`: passed.
- `git diff --check`: passed.
- Static completeness check:
  `{"appCount":56,"snapshotCount":56,"uniqueIds":56,"thumbnailAssets":56,"missing":0}`.

## Visual QA

Local production URL during QA: `http://127.0.0.1:3200/` (server stopped after
capture).

The in-app Browser supplied interaction, console, and layout evidence. Final
files were recaptured with explicit Playwright viewports; `file` and `sips`
confirmed true PNG dimensions of 1440x1000 and 390x844.

- Desktop 1440x1000: `/tmp/hvc-task-6-desktop-1440x1000.png`
- Mobile 390x844: `/tmp/hvc-task-6-mobile-390x844.png`

Desktop inspection found three visible first-row cards with real thumbnails,
clear hierarchy, stable tag/content spacing, and no overlap or truncation.
Mobile inspection found search, representative tags, update history, results,
and the first card at top 608.43px with `scrollY = 0`, inside the 844px
viewport. The mobile document/body scroll width equals the browser client width;
only the representative-tag region scrolls horizontally. All 10 representative
chips use `flex-shrink: 0` and `white-space: nowrap`, render at 32.5px height,
and keep Korean labels on one line. Browser console logs contained no warnings
or errors.

### Mobile Tag Readability Correction

- RED layout test: 1 of 4 tests failed because the mobile chip rule lacked
  shrink and line-wrap protection.
- CSS fix: `flex: 0 0 auto`, `min-width: max-content`, and
  `white-space: nowrap` were added to mobile representative tag chips.
- Focused archive/layout verification: 3 files, 10 tests passed.
- E2E verification: 2 tests passed, including computed-style, chip-dimension,
  horizontal-scroll, and first-card viewport assertions.
- Corrected screenshots overwrote the original paths and were visually
  inspected at exact 1440x1000 and 390x844 PNG dimensions.

### Active Filter And Modal Focus Correction

- RED command:
  `npm test -- src/features/archive/archive-hero.test.tsx src/features/archive/update-history.test.tsx src/features/archive/archive-page.test.tsx`
  produced 2 expected failures and 9 passes. The new tests exposed the hidden
  active `#영어` chip after collapse and the missing forward Tab containment.
- After the fixes, the same command passed all 11 tests across 3 files.
- The archive-hero test now selects a non-representative tag, collapses the full
  list, verifies exactly 10 ordered chips with the active chip selected, and
  clicks that chip to clear the filter and restore the omitted representative.
- The update-history tests now verify both forward Tab and Shift+Tab containment
  on the close button, plus listener removal and body-scroll restoration after
  unmount. Escape, explicit close, and trigger-focus return remain covered.
- The full Task 6 focused suite passed 19 tests across 6 files; `npm run lint`
  passed; `npm run test:e2e` passed both browser tests; and final
  `git diff --check` passed with no output.
- This follow-up changed interaction logic and tests only, with no layout CSS or
  visible markup change. The previously corrected and inspected desktop/mobile
  screenshots therefore remain the visual evidence paths listed above.

## Concerns

- No blocking concern remains.
- Offscreen thumbnails intentionally stay lazy and therefore do not all issue a
  network request in one viewport. The 56-element DOM assertion, 56-file static
  completeness check, direct source inspection, and visible-image load checks
  verify the intended behavior.
- Snapshot-specific titles and tags used by public E2E may need adjustment after
  a future deliberate static gallery replacement.

## Final Fix Verification

### RED/GREEN

- RED focused run covered the new image policy/downloader, migration selection,
  malformed `generatedAt`, asset drift, exact marker dispatch, no-op refresh,
  and 31/32-character env boundary. It failed at the expected missing-module
  and missing-behavior assertions before implementation.
- `npm test -- src/lib/security/image-policy.test.ts scripts/lib/safe-image-download.test.mjs src/lib/storage/public-thumbnail.test.ts src/lib/storage/thumbnails.test.ts src/lib/security/remote-url.test.ts`: 5 files, 99 tests passed.
- `npm test -- scripts/lib/static-gallery-export-state.test.mjs scripts/apps-export-static-gallery.fixture.test.mjs src/lib/apps/static-gallery-sync-state.test.ts src/lib/apps/static-gallery-asset-integrity.test.ts`: 4 files, 32 tests passed.
- `npm test -- src/app/api/admin/sync-static-gallery/route.test.ts`: 21 tests passed.
- `npm test -- scripts/db-migrate.test.mjs src/lib/env.test.ts src/lib/auth/session.test.ts src/lib/storage/public-thumbnail.test.ts src/lib/storage/thumbnails.test.ts`: 5 files, 51 tests passed.

### Full Gates

- `npm test`: 40 files, 273 tests passed.
- `npm run lint`: passed.
- `npm audit --omit=dev`: found 0 vulnerabilities.
- `node --check scripts/apps-export-static-gallery.mjs`, `node --check scripts/lib/safe-image-download.mjs`, `node --check scripts/db-migrate.mjs`: passed.
- `npm run build`: passed; `/` was `○ (Static) prerendered as static content`, and no runtime thumbnail route was listed.
- `npm run test:e2e`: 2 tests passed, including a visible thumbnail `naturalWidth > 0` assertion.
- `git diff --check`: passed.
- Local static integrity check: `appCount=56`, `uniqueIds=56`, `thumbnailAssets=56`, `manifestEntries=56`, `missing=[]`, `extra=[]`, `badManifest=0`.
- After build, `next-env.d.ts` was restored to the pre-existing
  `./.next/dev/types/routes.d.ts` import and remains the only unrelated
  pre-existing worktree change; it was not staged or committed.

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

## Final Sync Boundary Fix Wave

Date: 2026-07-12
Fix base: `40ec083`

### Delivered Contracts

- A request-specific marker with no matching run now expires exactly at its
  public `leaseExpiresAt` boundary. Expiry clears session storage and the
  request run, stops the 5-second polling interval, exposes an accessible retry
  status, and re-enables sync when pending changes remain. Global workflow
  history stays separate and is never adopted as that request's completion.
  The fake-timer test also rejects a poll that began before expiry and proves
  its late error cannot replace the terminal retry state, then unmounts with
  zero timers.
- `getStaticGalleryBaseline()` preserves the absence of legacy
  `assetManifest` instead of coercing it to `[]`. Missing and malformed
  manifests are pending and fail local integrity before filesystem comparison;
  an explicitly present empty array retains its existing valid meaning.
- `isCanonicalGeneratedAt()` now lives in one Node-compatible
  `static-gallery-snapshot-policy.mjs` module, with a declaration-only
  `.d.mts` companion for Next TypeScript. Both exporter reuse and the admin
  sync summary reject parseable but noncanonical timestamps.
- The admin status route distinguishes an absent `request_marker` from a
  malformed value. Malformed empty, whitespace, traversal-like, and oversized
  values return structured HTTP 400
  `SYNC_REQUEST_MARKER_INVALID` before lease or GitHub work.

### Exact RED/GREEN Evidence

- Initial RED:
  `npm test -- src/features/admin/admin-workspace.test.tsx src/lib/apps/static-public-apps.test.ts src/lib/apps/static-gallery-sync-state.test.ts scripts/lib/static-gallery-export-state.test.mjs src/app/api/admin/sync-static-gallery/route.test.ts`
  reported 4 failed files and 1 passed file, with 8 failed and 78 passed tests.
  Failures covered unknown-marker expiry, legacy manifest coercion,
  noncanonical admin timestamps, and all malformed marker query cases.
- Intermediate GREEN exposed two fake-timer fixture issues while the four
  non-React files passed: 2 failed and 84 passed tests. The existing workflow
  fixture received an explicit system time, and the expiry poll fixture now
  creates a fresh `Response` per request so body consumption cannot mask the
  boundary.
- Final focused:
  `npm test -- src/features/admin/admin-workspace.test.tsx src/lib/apps/static-public-apps.test.ts src/lib/apps/static-gallery-sync-state.test.ts src/lib/apps/static-gallery-asset-integrity.test.ts scripts/lib/static-gallery-export-state.test.mjs src/app/api/admin/sync-static-gallery/route.test.ts`
  passed 6 files and 93 tests.
- The dedicated expiry test passed with a poll left in flight across expiry,
  verified retry text and enabled sync, observed no later fetches, and reached
  `vi.getTimerCount() === 0` after unmount.
- Self-review late-error RED:
  `npm test -- src/features/admin/admin-workspace.test.tsx -t "expires an unknown marker"`
  failed 1 test because a delayed polling rejection replaced the retry text
  with `late polling failure`. After stale marker-specific results and errors
  were ignored, the same command passed 1 test with 17 skipped.
- Self-review global-history RED:
  `npm test -- src/features/admin/admin-workspace.test.tsx -t "ignores global history"`
  failed 1 test because a mount-time history response erased the newly created
  marker and displayed unrelated success. After guarding the full request
  context, both global-history and expiry race tests passed together (2 passed,
  17 skipped).

### Final Command Evidence

- `npm test`: 43 files, 311 tests passed.
- `npm run lint`: passed with zero warnings.
- `npx tsc --noEmit`: passed.
- `npm run build`: passed; `/` was listed as `○ (Static)`, while admin and
  admin sync routes remained dynamic.
- The generated prerender manifest confirmed
  `{"rootPrerendered":true,"initialRevalidateSeconds":false,"srcRoute":"/"}`.
- `npm run test:e2e`: 2 tests passed. Public E2E rendered all 56 thumbnail
  elements, loaded the visible image, and observed no runtime image optimizer
  or thumbnail API request.
- `npm audit --omit=dev`: exit 0, found 0 vulnerabilities.
- `npm audit --audit-level=high`: executed and exited 1 on the existing
  developer dependency graph with 10 advisories (1 low, 6 moderate, 2 high,
  1 critical). No dependency or lockfile change was made in this scoped wave.
- `npm test -- scripts/sync-static-gallery-workflow.test.mjs`: 2 YAML
  parse/order tests passed.
- Node 24.13.1 `--check` passed for the shared snapshot policy and exporter
  state modules. A `--trace-warnings` import smoke loaded the policy,
  exporter, remote URL transport, image policy, and safe downloader with:
  `node=v24.13.1 imports=5 canonical-policy=ok warnings=none`.
- Offline local verifier smoke:
  `{"ok":true,"appCount":56,"manifestCount":56,"thumbnailStats":{"local":56,"remote":0,"null":0,"other":0},"assetIntegrity":{"valid":true,"reason":"assets-match"},"missingLocalThumbnailFileCount":0}`.
  It used the committed snapshot as comparison input and contacted no DB.
- `git diff --check`: passed after the final report update.
- After build and E2E, `next-env.d.ts` was restored to the pre-existing
  `./.next/dev/types/routes.d.ts` import, left unstaged, and generated
  `tsconfig.tsbuildinfo` was removed.

### Operational Boundary And Concerns

No production DB, GitHub API/dispatch, push, or deployment command was run.
The only remaining concern is the pre-existing developer-tool audit backlog
listed above; production dependencies report zero advisories. The request
history remains intentionally bounded, and an unmatched request now ends in
retry at its public lease deadline rather than guessing from global history.


## Final Admin Sync Generation Race Fix

Date: 2026-07-12
Fix base: `5fbca6a`

### Delivered Contract

- Admin sync request context now carries a monotonically increasing generation
  in addition to the public marker ID. The generation advances before any
  null/marker ID transition is published, including expiry's marker clear.
- Every `loadLatestRun()` captures both generation and marker ID. A response or
  rejection can update status, run, storage, or refresh behavior only while
  both values still match. This preserves the existing active, expired,
  marker-specific late-response, and late-error protections while closing the
  markerless `null -> marker -> null` ABA race.
- The deterministic fake-timer test keeps the initial markerless history GET
  and a marker status GET deferred, installs the dispatch marker, expires it
  into retry, then settles both stale operations. Retry text, null run/marker,
  enabled sync button, stopped polling, and zero timers after unmount all
  remain unchanged with clean React `act` output.

### Exact RED/GREEN Evidence

- The first fixture run reached the installed marker but stopped on the
  intentional pending-request label `동기화 시작 중...`; the assertion was
  corrected to check that disabled label without changing product code.
- Corrected RED:
  `npm test -- src/features/admin/admin-workspace.test.tsx -t "invalidates markerless history"`
  failed 1 test with 19 skipped because the original markerless history
  response replaced retry with unrelated successful history after expiry.
- GREEN: the same command passed 1 test with 19 skipped after generation and
  marker context were both required to match.

### Final Command Evidence

- Admin focused:
  `npm test -- src/features/admin/admin-workspace.test.tsx` passed 1 file and
  20 tests.
- Full Task 5/marker focused:
  `npm test -- src/lib/apps/static-gallery-sync-state.test.ts src/lib/apps/static-gallery-sync-lease.test.ts src/app/api/admin/sync-static-gallery/route.test.ts src/features/admin/admin-workspace.test.tsx`
  passed 4 files and 73 tests.
- `npm run lint`: passed with zero warnings.
- `npm run test:e2e`: 2 tests passed.
- `git diff --check`: passed after the report update.
- `next-env.d.ts` remained exactly on
  `./.next/dev/types/routes.d.ts`, unstaged and uncommitted; no
  `tsconfig.tsbuildinfo` was created.

### Operational Boundary

No production DB, GitHub API/dispatch, push, deployment, or other external
action was run. No remaining concern was found in this narrowly scoped race
fix.
