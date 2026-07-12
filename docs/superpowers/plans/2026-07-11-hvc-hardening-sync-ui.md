# HVC Hardening, Sync Efficiency, And Compact Gallery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden the admin and remote-thumbnail boundaries, prevent no-op sync deployments, remove runtime thumbnail APIs, restore reliable E2E/security gates, expose actionable sync state in admin, and compress the public gallery without making `/` dynamic.

**Architecture:** Keep Postgres, authentication, metadata discovery, and explicit workflow dispatch behind the protected admin surface. Keep the public archive build-time-only through `src/data/public-apps.json` and `public/app-thumbnails/`; a GitHub Actions run is the only path that publishes admin changes. Each priority is a separately committed, test-first task with a task-scoped review before the next task begins.

**Tech Stack:** Next.js App Router 16, React 19, TypeScript, Vitest, Testing Library, Playwright, Node.js export scripts, Postgres/Drizzle, GitHub Actions, Vercel Blob.

## Global Constraints

- Public `/` must remain `dynamic = "force-static"`; a public request must perform no Postgres query, GitHub API call, metadata fetch, page capture, runtime thumbnail generation, or Next Image Optimization request.
- Admin create/update/delete/tag removal must update Postgres only. Public publication remains an explicit authenticated `수정 사항 동기화` operation and must never be an implicit server-action side effect.
- Preserve all 56 currently committed app records and their usable local thumbnails. Automated tests must not connect to or mutate the production database.
- Every mutating admin server boundary must authenticate independently; a protected layout is not sufficient authorization for a Server Action or API route.
- Remote metadata and capture URLs must be absolute HTTP(S), contain no credentials, and resolve only to public addresses. Reject loopback, private, link-local, carrier-grade NAT, multicast, unspecified, documentation, benchmark, and reserved IPv4/IPv6 ranges; revalidate every redirect and every browser request.
- Metadata fetches must use an 8-second timeout, at most 3 redirects, an HTML response limit of 1 MiB, and HTML/XHTML content types only. Thumbnail uploads must be one of PNG, JPEG, WebP, GIF, or AVIF and at most 5 MiB.
- `/api/thumbnail` and `/api/app-thumbnail/[id]/[version]` must not exist after Task 3. New auto-thumbnail failures store no compute-backed URL; the static card background remains the visual fallback.
- When DB-backed public fields and required local thumbnail files are unchanged, export must preserve the previous `generatedAt`, write no files, create no commit, push nothing, and run no Vercel deployment. A changed run still verifies, tests, lints, builds, commits, pushes, and deploys.
- The committed snapshot carries a deterministic SHA-256 manifest for every local thumbnail. Admin-only asset integrity checks compare that manifest with the local file set; public `/` never reads the filesystem.
- Dependency remediation must use non-breaking current releases that clear `npm audit --omit=dev`; do not use `npm audit fix --force`.
- Admin sync UI must identify pending record count, last snapshot time, queued/in-progress/completed/failed workflow state, and a GitHub run link. It must disable no-op and duplicate dispatches.
- The public UI keeps the current Hong identity but removes the floating-card treatment from the hero, shows at most 10 representative tags by default, shows at most 4 tags per app card, uses card radii no larger than 8px, and places the first app card inside the initial 390x844 viewport.
- Tests follow red-green-refactor. Each task report must record the focused RED command/output, GREEN command/output, files changed, and full-suite result before commit.

---

### Task 1: Authenticate Mutations And Block SSRF

**Files:**
- Create: `src/lib/security/remote-url.ts`
- Create: `src/lib/security/remote-url.test.ts`
- Create: `src/app/admin/actions.test.ts`
- Create: `src/lib/storage/page-capture.test.ts`
- Modify: `src/lib/auth/session.ts`
- Modify: `src/lib/auth/session.test.ts`
- Modify: `src/app/admin/actions.ts`
- Modify: `src/lib/metadata/fetch-link-preview.ts`
- Modify: `src/lib/metadata/fetch-link-preview.test.ts`
- Modify: `src/lib/storage/page-capture.ts`
- Modify: `src/lib/storage/thumbnails.ts`
- Modify: `src/lib/storage/thumbnails.test.ts`

**Interfaces:**
- Produces: `assertSafeRemoteHttpUrl(input, options?): Promise<URL>` and `isPublicIpAddress(address): boolean` in `src/lib/security/remote-url.ts`.
- Produces: `fetchSafeHtml(input, options?): Promise<{ html: string; finalUrl: string }>` with defaults `{ timeoutMs: 8000, maxBytes: 1_048_576, maxRedirects: 3 }`.
- Produces: `MAX_THUMBNAIL_UPLOAD_BYTES = 5 * 1024 * 1024` and server-side image MIME/signature validation.
- Consumes: `hasAdminSession()` at the start of each create/update/delete/tag-removal action, before repository or remote work.

- [ ] **Step 1: Write failing network-policy tests**

Create tests that inject a DNS lookup function and assert rejection of `http://localhost`, hostnames with credentials, `127.0.0.1`, `10.0.0.1`, `100.64.0.1`, `169.254.169.254`, `192.0.2.1`, `224.0.0.1`, `::1`, `fc00::1`, `fe80::1`, and IPv4-mapped private IPv6. Assert that a hostname resolving only to `93.184.216.34` is accepted and that one public plus one private answer is rejected.

Run: `npm test -- src/lib/security/remote-url.test.ts`

Expected RED: module/function missing.

- [ ] **Step 2: Implement the reusable URL and bounded-HTML policy**

Use `node:dns/promises` `lookup(hostname, { all: true, verbatim: true })` and `node:net` `isIP`. `assertSafeRemoteHttpUrl` must reject credentials, fragments are allowed but removed before requests, and every DNS answer must pass `isPublicIpAddress`. `fetchSafeHtml` must use `redirect: "manual"`, validate each `Location`, combine caller and timeout abort signals, reject non-HTML content, stream at most 1 MiB, and cancel the reader when the limit is exceeded.

- [ ] **Step 3: Verify URL and fetch bounds GREEN**

Run: `npm test -- src/lib/security/remote-url.test.ts src/lib/metadata/fetch-link-preview.test.ts`

Expected GREEN: public URL, redirect, timeout, content-type, and size-limit cases pass.

- [ ] **Step 4: Write failing independent-auth and secret tests**

`src/app/admin/actions.test.ts` must mock `hasAdminSession`, repository access, thumbnail resolution, and `next/navigation`. For each of `createAppAction`, `updateAppAction`, `deleteAppAction`, and `removeAppTagAction`, assert an unauthenticated call redirects to `/admin/login` and never calls the repository. Extend `session.test.ts` so missing or shorter-than-32-character `SESSION_SECRET` yields no valid session and cannot create/set a token; verify valid tokens with constant-time comparison behavior through public functions.

Run: `npm test -- src/app/admin/actions.test.ts src/lib/auth/session.test.ts`

Expected RED: actions currently enter repository code and the fallback secret still creates a token.

- [ ] **Step 5: Make authentication fail closed**

Remove the hard-coded session-secret fallback. `hasAdminSession()` returns `false` when configuration is invalid; token creation/session setting throws `SESSION_SECRET must be at least 32 characters.`. Add an action-local `requireAdminSession()` that redirects before input parsing, remote calls, or repository access.

- [ ] **Step 6: Write failing upload and browser-request tests**

Add cases for a file over 5 MiB, `image/svg+xml`, a spoofed PNG MIME with invalid magic bytes, and a valid small PNG. Add page-capture tests proving the main URL and subresource requests are passed through the URL policy and private requests are aborted.

Run: `npm test -- src/lib/storage/thumbnails.test.ts src/lib/storage/page-capture.test.ts`

Expected RED: invalid files are currently accepted and capture has no request policy.

- [ ] **Step 7: Enforce upload and capture limits**

Validate size, MIME, and leading file signature before data-URL conversion or Blob upload. In Playwright, validate the initial URL before launch and register request routing before `page.goto`; allow only validated public HTTP(S) requests, abort rejected requests, cap capture at 80 requests, keep the existing 15-second navigation timeout, and always close the browser.

- [ ] **Step 8: Verify and commit Task 1**

Run:

```bash
npm test -- src/lib/security/remote-url.test.ts src/lib/metadata/fetch-link-preview.test.ts src/lib/storage/page-capture.test.ts src/lib/storage/thumbnails.test.ts src/lib/auth/session.test.ts src/app/admin/actions.test.ts
npm test
npm run lint
```

Expected: all commands exit 0 with no warnings introduced.

Commit: `fix: harden admin and remote thumbnail boundaries`

---

### Task 2: Skip No-Op Sync Builds And Deployments

**Files:**
- Create: `scripts/lib/static-gallery-export-state.mjs`
- Create: `scripts/lib/static-gallery-export-state.test.mjs`
- Modify: `scripts/apps-export-static-gallery.mjs`
- Modify: `.github/workflows/sync-static-gallery.yml`
- Modify: `README.md`

**Interfaces:**
- Produces: `getReusableSnapshotDecision({ sourceApps, snapshot, thumbnailFiles }): { reusable: boolean; reason: string }`.
- Produces: exporter stdout line `gallery-export changed=true|false reason=<reason>`.
- Workflow step id `changes` exposes `changed=true|false`; every verify/test/lint/build/commit/push/deploy step consumes this output.

- [ ] **Step 1: Write failing semantic no-op tests**

Create node-environment tests covering: identical IDs/public fields/createdAt/updatedAt with every referenced local thumbnail present is reusable; changed metadata, reordered records, missing thumbnail, extra thumbnail, added ID, or deleted ID is not reusable. `generatedAt` is deliberately excluded from source equality.

Run: `npm test -- scripts/lib/static-gallery-export-state.test.mjs`

Expected RED: helper missing.

- [ ] **Step 2: Implement deterministic reuse detection**

Compare the ordered DB-backed fields `id`, `title`, `summary`, `url`, `githubUrl`, `tags`, `thumbnailMode`, `subject`, `grade`, `memo`, `createdAt`, and `updatedAt`. Treat local `thumbnailUrl` as materialized output: require every snapshot `/app-thumbnails/<file>` to exist, require the directory to contain exactly the referenced file set, and compare the deterministic asset manifest bytes.

- [ ] **Step 3: Make export preserve bytes on no-op**

Read the existing snapshot and thumbnail directory before materialization. When reusable, return without downloading, deleting, rewriting JSON, or changing `generatedAt`. When not reusable, complete the existing atomic materialization, remove orphaned thumbnail files only after the new payload is ready, set a fresh `generatedAt`, and log `changed=true`.

- [ ] **Step 4: Verify exporter RED/GREEN behavior with a temporary backup fixture**

Run the exporter twice against a temporary copied backup/snapshot fixture. The second run must leave JSON and thumbnail checksums unchanged and print `changed=false`. Change one fixture field and assert the next run prints `changed=true`.

Expected: no production DB access and no workspace snapshot mutation during the test.

- [ ] **Step 5: Gate the workflow before expensive steps**

Set `concurrency.cancel-in-progress: true`. Immediately after export, add `id: changes` that checks only `src/data/public-apps.json` and `public/app-thumbnails`. Apply `if: steps.changes.outputs.changed == 'true'` to verification, focused tests, lint, build, diff check, commit, push, Vercel pull, and Vercel deploy. Print a clear no-op job summary when false.

- [ ] **Step 6: Verify and commit Task 2**

Run:

```bash
npm test -- scripts/lib/static-gallery-export-state.test.mjs
node --check scripts/apps-export-static-gallery.mjs
git diff --check
npm test
```

Expected: all commands exit 0; workflow has no deploy path when `changed=false`.

Commit: `perf: skip unchanged gallery sync deployments`

---

### Task 3: Remove Dynamic Thumbnail APIs

**Files:**
- Delete: `src/app/api/thumbnail/route.ts`
- Delete: `src/app/api/app-thumbnail/[id]/[version]/route.ts`
- Delete: `src/app/api/app-thumbnail/[id]/[version]/route.test.ts`
- Delete: `src/lib/storage/generated-thumbnail.ts`
- Modify: `src/lib/storage/thumbnails.ts`
- Modify: `src/lib/storage/thumbnails.test.ts`
- Modify: `src/lib/storage/page-capture.ts`
- Modify: `src/lib/storage/public-thumbnail.ts`
- Modify: `src/lib/storage/public-thumbnail.test.ts`
- Modify: `src/lib/apps/repository.ts`
- Modify: `src/lib/apps/repository.test.ts`
- Modify: `scripts/apps-export-static-gallery.mjs`
- Modify: `scripts/lib/static-gallery-export-state.test.mjs`
- Modify: `src/lib/apps/static-public-apps.ts`
- Modify: `src/lib/apps/static-public-apps.test.ts`
- Modify: `README.md`

**Interfaces:**
- `resolveThumbnailInput()` returns preview image, captured Blob/data URL, preserved existing image, or `{ thumbnailMode: "placeholder", thumbnailUrl: null }`; it never creates a same-origin API URL.
- `toPublicThumbnailUrl()` returns an external HTTP(S) URL or `null`; embedded data URLs are never exposed through a runtime route.
- Export recognizes legacy internal thumbnail URLs only to reuse an already committed safe local file; it never fetches `/api/thumbnail` or `/api/app-thumbnail`.

- [ ] **Step 1: Change tests to require no runtime fallback**

Update thumbnail tests so metadata and capture failure expects placeholder/null. Update public-thumbnail tests so embedded data URLs yield `null`. Add exporter cases: a legacy internal URL reuses the app's existing safe local thumbnail; without one it becomes null without a network request.

Run: `npm test -- src/lib/storage/thumbnails.test.ts src/lib/storage/public-thumbnail.test.ts scripts/lib/static-gallery-export-state.test.mjs`

Expected RED: current code returns `/api/thumbnail` and `/api/app-thumbnail`.

- [ ] **Step 2: Remove generated URL production paths**

Delete `buildGeneratedThumbnailUrl` usage and move the small hostname-to-safe-filename helper into `page-capture.ts`. Auto mode falls back to placeholder/null. Simplify `public-thumbnail.ts` while retaining strict supported-URL and data-image decoding helpers needed by admin/export code.

- [ ] **Step 3: Preserve legacy static assets offline**

Before clearing a legacy internal URL, consult the prior snapshot by app ID. Reuse only a normalized `/app-thumbnails/<basename>` whose file exists. Otherwise use null and let the card's static CSS background render. Never call the removed routes, including during GitHub Actions export.

- [ ] **Step 4: Delete routes, route tests, and stale assets**

Delete both route implementations and the generated-thumbnail module. Let the exporter prune the three currently unreferenced legacy files while preserving every file referenced by the 56-app snapshot.

- [ ] **Step 5: Verify and commit Task 3**

Run:

```bash
npm test -- src/lib/storage/thumbnails.test.ts src/lib/storage/public-thumbnail.test.ts src/lib/apps/repository.test.ts src/lib/apps/static-public-apps.test.ts scripts/lib/static-gallery-export-state.test.mjs
rg -n 'buildGeneratedThumbnailUrl|/api/thumbnail|/api/app-thumbnail' src scripts README.md
npm test
npm run lint
npm run build
```

Expected: `rg` finds only defensive legacy-rejection test fixtures/constants, not a route or generated URL producer; build route output contains neither thumbnail API.

Commit: `refactor: remove runtime thumbnail APIs`

---

### Task 4: Repair E2E Gates And Patch Dependencies

**Files:**
- Create: `src/app/security-headers.test.ts`
- Modify: `tests/e2e/public-archive.spec.ts`
- Modify: `tests/e2e/admin-flow.spec.ts`
- Modify: `playwright.config.ts`
- Modify: `next.config.ts`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `README.md`

**Interfaces:**
- Public E2E verifies search/tag behavior and mobile card visibility without assuming hidden controls.
- Admin E2E verifies authenticated DB/admin registration only; it must not expect an unsynchronized record on `/`.
- `next.config.ts` supplies `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`, and `Cross-Origin-Opener-Policy: same-origin`.
- Exact dependency targets: `next@16.2.10`, `eslint-config-next@16.2.10`, `drizzle-orm@0.45.2`, `drizzle-kit@0.31.10`, `@vercel/blob@2.6.1`, `@playwright/test@1.61.1`, `playwright-core@1.61.1`, and `@sparticuz/chromium@149.0.0`. Add `overrides.follow-redirects = "1.16.0"` only if the lockfile audit still resolves a vulnerable version.

- [ ] **Step 1: Capture the existing E2E and audit RED state**

Run:

```bash
npm run test:e2e
npm audit --omit=dev
```

Expected RED: public tag test cannot click a collapsed tag, admin test incorrectly expects immediate public publication, and production audit reports vulnerable Next/Drizzle/Blob transitive packages.

- [ ] **Step 2: Fix E2E semantics without publishing**

For the current pre-Task-6 UI, explicitly reveal the tag panel before clicking. In admin E2E, assert the new record appears in the admin library after save, then reload `/admin` and assert it remains; remove the navigation/search assertion on `/`. Keep `POSTGRES_URL=""` so E2E uses only the isolated in-memory repository.

- [ ] **Step 3: Add security-header test and implementation**

Import `next.config.ts`, call `headers()`, flatten the root rule, and assert the five exact values above. Implement headers without CSP or HSTS changes that could break local/E2E behavior.

Run: `npm test -- src/app/security-headers.test.ts`

Expected GREEN after config implementation.

- [ ] **Step 4: Install exact patched dependencies**

Run `npm install --save-exact` for production targets and `npm install --save-dev --save-exact` for dev targets using `/tmp/hvc-npm-cache` if the user npm cache is not writable. Keep React on the compatible 19.2 line unless npm peer resolution requires a patch update. Do not run a force audit fix.

- [ ] **Step 5: Verify and commit Task 4**

Run:

```bash
npm audit --omit=dev
npm test
npm run lint
npm run build
npm run test:e2e
git diff --check
```

Expected: audit exits 0, unit/lint/build exit 0, and both E2E scenarios pass.

Commit: `test: restore e2e and security gates`

---

### Task 5: Show Real Admin Sync State

**Files:**
- Create: `src/lib/apps/static-gallery-sync-state.ts`
- Create: `src/lib/apps/static-gallery-sync-state.test.ts`
- Modify: `src/lib/apps/static-public-apps.ts`
- Modify: `src/app/admin/(protected)/page.tsx`
- Modify: `src/features/admin/admin-shell.tsx`
- Modify: `src/features/admin/admin-workspace.tsx`
- Modify: `src/features/admin/admin-workspace.test.tsx`
- Modify: `src/app/api/admin/sync-static-gallery/route.ts`
- Modify: `src/app/api/admin/sync-static-gallery/route.test.ts`
- Modify: `src/app/globals.css`
- Modify: `README.md`

**Interfaces:**
- Produces: `StaticGalleryBaseline { generatedAt: string; appCount: number; updatedAtById: Record<string, string>; assetManifest: StaticGalleryAssetManifest }`.
- Produces: `getStaticGallerySyncSummary(adminApps, baseline): { pendingCount: number; dbCount: number; snapshotCount: number; generatedAt: string }` where added, deleted, or timestamp-changed IDs each count once.
- Produces: authenticated `GET /api/admin/sync-static-gallery` returning `{ run: null | { id, status, conclusion, htmlUrl, createdAt, updatedAt } }`.
- `POST` returns 200 with `dispatched: false` for no changes, 409 with the active run for a duplicate, or 202 with `dispatched: true` after GitHub accepts dispatch.

- [ ] **Step 1: Write failing pending-summary tests**

Cover exact match, added DB app, deleted DB app, updated timestamp, and multiple differences. Assert invalid snapshot dates are treated as pending rather than synchronized.

Run: `npm test -- src/lib/apps/static-gallery-sync-state.test.ts`

Expected RED: module missing.

- [ ] **Step 2: Expose a serializable static baseline**

Add a static snapshot metadata getter that does not read the database. Build the baseline in the admin server page from the committed JSON and pass it through `AdminShell` to `AdminWorkspace` alongside the DB app list.

- [ ] **Step 3: Write failing API status/no-op/duplicate tests**

Extend route tests for unauthenticated GET, normalized latest workflow response, no-change POST without dispatch, active-run POST returning 409, and changed/idle POST returning 202. Mock repository and static summary; never use a real GitHub token or DB.

Run: `npm test -- src/app/api/admin/sync-static-gallery/route.test.ts`

Expected RED: GET and pre-dispatch guards do not exist.

- [ ] **Step 4: Implement GitHub run normalization and dispatch guards**

Query `GET /repos/{owner}/{repo}/actions/workflows/{workflow}/runs?branch={ref}&event=workflow_dispatch&per_page=30`, normalize only the six public fields plus an internal exact `display_title` marker, and use `cache: "no-store"`. Authenticate before config, DB, or GitHub work. POST first checks pending summary, then rejects `queued`, `in_progress`, `waiting`, `requested`, or `pending` latest runs before dispatch. Dispatch includes a unique public `request_marker` input and the workflow run name is `Sync Static Gallery :: <request_marker>`; an active lease is reconciled only when that exact marker is found. An expired or unmatched marker remains unknown and is never guessed from timestamps or the latest unrelated run.

- [ ] **Step 5: Write failing admin status UI tests**

Assert: exact match shows `동기화할 수정 사항이 없습니다` and disabled button; two changes show `2건의 수정 사항`; successful dispatch polls GET; an active run keeps the button disabled and exposes a `GitHub Actions에서 보기` link; completed success stops polling and requests a router refresh; failed completion shows an error state.

Run: `npm test -- src/features/admin/admin-workspace.test.tsx`

Expected RED: current UI only reports that dispatch started.

- [ ] **Step 6: Implement accessible polling UI**

Compute pending count from `localApps` plus the immutable baseline. Poll every 5 seconds only while a run is active, clear timers on unmount, and stop on completed/cancelled/failure. Keep status text in `role="status"`, links `rel="noreferrer" target="_blank"`, and button labels stable. Call `router.refresh()` after successful completion so a newly deployed baseline can replace stale props.

- [ ] **Step 7: Verify and commit Task 5**

Run:

```bash
npm test -- src/lib/apps/static-gallery-sync-state.test.ts src/app/api/admin/sync-static-gallery/route.test.ts src/features/admin/admin-workspace.test.tsx
npm test
npm run lint
npm run build
```

Expected: all commands exit 0; `/` remains static in build output.

Commit: `feat: surface admin gallery sync state`

---

### Task 6: Compress The Public Archive UI

**Files:**
- Create: `src/lib/apps/representative-tags.ts`
- Create: `src/lib/apps/representative-tags.test.ts`
- Modify: `src/features/archive/archive-page.tsx`
- Modify: `src/features/archive/archive-page.test.tsx`
- Modify: `src/features/archive/archive-hero.tsx`
- Modify: `src/features/archive/archive-hero.test.tsx`
- Create: `src/features/archive/update-history.tsx`
- Create: `src/features/archive/update-history.test.tsx`
- Modify: `src/features/archive/tag-filter-bar.tsx`
- Modify: `src/features/archive/app-card.tsx`
- Modify: `src/features/archive/app-card.test.tsx`
- Modify: `src/features/archive/app-card-layout.test.ts`
- Modify: `src/app/globals.css`
- Modify: `tests/e2e/public-archive.spec.ts`
- Create: `docs/reports/2026-07-11-hvc-hardening-sync-ui-report.md`

**Interfaces:**
- Produces: `getRepresentativeTags(apps, limit = 10): string[]`, sorted by descending app frequency then Korean locale label for ties.
- `ArchiveHero` consumes `representativeTags` and `allTags`; representative tags are always visible and `모든 태그 보기` expands the remainder.
- `AppCard` renders the first 4 tags and one `+N` count when more exist.
- `UpdateHistory` exposes a small `업데이트 내역` button and an accessible dialog backed by dated development/improvement entries. The initial entries are `2026-04-04 개발`, `2026-05-11 개선`, and `2026-07-12 개선`.

- [ ] **Step 1: Write failing ranking and compact-card tests**

Test frequency order, Korean alphabetical tie-break, de-duplication within one app, and the 10-tag cap. Test an app with six tags renders four named tags plus `+2`, and its external link has the accessible name `<title> 앱 새 창에서 열기`.

Run: `npm test -- src/lib/apps/representative-tags.test.ts src/features/archive/app-card.test.tsx`

Expected RED: ranking helper and tag cap do not exist.

- [ ] **Step 2: Implement representative tags and compact card semantics**

Derive counts once with `useMemo`, keep one active tag at a time, show the top 10 immediately, and expand all tags with a text button. Add a visually hidden new-window label to the CTA; keep the visible command `앱 열기`.

- [ ] **Step 3: Write the failing update-history interaction test**

Create `src/features/archive/update-history.test.tsx`. Assert the small `업데이트 내역` button opens a dialog titled `Hong's Vibe Coding Lab 업데이트 내역`, the dialog renders the three exact dated entries, the `닫기` button closes it, Escape closes it, and focus returns to the trigger.

Run: `npm test -- src/features/archive/update-history.test.tsx`

Expected RED: component missing.

- [ ] **Step 4: Implement the update-history button and dialog**

Create `UpdateHistory` with static exported history data and mount its trigger beside the archive eyebrow/header utilities. Use a compact text button, a real modal dialog with scroll-safe content, explicit close control, Escape handling, body-scroll restoration, and focus return. Record these exact entries:

- `2026-04-04` / `개발` / `교실용 웹앱을 모아 찾고 열 수 있는 공개 아카이브를 시작했습니다.`
- `2026-05-11` / `개선` / `공개 목록과 썸네일을 정적 자산으로 전환해 Vercel 사용량을 줄였습니다.`
- `2026-07-12` / `개선` / `관리자 보안, 무변경 동기화, 상태 표시, 테스트와 모바일 탐색 화면을 개선했습니다.`

- [ ] **Step 5: Write failing hero/layout tests**

Update hero tests to require representative toolbar visibility before interaction, `모든 태그 보기`/`모든 태그 접기`, and no separate floating Hong Note card. Extend CSS tests for `.archive-hero` unframed styling, `.app-card` radius at most 8px plus `content-visibility: auto`, and mobile non-wrapping representative tag row.

Run: `npm test -- src/features/archive/archive-hero.test.tsx src/features/archive/archive-page.test.tsx src/features/archive/app-card-layout.test.ts`

Expected RED: old hero is a large floating panel with hidden tags.

- [ ] **Step 6: Compress the visual hierarchy**

Override the archive hero to an unframed max-width layout with no border, panel background, blur, or shadow. Remove the separate note card, reduce mascot to at most 96px desktop/64px mobile, use compact search and filter spacing, make the mobile representative row horizontally scrollable without wrapping, flatten the results-state section, set repeated cards to 8px radius, and keep stable media aspect ratio. Use `#6b7280` or darker for helper/placeholder text. Add `content-visibility: auto` and `contain-intrinsic-size: 440px` to cards.

- [ ] **Step 7: Make mobile first-viewport visibility an E2E assertion**

At 390x844, load `/`, assert search, representative tags, and the compact `업데이트 내역` button are visible, then assert the first `.app-card` top is less than `window.innerHeight` without scrolling. Test tag filter, reset, search, empty state, full-tag expansion, and update-history open/close with their current accessible labels.

- [ ] **Step 8: Verify visual behavior**

Run `npm run test:e2e`, then capture desktop 1440x1000 and mobile 390x844 screenshots from the local production build. Inspect that text does not overlap, card tags do not resize cards unexpectedly, the first mobile card is visible, all thumbnails render, and no request targets `/_next/image`, `/api/thumbnail`, or `/api/app-thumbnail`.

- [ ] **Step 9: Write the implementation report**

Document the six delivered priorities, preserved 56-app count, removed routes, no-op behavior, dependency/audit result, update-history entries, unit/E2E/build evidence, and desktop/mobile screenshot paths in `docs/reports/2026-07-11-hvc-hardening-sync-ui-report.md`.

- [ ] **Step 10: Verify and commit Task 6**

Run:

```bash
npm test
npm run lint
npm run build
npm run test:e2e
npm audit --omit=dev
git diff --check
```

Expected: every command exits 0; build lists `/` as static and no dynamic thumbnail route; the snapshot still contains 56 apps.

Commit: `feat: compact the public app archive`

---

## Final Whole-Branch Verification

- [ ] Generate one review package from the pre-plan base commit through `HEAD` and dispatch the final read-only reviewer against this complete plan.
- [ ] Fix all Critical and Important findings in one fix pass, rerun each covering test, regenerate the package, and re-review.
- [ ] Run fresh `npm test`, `npm run lint`, `npm run build`, `npm run test:e2e`, `npm audit --omit=dev`, `node --check scripts/apps-export-static-gallery.mjs`, and `git diff --check`.
- [ ] Confirm `src/data/public-apps.json` has exactly 56 unique app IDs and every referenced `/app-thumbnails/` file exists.
- [ ] Confirm the working tree contains no accidental `next-env.d.ts` staging or unrelated root-worktree edits.

## Self-Review

- Spec coverage: Tasks 1-6 match the user's requested order and each task ends in a separately reviewable commit.
- Conflict scan: The status UI may prevent a no-op dispatch while the workflow also guards direct/manual dispatch; these are complementary controls, not contradictory paths.
- Type consistency: `StaticGalleryBaseline`, route run shape, and `AdminWorkspace` polling props use the same field names throughout Task 5.
- Static constraint: No task adds a public DB call, public API thumbnail, or `next/image` card path.
- Placeholder scan: Every implementation step has concrete files, behavior, commands, and expected outcomes.

## Final Review Fix Wave Refinements

- Exporter image downloads reuse the pinned `fetchSafeResource` transport from `src/lib/security/remote-url.ts`. They validate credential-free public HTTP(S), every redirect, timeout, redirect count, 5 MiB body size, allow-listed MIME, and magic bytes before writing. Data URLs and uploads use the same image policy module.
- `assetManifest` contains sorted local thumbnail paths, byte sizes, and SHA-256 digests. The admin server compares it with the actual local file set; missing, extra, non-file, or changed assets make the sync pending. Public `/` consumes only the committed JSON snapshot and never performs this check.
- Workflow correlation uses `request_marker`, a public UUID stored separately from the lease token. The marker is sent as a workflow input and displayed in `run-name`; status polling searches 30 recent dispatch runs and accepts only an exact marker match. Timestamp-only and latest-run guessing are prohibited.
- `scripts/db-migrate.mjs` applies sorted unapplied SQL files through `hvc_schema_migrations`. The base table and GitHub URL migrations are idempotent, `0002_static_gallery_sync_leases.sql` is selected on clean and existing databases, and runtime table creation remains only as a compatibility fallback.

## Final Integration Re-review Refinements

- Quote the workflow `run-name` and parse the committed workflow with `js-yaml`; run `npm run db:migrate` after dependency installation and before exporter access.
- Keep request-scoped status explicit. A `request_marker` query searches only the 30 returned workflow runs for that exact marker and may load its lease row for 24 hours after request time. Markerless status is global `history`, while reload restores only the public marker from session storage. The private lease token never enters API or browser state.
- Import backup preparation applies the shared data-image MIME, 5 MiB, and magic-byte policy before any database client or INSERT. The verifier accepts `thumbnailUrl: null` while rejecting remote/invalid local references, missing files, and asset manifest drift.
- Execute the pinned remote transport from one Node-compatible `remote-url.mjs` module. Next TypeScript uses a declaration-backed wrapper, and scripts import the `.mjs` runtime directly without type-stripping or module-type warnings.
- Reject a declared oversized `File` and an encoded oversized data URL before allocating their full byte buffers; exactly 5 MiB remains accepted when MIME and signature are valid.
