# Vercel Usage Reduction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce Vercel Fast Origin Transfer, ISR Writes, and Image Optimization usage by making the public gallery read a committed static snapshot and by avoiding compute-backed thumbnail routes on the public card grid.

**Architecture:** Keep the admin app dynamic because it uses cookies, Server Actions, and database writes. Make only the public `/` archive static by reading `src/data/public-apps.json` at build time, rendering card thumbnails with plain static-friendly image tags, and removing public page revalidation after admin mutations. A script materializes live thumbnails into `public/app-thumbnails/` when possible, so the gallery can be refreshed before deployment without relying on `/api/app-thumbnail/...` during normal browsing.

**Tech Stack:** Next.js App Router, React, TypeScript, Vitest, Node.js scripts, Vercel Blob/Postgres only for admin and refresh tooling.

**Implementation status (2026-05-11):** Completed. The committed snapshot was regenerated from Postgres and now contains the existing 36 registered apps. A DB-to-snapshot check found 0 missing apps, 0 extra apps, and 0 metadata mismatches; all 36 snapshot thumbnails point to local `/app-thumbnails/...` assets.

---

## File Structure

- Create `src/data/public-apps.json`
  - Committed public gallery snapshot. Contains `{ version, generatedAt, appCount, apps }`.
- Create `src/lib/apps/static-public-apps.ts`
  - Converts the JSON snapshot into `PublicAppRecord[]`, normalizes date strings, and rejects compute-backed thumbnail URLs such as `/api/app-thumbnail/...`.
- Create `src/lib/apps/static-public-apps.test.ts`
  - Unit tests for date conversion and static thumbnail safety.
- Create `scripts/apps-export-static-gallery.mjs`
  - Reads app records from Postgres via `POSTGRES_URL` (ordered by updated_at desc then created_at desc), downloads or decodes thumbnails into `public/app-thumbnails/`, then writes `src/data/public-apps.json`.
  - Optional fallback: `--backup <path>` to load an exported admin backup JSON without DB access.
  - `--base-url <url>` (or a single positional `https://...` URL) is kept only as the origin for materializing relative/internal thumbnail URLs.
- Modify `src/app/page.tsx`
  - Use the static snapshot instead of `getAppRepository().listPublicApps()` and force static rendering.
- Modify `src/features/archive/app-card.tsx`
  - Replace `next/image` for app card thumbnails with a native `<img>` so public card images do not trigger Vercel Image Optimization or internal image optimizer paths.
- Modify `src/app/globals.css`
  - Give `.app-card-thumbnail` stable absolute positioning formerly supplied by `next/image fill`.
- Modify `src/app/admin/actions.ts`
  - Stop revalidating `/` after admin mutations; only refresh `/admin`.
- Modify `next.config.ts`
  - Remove the wildcard `images.remotePatterns` configuration.
- Modify `package.json`
  - Add `apps:export-static-gallery` script.
- Create `docs/reports/2026-05-11-vercel-usage-reduction-report.md`
  - Final implementation and verification report.

## Acceptance Criteria

- The public home page no longer imports `getAppRepository` or reads Postgres at request time.
- `src/app/page.tsx` exports `dynamic = "force-static"`.
- Admin create/update/delete/tag actions no longer call `revalidatePath("/")`.
- Public app cards do not use `next/image` for thumbnails.
- `next.config.ts` no longer allows every remote image host via `hostname: "**"`.
- Snapshot loader rejects `/api/app-thumbnail/...` and `/api/thumbnail?...` values so public browsing cannot accidentally call internal thumbnail compute routes.
- `npm test`, `npm run lint`, and `npm run build` pass.

---

### Task 1: Static Public Gallery Snapshot

**Files:**
- Create: `src/data/public-apps.json`
- Create: `src/lib/apps/static-public-apps.ts`
- Create: `src/lib/apps/static-public-apps.test.ts`
- Create: `scripts/apps-export-static-gallery.mjs`
- Modify: `src/app/page.tsx`
- Modify: `package.json`

- [ ] **Step 1: Write the failing static snapshot tests**

Create `src/lib/apps/static-public-apps.test.ts`:

```ts
import { toStaticPublicAppRecord } from "./static-public-apps";

describe("static public apps", () => {
  it("converts serialized snapshot apps into public app records", () => {
    const record = toStaticPublicAppRecord({
      id: "reading-timer",
      title: "Reading Timer",
      summary: "읽기 활동 시간을 관리하는 타이머",
      url: "https://example.com/reading-timer",
      tags: ["읽기", "영어"],
      thumbnailMode: "auto",
      thumbnailUrl: "/app-thumbnails/reading-timer.webp",
      subject: "영어",
      grade: "초등",
      memo: "읽기 루틴 도입용으로 쓰기 좋습니다.",
      createdAt: "2026-04-05T00:00:00.000Z",
      updatedAt: "2026-04-05T01:00:00.000Z"
    });

    expect(record.createdAt).toBeInstanceOf(Date);
    expect(record.updatedAt).toBeInstanceOf(Date);
    expect(record.thumbnailUrl).toBe("/app-thumbnails/reading-timer.webp");
    expect(record.tags).toEqual(["읽기", "영어"]);
  });

  it("drops internal compute thumbnail URLs from the static public payload", () => {
    const record = toStaticPublicAppRecord({
      id: "reading-timer",
      title: "Reading Timer",
      summary: "읽기 활동 시간을 관리하는 타이머",
      url: "https://example.com/reading-timer",
      tags: ["읽기"],
      thumbnailMode: "auto",
      thumbnailUrl: "/api/app-thumbnail/reading-timer/1777800000000",
      subject: null,
      grade: null,
      memo: null,
      createdAt: "2026-04-05T00:00:00.000Z",
      updatedAt: "2026-04-05T01:00:00.000Z"
    });

    expect(record.thumbnailUrl).toBeNull();
  });
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npm test -- src/lib/apps/static-public-apps.test.ts`

Expected: FAIL because `src/lib/apps/static-public-apps.ts` does not exist yet.

- [ ] **Step 3: Add the static snapshot loader**

Create `src/lib/apps/static-public-apps.ts`:

```ts
import snapshot from "@/data/public-apps.json";
import type { PublicAppRecord, ThumbnailMode } from "./types";

export interface SerializedPublicAppRecord {
  id: string;
  title: string;
  summary: string;
  url: string;
  tags: string[];
  thumbnailMode: string;
  thumbnailUrl: string | null;
  subject?: string | null;
  grade?: string | null;
  memo?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface PublicAppsSnapshot {
  version: number;
  generatedAt: string;
  appCount: number;
  apps: SerializedPublicAppRecord[];
}

const STATIC_THUMBNAIL_PREFIXES = ["/app-thumbnails/", "/images/"];
const INTERNAL_COMPUTE_PREFIXES = ["/api/app-thumbnail/", "/api/thumbnail"];
const THUMBNAIL_MODES = new Set<ThumbnailMode>(["auto", "upload", "placeholder"]);

function normalizeThumbnailMode(value: string): ThumbnailMode {
  return THUMBNAIL_MODES.has(value as ThumbnailMode)
    ? (value as ThumbnailMode)
    : "placeholder";
}

function normalizeStaticThumbnailUrl(value: string | null) {
  if (!value) {
    return null;
  }

  if (INTERNAL_COMPUTE_PREFIXES.some((prefix) => value.startsWith(prefix))) {
    return null;
  }

  if (STATIC_THUMBNAIL_PREFIXES.some((prefix) => value.startsWith(prefix))) {
    return value;
  }

  try {
    const parsedUrl = new URL(value);

    if (parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:") {
      return parsedUrl.toString();
    }
  } catch {
    return null;
  }

  return null;
}

export function toStaticPublicAppRecord(
  app: SerializedPublicAppRecord
): PublicAppRecord {
  return {
    id: app.id,
    title: app.title,
    summary: app.summary,
    url: app.url,
    tags: Array.isArray(app.tags) ? app.tags : [],
    thumbnailMode: normalizeThumbnailMode(app.thumbnailMode),
    thumbnailUrl: normalizeStaticThumbnailUrl(app.thumbnailUrl),
    subject: app.subject ?? undefined,
    grade: app.grade ?? undefined,
    memo: app.memo ?? undefined,
    createdAt: new Date(app.createdAt),
    updatedAt: new Date(app.updatedAt)
  };
}

export function listStaticPublicApps() {
  const typedSnapshot = snapshot as PublicAppsSnapshot;
  return typedSnapshot.apps.map(toStaticPublicAppRecord);
}
```

- [x] **Step 4: Add a committed snapshot**

Create `src/data/public-apps.json` with a valid snapshot wrapper. The actual committed file was generated from Postgres with `npm run apps:export-static-gallery -- --base-url https://www.vivehong.shop` and contains 36 apps. If live export is unavailable in a future emergency, the minimum valid wrapper shape is:

```json
{
  "version": 1,
  "generatedAt": "2026-05-11T00:00:00.000Z",
  "appCount": 1,
  "apps": [
    {
      "id": "example-app",
      "title": "Example App",
      "summary": "A static gallery record example.",
      "url": "https://example.com",
      "githubUrl": null,
      "tags": ["example"],
      "thumbnailMode": "auto",
      "thumbnailUrl": "/app-thumbnails/example-app.png",
      "subject": null,
      "grade": null,
      "memo": null,
      "createdAt": "2026-05-11T00:00:00.000Z",
      "updatedAt": "2026-05-11T00:00:00.000Z"
    }
  ]
}
```

- [ ] **Step 5: Switch the public home page to the static loader**

Modify `src/app/page.tsx`:

```ts
import { ArchivePage } from "@/features/archive/archive-page";
import { listStaticPublicApps } from "@/lib/apps/static-public-apps";

export const dynamic = "force-static";

export default function HomePage() {
  const apps = listStaticPublicApps();

  return <ArchivePage initialApps={apps} />;
}
```

- [ ] **Step 6: Add the static gallery export script**

Create `scripts/apps-export-static-gallery.mjs` to:

1. Load app records from Postgres when `POSTGRES_URL` is configured, sorted by `updated_at desc, created_at desc`.
2. Optional mode: load the backup payload from `--backup <path>` to avoid DB access.
3. For `data:image/...;base64,...` thumbnails, decode and save to `public/app-thumbnails/<slug>.<ext>`.
4. For relative thumbnail routes (`/api/...`) and same-origin absolute URLs, fetch from the materialization base URL and save to `public/app-thumbnails/<slug>.<ext>`.
5. For third-party absolute `http(s)` thumbnails, attempt to fetch and save them; if fetching fails, keep the absolute URL. Same-origin thumbnail materialization failures must stop the export before writing.
6. Write the snapshot wrapper to `src/data/public-apps.json`.

Use deterministic slugs based on `app.id || app.title`, lowercase ASCII when possible, and a safe fallback of `app-${index + 1}`.

- [ ] **Step 7: Add package script**

Modify `package.json` scripts:

```json
"apps:export-static-gallery": "node scripts/apps-export-static-gallery.mjs"
```

- [ ] **Step 8: Verify Task 1**

Run:

```bash
npm test -- src/lib/apps/static-public-apps.test.ts src/app/__tests__/home-shell.test.tsx
```

Expected: PASS. The home shell test should render from the JSON snapshot, not from the repository.

---

### Task 2: Public Thumbnail Delivery and Revalidation Reduction

**Files:**
- Modify: `src/features/archive/app-card.tsx`
- Modify: `src/features/archive/app-card.test.tsx`
- Modify: `src/app/globals.css`
- Modify: `src/app/admin/actions.ts`
- Modify: `next.config.ts`

- [ ] **Step 1: Update the AppCard test for native image rendering**

Modify `src/features/archive/app-card.test.tsx` so it no longer mocks `next/image`. The assertion should verify that the thumbnail is a normal image with static-friendly attributes:

```ts
expect(
  screen.getByRole("img", { name: "Reading Timer 썸네일" })
).toHaveAttribute("src", "/app-thumbnails/reading-timer.webp");
expect(
  screen.getByRole("img", { name: "Reading Timer 썸네일" })
).toHaveAttribute("loading", "lazy");
```

Use a sample `thumbnailUrl` of `/app-thumbnails/reading-timer.webp`.

- [ ] **Step 2: Run the focused card test to verify it fails**

Run: `npm test -- src/features/archive/app-card.test.tsx`

Expected: FAIL until `AppCard` stops using `next/image`.

- [ ] **Step 3: Replace public card `next/image` with native `<img>`**

Modify `src/features/archive/app-card.tsx`:

```tsx
import type { PublicAppRecord } from "@/lib/apps/types";

// ...

{app.thumbnailUrl && (
  <>
    <img
      alt={`${app.title} 썸네일`}
      className="app-card-thumbnail"
      decoding="async"
      loading="lazy"
      referrerPolicy="no-referrer"
      src={app.thumbnailUrl}
    />
    <div className="app-card-media-scrim" />
  </>
)}
```

- [ ] **Step 4: Restore stable thumbnail layout CSS**

Modify `.app-card-thumbnail` in `src/app/globals.css`:

```css
.app-card-thumbnail {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
```

- [ ] **Step 5: Stop public page revalidation after admin mutations**

Modify `src/app/admin/actions.ts`:

```ts
function revalidateAdmin() {
  revalidatePath("/admin");
}
```

Then replace all `revalidateArchive();` calls with `revalidateAdmin();`.

- [ ] **Step 6: Remove wildcard remote image optimization config**

Modify `next.config.ts`:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {};

export default nextConfig;
```

- [ ] **Step 7: Verify Task 2**

Run:

```bash
npm test -- src/features/archive/app-card.test.tsx
npm run lint
```

Expected: both PASS.

---

### Task 3: Full Verification and Report

**Files:**
- Create: `docs/reports/2026-05-11-vercel-usage-reduction-report.md`

- [ ] **Step 1: Run the complete test suite**

Run:

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 2: Run lint**

Run:

```bash
npm run lint
```

Expected: PASS.

- [ ] **Step 3: Run production build**

Run:

```bash
npm run build
```

Expected: PASS. The build should not fail because the public page is force-static.

- [ ] **Step 4: Write the report**

Create `docs/reports/2026-05-11-vercel-usage-reduction-report.md` with:

```md
# Vercel Usage Reduction Report

## Summary

- Public gallery now renders from `src/data/public-apps.json`.
- App card thumbnails use native `<img>` tags and static-friendly URLs.
- Admin mutations no longer revalidate `/`.
- Wildcard remote image optimization is removed from `next.config.ts`.

## Verification

- `npm test`: PASS
- `npm run lint`: PASS
- `npm run build`: PASS

## Expected Vercel Impact

- Fewer public Function/DB reads for `/`.
- Fewer ISR writes caused by admin updates.
- Fewer Image Optimization transformations and cache operations from public app cards.

## Operational Note

Before deployment after changing app cards, refresh the snapshot:

```bash
POSTGRES_URL=... npm run apps:export-static-gallery -- --base-url https://www.vivehong.shop
```

Or convert an admin backup without DB access:

```bash
npm run apps:export-static-gallery -- --backup path/to/admin-backup.json --base-url https://www.vivehong.shop
```

Then inspect `src/data/public-apps.json` and `public/app-thumbnails/` before committing.
```

- [ ] **Step 5: Final check**

Run:

```bash
git diff --stat
git diff --check
```

Expected: no whitespace errors and only planned files changed.
