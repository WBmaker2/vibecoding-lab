# Admin Sync Button Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a protected admin button that starts the static gallery sync workflow without making public page rendering dynamic again.

**Architecture:** The admin UI calls a protected Next.js API route. The route validates the admin session and dispatches a GitHub Actions workflow with a short reason string. The workflow runs the existing static export script, verifies DB-to-snapshot parity, tests/builds, commits generated snapshot assets when needed, and optionally deploys when Vercel secrets are configured.

**Tech Stack:** Next.js App Router, React client component, Vitest/Testing Library, GitHub REST API `workflow_dispatch`, GitHub Actions, existing Node export script.

## Global Constraints

- Do not make public `/` dynamic.
- Do not run `npm run apps:export-static-gallery` inside a Vercel serverless function.
- Do not expose GitHub tokens, Postgres URLs, or Vercel tokens to the browser.
- Admin sync must be explicit: only triggered by an authenticated admin pressing the button.
- Workflow should support batching: one button click syncs all current DB changes.

---

## File Structure

- Create `.github/workflows/sync-static-gallery.yml`
  - Manually dispatchable workflow that refreshes the static gallery, verifies it, commits generated files, and optionally deploys.
- Create `src/app/api/admin/sync-static-gallery/route.ts`
  - Protected POST route that calls GitHub workflow dispatch.
- Create `src/app/api/admin/sync-static-gallery/route.test.ts`
  - Unit tests for auth, missing configuration, and successful dispatch.
- Create `scripts/apps-verify-static-gallery.mjs`
  - Reusable DB-vs-snapshot verification script used by workflow and local checks.
- Modify `src/features/admin/admin-workspace.tsx`
  - Add a "수정 사항 동기화" button to the header actions.
- Modify `src/features/admin/admin-workspace.test.tsx`
  - Verify the button is rendered and calls the admin sync API.
- Modify `src/app/globals.css`
  - Add compact status styling for sync action feedback.
- Modify `.env.example`
  - Document server-only GitHub sync variables.
- Modify `README.md`
  - Document the new admin sync button and required secrets.
- Modify `package.json`
  - Add `apps:verify-static-gallery` script.

## Task 1: Protected Workflow Dispatch API

**Files:**
- Create: `src/app/api/admin/sync-static-gallery/route.ts`
- Create: `src/app/api/admin/sync-static-gallery/route.test.ts`
- Modify: `.env.example`

**Interfaces:**
- Consumes: `hasAdminSession()`
- Produces: `POST /api/admin/sync-static-gallery`
- Required env: `HVC_SYNC_GITHUB_TOKEN`
- Optional env: `HVC_SYNC_GITHUB_OWNER`, `HVC_SYNC_GITHUB_REPO`, `HVC_SYNC_GITHUB_WORKFLOW_ID`, `HVC_SYNC_GITHUB_REF`, `HVC_SYNC_BASE_URL`

- [x] **Step 1: Write route tests**

Test cases:
- unauthenticated request returns 401
- missing `HVC_SYNC_GITHUB_TOKEN` returns 503 with configuration error
- authenticated request sends a workflow dispatch request with default repo/workflow/ref/base URL

- [x] **Step 2: Implement route**

Implement server-only GitHub API call:

```ts
POST https://api.github.com/repos/{owner}/{repo}/actions/workflows/{workflow}/dispatches
```

Request body:

```json
{
  "ref": "codex/hongs-vibe-coding-lab",
  "inputs": {
    "base_url": "https://www.vivehong.shop",
    "reason": "admin-button"
  }
}
```

- [x] **Step 3: Run focused API tests**

Run:

```bash
npm test -- src/app/api/admin/sync-static-gallery/route.test.ts
```

Expected: PASS.

## Task 2: Admin Button UI

**Files:**
- Modify: `src/features/admin/admin-workspace.tsx`
- Modify: `src/features/admin/admin-workspace.test.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: `POST /api/admin/sync-static-gallery`
- Produces: a visible "수정 사항 동기화" button and status message.

- [x] **Step 1: Add failing UI test**

Assert the header shows a "수정 사항 동기화" button and clicking it calls `/api/admin/sync-static-gallery`.

- [x] **Step 2: Implement UI**

Add local pending/status state:
- idle button label: `수정 사항 동기화`
- pending label: `동기화 시작 중...`
- success message: `동기화 작업을 시작했습니다. GitHub Actions와 Vercel 배포가 완료되면 공개 페이지에 반영됩니다.`
- failure message from API or generic fallback

- [x] **Step 3: Run admin workspace tests**

Run:

```bash
npm test -- src/features/admin/admin-workspace.test.tsx
```

Expected: PASS.

## Task 3: GitHub Actions Sync Workflow

**Files:**
- Create: `.github/workflows/sync-static-gallery.yml`
- Create: `scripts/apps-verify-static-gallery.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: `workflow_dispatch` inputs `base_url`, `reason`
- Consumes secrets: `POSTGRES_URL`
- Optional deploy secrets: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`
- Produces: committed changes in `src/data/public-apps.json` and `public/app-thumbnails/*`

- [x] **Step 1: Add verification script**

Create `scripts/apps-verify-static-gallery.mjs` that prints JSON with:
- `dbCount`
- `snapshotCount`
- `missingCount`
- `extraCount`
- `mismatchCount`
- `thumbnailStats`

Exit non-zero when counts mismatch or thumbnails are not all local.

- [x] **Step 2: Add npm script**

Add:

```json
"apps:verify-static-gallery": "node scripts/apps-verify-static-gallery.mjs"
```

- [x] **Step 3: Add workflow**

Workflow steps:
- checkout current ref
- setup Node 24
- `npm ci`
- `npm run apps:export-static-gallery -- --base-url "$BASE_URL"`
- `npm run apps:verify-static-gallery`
- focused tests, lint, build, `git diff --check`
- commit generated files if changed
- optionally deploy with Vercel when deploy secrets are present

## Task 4: Documentation And Final Verification

**Files:**
- Modify: `README.md`
- Verify: all changed files

- [x] **Step 1: Document required env/secrets**

Document Vercel env vars for the admin route:
- `HVC_SYNC_GITHUB_TOKEN`
- `HVC_SYNC_GITHUB_OWNER`
- `HVC_SYNC_GITHUB_REPO`
- `HVC_SYNC_GITHUB_WORKFLOW_ID`
- `HVC_SYNC_GITHUB_REF`
- `HVC_SYNC_BASE_URL`

Document GitHub Actions secrets:
- `POSTGRES_URL`
- optional `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`

- [x] **Step 2: Run full verification**

Run:

```bash
npm test
npm run lint
npm run build
git diff --check
```

Expected: PASS.

## Self-Review

- Spec coverage: protected admin button, explicit sync trigger, GitHub Actions dispatch, static public page preserved, docs included.
- Placeholder scan: no placeholders.
- Type consistency: API JSON shape and UI fetch target are aligned.
