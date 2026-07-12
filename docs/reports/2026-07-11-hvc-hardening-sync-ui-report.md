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
