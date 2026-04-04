# Hong's Vibe Coding Lab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `Hong's Vibe Coding Lab`의 공개 아카이브형 포트폴리오와 1인용 관리자 페이지를 구축해, 검색/태그 필터와 링크 기반 앱 등록 흐름을 제공한다.

**Architecture:** `Next.js` App Router 기반 단일 애플리케이션으로 공개 페이지와 관리자 페이지를 함께 운영한다. 앱 데이터는 `Postgres`에 저장하고, 썸네일은 링크 메타데이터 자동 수집을 기본으로 하되 `Vercel Blob` 업로드와 플레이스홀더를 대체 경로로 둔다. 공개 페이지는 서버에서 앱 목록을 불러온 뒤 클라이언트에서 즉시 검색/태그 필터링을 수행해 빠른 탐색 경험을 만든다.

**Tech Stack:** `Next.js`, `React`, `TypeScript`, `Drizzle ORM`, `Postgres`, `Vercel Blob`, `Zod`, `Vitest`, `React Testing Library`, `Playwright`

---

## File Structure

### App Shell and Tooling

- Create: `.gitignore`
- Create: `.env.example`
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `eslint.config.mjs`
- Create: `vitest.config.ts`
- Create: `playwright.config.ts`
- Create: `src/app/layout.tsx`
- Create: `src/app/globals.css`

### Shared Libraries

- Create: `src/lib/env.ts`
- Create: `src/lib/auth/session.ts`
- Create: `src/lib/apps/types.ts`
- Create: `src/lib/apps/schema.ts`
- Create: `src/lib/apps/repository.ts`
- Create: `src/lib/search/filter-apps.ts`
- Create: `src/lib/metadata/fetch-link-preview.ts`
- Create: `src/lib/storage/thumbnails.ts`

### Database

- Create: `drizzle.config.ts`
- Create: `src/db/client.ts`
- Create: `src/db/schema.ts`
- Create: `src/db/migrations/`

### Public Experience

- Create: `src/app/page.tsx`
- Create: `src/features/archive/archive-page.tsx`
- Create: `src/features/archive/search-bar.tsx`
- Create: `src/features/archive/tag-filter-bar.tsx`
- Create: `src/features/archive/app-card.tsx`
- Create: `src/features/archive/empty-state.tsx`
- Create: `public/images/placeholder-app.png`
- Create: `public/images/mascots/hong-default.png`

### Admin Experience

- Create: `src/app/admin/login/page.tsx`
- Create: `src/app/admin/login/actions.ts`
- Create: `src/app/admin/layout.tsx`
- Create: `src/app/admin/page.tsx`
- Create: `src/app/admin/actions.ts`
- Create: `src/features/admin/admin-shell.tsx`
- Create: `src/features/admin/app-form.tsx`
- Create: `src/features/admin/tag-input.tsx`
- Create: `src/features/admin/thumbnail-controls.tsx`
- Create: `src/features/admin/app-list.tsx`

### Tests

- Create: `src/app/__tests__/home-shell.test.tsx`
- Create: `src/lib/apps/schema.test.ts`
- Create: `src/lib/search/filter-apps.test.ts`
- Create: `src/lib/auth/session.test.ts`
- Create: `src/lib/metadata/fetch-link-preview.test.ts`
- Create: `tests/e2e/public-archive.spec.ts`
- Create: `tests/e2e/admin-flow.spec.ts`

### Docs

- Create: `README.md`

## Task 1: Bootstrap the Next.js App Shell

**Files:**
- Create: `.gitignore`
- Create: `.env.example`
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `eslint.config.mjs`
- Create: `vitest.config.ts`
- Create: `playwright.config.ts`
- Create: `src/app/layout.tsx`
- Create: `src/app/globals.css`
- Create: `src/app/page.tsx`
- Test: `src/app/__tests__/home-shell.test.tsx`

- [ ] **Step 1: Create tooling files and install dependencies**

Create a minimal `package.json` with scripts:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test"
  }
}
```

Install runtime dependencies:

```bash
npm install next react react-dom drizzle-orm postgres zod @vercel/blob iron-session clsx
```

Install dev dependencies:

```bash
npm install -D typescript @types/node @types/react @types/react-dom eslint eslint-config-next vitest jsdom @testing-library/react @testing-library/jest-dom playwright drizzle-kit
```

- [ ] **Step 2: Write the failing homepage shell test**

Create `src/app/__tests__/home-shell.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import HomePage from "../page";

describe("HomePage", () => {
  it("renders the archive hero and search UI", async () => {
    render(await HomePage());
    expect(screen.getByRole("heading", { name: /Hong's Vibe Coding Lab/i })).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: /앱 검색/i })).toBeInTheDocument();
    expect(screen.getByText(/태그로 탐색/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run:

```bash
npm run test -- src/app/__tests__/home-shell.test.tsx
```

Expected:

- FAIL because `page.tsx` and the public shell do not exist yet

- [ ] **Step 4: Implement the minimal app shell**

Create:

- `src/app/layout.tsx` with Korean metadata and global styles
- `src/app/globals.css` with archive-style design tokens
- `src/app/page.tsx` returning a minimal server component wrapper for the homepage

Minimal page shape:

```tsx
export default async function HomePage() {
  return (
    <main>
      <h1>Hong's Vibe Coding Lab</h1>
      <label htmlFor="app-search">앱 검색</label>
      <input id="app-search" type="search" aria-label="앱 검색" />
      <p>태그로 탐색</p>
    </main>
  );
}
```

Also create `.gitignore` entries:

```gitignore
node_modules
.next
.env
.env.local
.env.*.local
.vercel
.playwright
.superpowers
```

And `.env.example`:

```bash
POSTGRES_URL=
BLOB_READ_WRITE_TOKEN=
ADMIN_PASSWORD=
SESSION_SECRET=
APP_BASE_URL=http://localhost:3000
```

- [ ] **Step 5: Run the unit test again**

Run:

```bash
npm run test -- src/app/__tests__/home-shell.test.tsx
```

Expected:

- PASS

- [ ] **Step 6: Run the quality gates for the scaffold**

Run:

```bash
npm run lint
npm run build
```

Expected:

- `lint` passes with no errors
- `build` completes successfully

- [ ] **Step 7: Commit the scaffold**

```bash
git add .gitignore .env.example package.json tsconfig.json next.config.ts eslint.config.mjs vitest.config.ts playwright.config.ts src/app/layout.tsx src/app/globals.css src/app/page.tsx src/app/__tests__/home-shell.test.tsx
git commit -m "chore: scaffold Next.js archive app"
```

## Task 2: Define Environment, Database Schema, and App Domain Model

**Files:**
- Create: `src/lib/env.ts`
- Create: `src/lib/apps/types.ts`
- Create: `src/lib/apps/schema.ts`
- Create: `src/lib/apps/repository.ts`
- Create: `drizzle.config.ts`
- Create: `src/db/client.ts`
- Create: `src/db/schema.ts`
- Create: `src/lib/apps/schema.test.ts`

- [ ] **Step 1: Write failing tests for app validation**

Create `src/lib/apps/schema.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { appInputSchema } from "./schema";

describe("appInputSchema", () => {
  it("accepts multiple tags and optional public fields", () => {
    const parsed = appInputSchema.parse({
      title: "Class Random Seat",
      summary: "학급 자리 배치 도구",
      url: "https://example.com",
      tags: ["학급경영", "업무경감"],
      subject: "창체",
      grade: "초등 5학년",
      memo: "교실 화면 공유에 적합"
    });

    expect(parsed.tags).toHaveLength(2);
    expect(parsed.memo).toBe("교실 화면 공유에 적합");
  });

  it("rejects empty required fields", () => {
    expect(() => appInputSchema.parse({
      title: "",
      summary: "",
      url: "not-a-url",
      tags: []
    })).toThrow();
  });
});
```

- [ ] **Step 2: Run the schema test to verify it fails**

Run:

```bash
npm run test -- src/lib/apps/schema.test.ts
```

Expected:

- FAIL because the schema files do not exist yet

- [ ] **Step 3: Implement the app domain model and env validation**

Create `src/lib/env.ts`:

```ts
import { z } from "zod";

export const envSchema = z.object({
  POSTGRES_URL: z.string().min(1),
  BLOB_READ_WRITE_TOKEN: z.string().min(1),
  ADMIN_PASSWORD: z.string().min(8),
  SESSION_SECRET: z.string().min(16),
  APP_BASE_URL: z.string().url()
});
```

Create `src/lib/apps/schema.ts`:

```ts
import { z } from "zod";

export const appInputSchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1).max(160),
  url: z.string().url(),
  tags: z.array(z.string().min(1)).min(1),
  subject: z.string().optional().or(z.literal("")),
  grade: z.string().optional().or(z.literal("")),
  memo: z.string().optional().or(z.literal("")),
  thumbnailMode: z.enum(["auto", "upload", "placeholder"]),
  thumbnailUrl: z.string().optional()
});
```

Create `src/db/schema.ts` using Drizzle:

```ts
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const apps = pgTable("apps", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  url: text("url").notNull(),
  tags: text("tags").array().notNull(),
  thumbnailMode: text("thumbnail_mode").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  subject: text("subject"),
  grade: text("grade"),
  memo: text("memo"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
```

Create repository boundary:

```ts
export interface AppRepository {
  listPublicApps(): Promise<AppRecord[]>;
  listAdminApps(): Promise<AppRecord[]>;
  createApp(input: AppInput): Promise<AppRecord>;
  updateApp(id: string, input: AppInput): Promise<AppRecord>;
  deleteApp(id: string): Promise<void>;
}
```

- [ ] **Step 4: Generate the first migration**

Run:

```bash
npx drizzle-kit generate
```

Expected:

- migration file created under `src/db/migrations/`

- [ ] **Step 5: Run the schema test again**

Run:

```bash
npm run test -- src/lib/apps/schema.test.ts
```

Expected:

- PASS

- [ ] **Step 6: Commit the domain layer**

```bash
git add src/lib/env.ts src/lib/apps/types.ts src/lib/apps/schema.ts src/lib/apps/repository.ts drizzle.config.ts src/db/client.ts src/db/schema.ts src/db/migrations src/lib/apps/schema.test.ts
git commit -m "feat: define app data model and database schema"
```

## Task 3: Build Public Search, Tag Filtering, and Archive Cards

**Files:**
- Create: `src/lib/search/filter-apps.ts`
- Create: `src/lib/search/filter-apps.test.ts`
- Create: `src/features/archive/archive-page.tsx`
- Create: `src/features/archive/search-bar.tsx`
- Create: `src/features/archive/tag-filter-bar.tsx`
- Create: `src/features/archive/app-card.tsx`
- Create: `src/features/archive/empty-state.tsx`
- Modify: `src/app/page.tsx`
- Create: `public/images/placeholder-app.png`
- Create: `public/images/mascots/hong-default.png`

- [ ] **Step 1: Write failing tests for search and multi-tag logic**

Create `src/lib/search/filter-apps.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { filterApps } from "./filter-apps";

const apps = [
  {
    id: "1",
    title: "Talking Vocab Quiz",
    summary: "영어 단어 퀴즈",
    tags: ["영어", "게임형"],
    subject: "영어",
    grade: "초등 4학년",
    memo: "짧은 형성평가에 적합"
  },
  {
    id: "2",
    title: "Class Random Seat",
    summary: "자리 배치 도구",
    tags: ["학급경영", "업무경감"],
    subject: "창체",
    grade: "",
    memo: ""
  }
];

describe("filterApps", () => {
  it("matches query across summary, tags, subject, grade, and memo", () => {
    expect(filterApps(apps, "형성평가", [])).toHaveLength(1);
    expect(filterApps(apps, "창체", [])).toHaveLength(1);
  });

  it("requires all selected tags to match", () => {
    expect(filterApps(apps, "", ["학급경영", "업무경감"])).toHaveLength(1);
    expect(filterApps(apps, "", ["영어", "업무경감"])).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run the filter test to verify it fails**

Run:

```bash
npm run test -- src/lib/search/filter-apps.test.ts
```

Expected:

- FAIL because the filter utility does not exist yet

- [ ] **Step 3: Implement the filter utility and public archive UI**

Create `src/lib/search/filter-apps.ts`:

```ts
export function filterApps(apps: SearchableApp[], query: string, activeTags: string[]) {
  const normalized = query.trim().toLowerCase();

  return apps.filter((app) => {
    const haystack = [
      app.title,
      app.summary,
      ...app.tags,
      app.subject ?? "",
      app.grade ?? "",
      app.memo ?? ""
    ].join(" ").toLowerCase();

    const queryMatch = normalized === "" || haystack.includes(normalized);
    const tagMatch = activeTags.every((tag) => app.tags.includes(tag));

    return queryMatch && tagMatch;
  });
}
```

Build public UI with these responsibilities:

- `archive-page.tsx`: state owner for query and active tags
- `search-bar.tsx`: accessible search input
- `tag-filter-bar.tsx`: clickable removable active tags
- `app-card.tsx`: thumbnail, title, summary, tags, subject/grade, memo preview, external link button
- `empty-state.tsx`: Hong mascot + no-results guidance

- [ ] **Step 4: Wire the server page to real data**

Update `src/app/page.tsx`:

```tsx
import { getAppRepository } from "@/lib/apps/repository";
import { ArchivePage } from "@/features/archive/archive-page";

export default async function HomePage() {
  const repo = getAppRepository();
  const apps = await repo.listPublicApps();

  return <ArchivePage initialApps={apps} />;
}
```

- [ ] **Step 5: Run the public archive tests**

Run:

```bash
npm run test -- src/lib/search/filter-apps.test.ts src/app/__tests__/home-shell.test.tsx
```

Expected:

- PASS

- [ ] **Step 6: Run lint and build**

Run:

```bash
npm run lint
npm run build
```

Expected:

- PASS

- [ ] **Step 7: Commit the public archive**

```bash
git add src/lib/search/filter-apps.ts src/lib/search/filter-apps.test.ts src/features/archive src/app/page.tsx public/images/placeholder-app.png public/images/mascots/hong-default.png
git commit -m "feat: build searchable public archive"
```

## Task 4: Add Admin Authentication and Protected Layout

**Files:**
- Create: `src/lib/auth/session.ts`
- Create: `src/lib/auth/session.test.ts`
- Create: `src/app/admin/login/page.tsx`
- Create: `src/app/admin/login/actions.ts`
- Create: `src/app/admin/layout.tsx`

- [ ] **Step 1: Write failing tests for session helpers**

Create `src/lib/auth/session.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { verifyAdminPassword } from "./session";

describe("verifyAdminPassword", () => {
  it("accepts the configured password", async () => {
    process.env.ADMIN_PASSWORD = "very-secret-password";
    await expect(verifyAdminPassword("very-secret-password")).resolves.toBe(true);
  });

  it("rejects a wrong password", async () => {
    process.env.ADMIN_PASSWORD = "very-secret-password";
    await expect(verifyAdminPassword("wrong-password")).resolves.toBe(false);
  });
});
```

- [ ] **Step 2: Run the auth test to verify it fails**

Run:

```bash
npm run test -- src/lib/auth/session.test.ts
```

Expected:

- FAIL because the auth helpers do not exist yet

- [ ] **Step 3: Implement cookie-based admin auth**

Create `src/lib/auth/session.ts` with:

- password comparison helper
- signed session serialization
- `requireAdminSession()` helper for protected routes
- `clearAdminSession()` helper for logout

Suggested shape:

```ts
export async function verifyAdminPassword(input: string) {
  return input === env.ADMIN_PASSWORD;
}

export async function setAdminSession() {
  cookies().set("admin_session", signedValue, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/"
  });
}
```

- [ ] **Step 4: Build the login page and protected layout**

Implement:

- `/admin/login` form with password field
- login server action
- `/admin/layout.tsx` that redirects unauthenticated users to `/admin/login`

Expected protected-layout pattern:

```tsx
export default async function AdminLayout({ children }: PropsWithChildren) {
  const isAuthed = await requireAdminSession();
  if (!isAuthed) redirect("/admin/login");
  return <>{children}</>;
}
```

- [ ] **Step 5: Run the auth tests**

Run:

```bash
npm run test -- src/lib/auth/session.test.ts
```

Expected:

- PASS

- [ ] **Step 6: Commit admin auth**

```bash
git add src/lib/auth/session.ts src/lib/auth/session.test.ts src/app/admin/login/page.tsx src/app/admin/login/actions.ts src/app/admin/layout.tsx
git commit -m "feat: add admin password authentication"
```

## Task 5: Build the Admin List and CRUD Form

**Files:**
- Create: `src/app/admin/page.tsx`
- Create: `src/app/admin/actions.ts`
- Create: `src/features/admin/admin-shell.tsx`
- Create: `src/features/admin/app-list.tsx`
- Create: `src/features/admin/app-form.tsx`
- Create: `src/features/admin/tag-input.tsx`
- Create: `src/features/admin/thumbnail-controls.tsx`

- [ ] **Step 1: Write failing tests for form data parsing**

Create a form-focused test file if not already present, or extend `src/lib/apps/schema.test.ts`:

```ts
it("keeps optional public fields empty when not provided", () => {
  const parsed = appInputSchema.parse({
    title: "Worksheet Toolkit",
    summary: "활동지 보조 도구",
    url: "https://example.com/toolkit",
    tags: ["업무경감"],
    thumbnailMode: "placeholder"
  });

  expect(parsed.subject).toBeUndefined();
  expect(parsed.grade).toBeUndefined();
  expect(parsed.memo).toBeUndefined();
});
```

- [ ] **Step 2: Run the test to verify it fails for the missing CRUD flow**

Run:

```bash
npm run test -- src/lib/apps/schema.test.ts
```

Expected:

- FAIL until CRUD-facing schema handling is fully wired

- [ ] **Step 3: Implement the admin dashboard shell**

The admin page should render:

- current app list
- add new app CTA
- edit button per row/card
- delete button with confirmation

Page skeleton:

```tsx
export default async function AdminPage() {
  const repo = getAppRepository();
  const apps = await repo.listAdminApps();
  return <AdminShell apps={apps} />;
}
```

- [ ] **Step 4: Implement the app form**

The form must support:

- title
- summary
- url
- tags (multi-value)
- thumbnail mode
- optional collapse for subject, grade, memo

Tag input behavior:

```tsx
// Enter or comma commits a tag chip
// Backspace removes the last tag when the field is empty
```

Server actions in `src/app/admin/actions.ts` should provide:

- `createAppAction`
- `updateAppAction`
- `deleteAppAction`

- [ ] **Step 5: Run unit tests and lint**

Run:

```bash
npm run test -- src/lib/apps/schema.test.ts
npm run lint
```

Expected:

- PASS

- [ ] **Step 6: Commit admin CRUD**

```bash
git add src/app/admin/page.tsx src/app/admin/actions.ts src/features/admin/admin-shell.tsx src/features/admin/app-list.tsx src/features/admin/app-form.tsx src/features/admin/tag-input.tsx src/features/admin/thumbnail-controls.tsx src/lib/apps/schema.test.ts
git commit -m "feat: add admin app management flow"
```

## Task 6: Implement Link Metadata Fetch, Upload Fallback, and Placeholder Flow

**Files:**
- Create: `src/lib/metadata/fetch-link-preview.ts`
- Create: `src/lib/metadata/fetch-link-preview.test.ts`
- Create: `src/lib/storage/thumbnails.ts`
- Modify: `src/features/admin/app-form.tsx`
- Modify: `src/features/admin/thumbnail-controls.tsx`

- [ ] **Step 1: Write failing tests for metadata extraction**

Create `src/lib/metadata/fetch-link-preview.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { extractPreviewFromHtml } from "./fetch-link-preview";

describe("extractPreviewFromHtml", () => {
  it("extracts title, description, and og:image", () => {
    const preview = extractPreviewFromHtml(`
      <html>
        <head>
          <title>Talking Vocab Quiz</title>
          <meta property="og:image" content="https://example.com/thumb.png" />
          <meta name="description" content="영어 단어 퀴즈" />
        </head>
      </html>
    `);

    expect(preview.title).toBe("Talking Vocab Quiz");
    expect(preview.imageUrl).toBe("https://example.com/thumb.png");
  });

  it("returns null imageUrl when og:image is missing", () => {
    const preview = extractPreviewFromHtml("<html><head><title>No Image</title></head></html>");
    expect(preview.imageUrl).toBeNull();
  });
});
```

- [ ] **Step 2: Run the metadata test to verify it fails**

Run:

```bash
npm run test -- src/lib/metadata/fetch-link-preview.test.ts
```

Expected:

- FAIL because preview utilities do not exist yet

- [ ] **Step 3: Implement metadata extraction and fetch logic**

`src/lib/metadata/fetch-link-preview.ts` should expose:

- `extractPreviewFromHtml(html: string)`
- `fetchLinkPreview(url: string)`

Parsing target order:

- `<meta property="og:image">`
- `<meta name="twitter:image">`
- `<title>`
- `<meta name="description">`

- [ ] **Step 4: Implement upload and placeholder handling**

`src/lib/storage/thumbnails.ts` should support:

- upload a user-provided image file to `Vercel Blob`
- store or normalize the selected thumbnail URL
- resolve a bundled placeholder asset path

The form UI must allow:

- `자동으로 가져오기`
- `직접 업로드`
- `기본 이미지 사용`

If auto-fetch fails, saving the record must still be allowed.

- [ ] **Step 5: Run unit tests for metadata and form helpers**

Run:

```bash
npm run test -- src/lib/metadata/fetch-link-preview.test.ts src/lib/apps/schema.test.ts
```

Expected:

- PASS

- [ ] **Step 6: Commit thumbnail workflows**

```bash
git add src/lib/metadata/fetch-link-preview.ts src/lib/metadata/fetch-link-preview.test.ts src/lib/storage/thumbnails.ts src/features/admin/app-form.tsx src/features/admin/thumbnail-controls.tsx
git commit -m "feat: add thumbnail preview and fallback flows"
```

## Task 7: Polish the UI, Add End-to-End Tests, and Prepare Deployment

**Files:**
- Create: `tests/e2e/public-archive.spec.ts`
- Create: `tests/e2e/admin-flow.spec.ts`
- Modify: `src/app/globals.css`
- Modify: `src/features/archive/*`
- Modify: `src/features/admin/*`
- Create: `README.md`

- [ ] **Step 1: Write failing e2e tests for the primary user stories**

Create `tests/e2e/public-archive.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

test("public archive supports search and tag filtering", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("searchbox", { name: "앱 검색" }).fill("영어");
  await expect(page.getByText("Talking Vocab Quiz")).toBeVisible();
  await page.getByRole("button", { name: "영어" }).click();
  await expect(page.getByText("Talking Vocab Quiz")).toBeVisible();
});
```

Create `tests/e2e/admin-flow.spec.ts`:

```ts
test("admin can log in and create an app", async ({ page }) => {
  await page.goto("/admin/login");
  await page.getByLabel("관리자 비밀번호").fill("very-secret-password");
  await page.getByRole("button", { name: "로그인" }).click();
  await expect(page).toHaveURL(/\/admin$/);
});
```

- [ ] **Step 2: Run e2e tests to verify they fail**

Run:

```bash
npm run test:e2e
```

Expected:

- FAIL because the full flows are not wired yet

- [ ] **Step 3: Implement final UI polish**

Polish checklist:

- apply the `Minimal Archive` visual system
- make active tag states obvious
- ensure memo preview stays restrained
- add empty-state mascot treatment
- keep the admin UI clean and utilitarian
- confirm public links open in a new tab
- ensure subject and grade remain visually secondary

- [ ] **Step 4: Add deployment documentation**

Create `README.md` with:

- project overview
- required environment variables
- local dev instructions
- migration steps
- Vercel deployment notes

Suggested sections:

```md
# Hong's Vibe Coding Lab
## Local Development
## Environment Variables
## Database Migration
## Deploying to Vercel
```

- [ ] **Step 5: Run the full verification suite**

Run:

```bash
npm run test
npm run test:e2e
npm run lint
npm run build
```

Expected:

- all unit tests pass
- all Playwright tests pass
- lint passes
- production build succeeds

- [ ] **Step 6: Commit the polished release candidate**

```bash
git add tests/e2e src/app/globals.css src/features/archive src/features/admin README.md
git commit -m "feat: finalize archive UI and deployment docs"
```

## Execution Notes

- Keep `memo` public when it exists, but do not let it dominate card height
- Keep tag filtering rule as `AND`, not `OR`
- Use `Hong` only at support moments, not as a dominant hero image
- Prefer small focused files over large all-in-one page components
- Before claiming the feature is complete, use `@verification-before-completion`
- For React component quality, apply `@build-web-apps:react-best-practices`

## Recommended Execution Order

1. Task 1: Bootstrap the app shell
2. Task 2: Define environment and data model
3. Task 3: Build the public archive
4. Task 4: Add admin authentication
5. Task 5: Add admin CRUD
6. Task 6: Implement thumbnail flows
7. Task 7: Polish and verify

## Spec Reference

- Design spec: `docs/superpowers/specs/2026-04-04-hongs-vibe-coding-lab-design.md`
