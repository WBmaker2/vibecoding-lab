# Public Archive V1 Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 공개 아카이브 첫 화면을 데스크톱과 모바일 모두에서 더 빠르게 탐색하고 바로 앱을 열 수 있는 구조로 개편한다.

**Architecture:** `/` 라우트의 서버 데이터 로딩 방식은 유지하고, `ArchivePage` 내부를 `히어로/탐색`, `결과 상태`, `카드 그리드` 단위로 재구성한다. 검색과 태그 필터의 동작 규칙은 그대로 유지하되, 시각 위계와 반응형 레이아웃을 다시 설계한다.

**Tech Stack:** Next.js App Router, React 19 client components, global CSS, Vitest + Testing Library, Playwright

---

## Scope

- 공개 아카이브(`/`)만 개편한다.
- 관리자 페이지, 데이터 모델, 검색 규칙, 인증 흐름은 건드리지 않는다.
- 상세 페이지는 추가하지 않는다.
- `Hong` 캐릭터는 보조 안내 역할만 유지한다.

## File Structure

### Create

- `src/features/archive/archive-hero.tsx`
  - 공개 아카이브 히어로 구조 전담
  - 브랜드 카피, 검색, 대표 태그, 마스코트 안내 묶음 담당
- `src/features/archive/archive-results-state.tsx`
  - 현재 결과 수, 활성 태그, 초기화 CTA를 보여주는 상태 바 전담
- `src/features/archive/archive-page.test.tsx`
  - `ArchivePage`의 검색/태그/상태 바 상호작용 테스트 전담

### Modify

- `src/features/archive/archive-page.tsx`
  - 페이지 조합 루트
  - 상태 계산, `ArchiveHero`, `ArchiveResultsState`, 카드 그리드 연결
- `src/features/archive/search-bar.tsx`
  - 모바일과 데스크톱에서 재사용 가능한 검색 입력 래퍼
- `src/features/archive/tag-filter-bar.tsx`
  - 대표 태그와 전체 태그 바의 시각 상태 정리
- `src/features/archive/app-card.tsx`
  - 제목/설명/메타/CTA 위계 재구성
- `src/features/archive/empty-state.tsx`
  - 개편된 결과 상태 바 및 히어로 톤과 어울리게 빈 상태 카피/구조 정리
- `src/app/globals.css`
  - 공개 아카이브 히어로, 상태 바, 카드, 모바일 레이아웃 스타일 개편
- `src/app/__tests__/home-shell.test.tsx`
  - 홈 페이지 기본 렌더링 기대값 갱신
- `src/features/archive/app-card.test.tsx`
  - 카드 정보 위계와 CTA 렌더링 기대값 보강
- `tests/e2e/public-archive.spec.ts`
  - 검색/태그/결과 상태/빈 상태의 실제 사용자 흐름 검증

### Keep As-Is

- `src/app/page.tsx`
  - 서버에서 공개 앱을 읽어와 `ArchivePage`에 전달하는 역할 유지
- `src/lib/search/filter-apps.ts`
  - 검색 및 다중 태그 필터 규칙 유지

## Testing Strategy

- 단위 테스트: `ArchivePage` 상태 계산과 `AppCard` 렌더링 위계를 보장한다.
- 통합 테스트: 홈 페이지에서 새 히어로 구조와 대표 태그 진입점이 보이는지 확인한다.
- E2E 테스트: 검색, 태그 필터, 상태 바, 빈 상태, 모바일 뷰포트의 CTA 도달성을 검증한다.
- 회귀 테스트: 기존 검색 규칙(`모든 선택 태그 포함`)은 유지되는지 확인한다.

## Task 1: Refactor Hero & Results State

**Files:**
- Create: `src/features/archive/archive-hero.tsx`
- Create: `src/features/archive/archive-results-state.tsx`
- Create: `src/features/archive/archive-page.test.tsx`
- Modify: `src/features/archive/archive-page.tsx`
- Modify: `src/features/archive/search-bar.tsx`
- Modify: `src/features/archive/tag-filter-bar.tsx`
- Modify: `src/app/__tests__/home-shell.test.tsx`

- [ ] **Step 1: Write the failing interaction tests**

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ArchivePage } from "./archive-page";

it("shows active filter state and clears tags from the state bar", async () => {
  const user = userEvent.setup();
  render(<ArchivePage initialApps={sampleApps} />);

  await user.click(screen.getByRole("button", { name: "#영어" }));

  expect(screen.getByText(/#영어 필터 적용/i)).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: /필터 초기화/i }));
  expect(screen.queryByText(/#영어 필터 적용/i)).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/archive/archive-page.test.tsx src/app/__tests__/home-shell.test.tsx`
Expected: FAIL because the new hero sections and results-state copy do not exist yet.

- [ ] **Step 3: Create the hero component**

```tsx
export function ArchiveHero(props: ArchiveHeroProps) {
  return (
    <section className="hero-frame archive-hero">
      <div className="archive-hero-copy">
        <p className="eyebrow">Minimal Archive for Classroom Apps</p>
        <h1>Hong&apos;s Vibe Coding Lab</h1>
        <p className="hero-copy">{props.description}</p>
      </div>

      <SearchBar query={props.query} onQueryChange={props.onQueryChange} />
      <TagFilterBar
        activeTags={props.activeTags}
        onToggleTag={props.onToggleTag}
        tags={props.featuredTags}
      />
    </section>
  );
}
```

- [ ] **Step 4: Create the results-state component**

```tsx
export function ArchiveResultsState({
  resultCount,
  activeTags,
  onReset,
  query
}: ArchiveResultsStateProps) {
  const hasFilters = activeTags.length > 0 || query.trim().length > 0;

  return (
    <div className="archive-results-state">
      <p>
        <strong>{resultCount}</strong>개의 앱
        {activeTags.length > 0 ? ` · ${activeTags.map((tag) => `#${tag}`).join(", ")}` : ""}
      </p>
      {hasFilters ? <button onClick={onReset}>필터 초기화</button> : null}
    </div>
  );
}
```

- [ ] **Step 5: Update `ArchivePage` to use the new structure**

```tsx
return (
  <main className="page-shell archive-page">
    <ArchiveHero
      activeTags={activeTags}
      featuredTags={availableTags.slice(0, 5)}
      onQueryChange={setQuery}
      onToggleTag={toggleTag}
      query={query}
    />

    <ArchiveResultsState
      activeTags={activeTags}
      onReset={() => startTransition(() => {
        setActiveTags([]);
        setQuery("");
      })}
      query={query}
      resultCount={filteredApps.length}
    />

    {filteredApps.length > 0 ? <div className="app-grid">...</div> : <EmptyState query={query} />}
  </main>
);
```

- [ ] **Step 6: Run focused tests**

Run: `npx vitest run src/features/archive/archive-page.test.tsx src/app/__tests__/home-shell.test.tsx`
Expected: PASS, with the new hero and results-state assertions succeeding.

- [ ] **Step 7: Commit**

```bash
git add src/features/archive/archive-hero.tsx src/features/archive/archive-results-state.tsx src/features/archive/archive-page.tsx src/features/archive/search-bar.tsx src/features/archive/tag-filter-bar.tsx src/features/archive/archive-page.test.tsx src/app/__tests__/home-shell.test.tsx
git commit -m "feat: restructure public archive hero and state bar"
```

## Task 2: Refresh Card Hierarchy & Copy Density

**Files:**
- Modify: `src/features/archive/app-card.tsx`
- Modify: `src/features/archive/app-card.test.tsx`
- Modify: `src/features/archive/empty-state.tsx`

- [ ] **Step 1: Write the failing card-level tests**

```tsx
it("renders the app title, compact metadata, and primary CTA in order", () => {
  render(<AppCard app={sampleApp} />);

  expect(screen.getByRole("heading", { name: "Reading Timer" })).toBeInTheDocument();
  expect(screen.getByText("영어")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "앱 열기" })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/archive/app-card.test.tsx`
Expected: FAIL after updating the assertions for the new compact metadata layout or note preview behavior.

- [ ] **Step 3: Update the card markup to match the approved hierarchy**

```tsx
<article className="app-card">
  <div className="app-card-media">...</div>
  <div className="app-card-body">
    <header className="app-card-header">...</header>
    <div className="app-card-tags">...</div>
    <p className="app-card-submeta">{app.subject} · {app.grade}</p>
    {app.memo ? <details className="app-card-note">...</details> : null}
    <a className="app-card-link" href={app.url}>앱 열기</a>
  </div>
</article>
```

- [ ] **Step 4: Simplify empty-state copy to match the new archive tone**

```tsx
<section className="empty-state" aria-live="polite">
  <div>
    <p className="eyebrow">No Matches</p>
    <h2>조건을 조금 바꾸면 더 잘 찾을 수 있습니다</h2>
    <p>{query ? `"${query}" 대신 더 짧은 검색어를 시도해 보세요.` : "대표 태그를 먼저 눌러보세요."}</p>
  </div>
</section>
```

- [ ] **Step 5: Run focused tests**

Run: `npx vitest run src/features/archive/app-card.test.tsx src/features/archive/archive-page.test.tsx`
Expected: PASS, with no regressions in card CTA, metadata, or note behavior.

- [ ] **Step 6: Commit**

```bash
git add src/features/archive/app-card.tsx src/features/archive/app-card.test.tsx src/features/archive/empty-state.tsx
git commit -m "feat: improve public archive card hierarchy"
```

## Task 3: Apply Responsive Styles & Visual Rhythm

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Write the style checklist into the diff as target selectors**

```css
.archive-hero {}
.archive-results-state {}
.archive-results-state-copy {}
.archive-results-state-action {}
.app-card-submeta {}

@media (max-width: 720px) {
  .archive-hero {}
  .app-grid {}
  .app-card {}
}
```

- [ ] **Step 2: Run lint once before editing CSS**

Run: `npm run lint`
Expected: PASS so any later failures clearly come from the archive refresh work.

- [ ] **Step 3: Implement the desktop rhythm updates**

```css
.archive-hero {
  gap: 24px;
}

.archive-results-state {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 22px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.9);
}

.app-card-link {
  min-width: 132px;
  padding: 12px 18px;
}
```

- [ ] **Step 4: Implement the mobile-first adjustments**

```css
@media (max-width: 720px) {
  .archive-hero {
    padding: 24px 20px;
  }

  .archive-results-state {
    flex-direction: column;
    align-items: flex-start;
  }

  .app-grid {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 5: Run lint and targeted tests**

Run: `npm run lint && npx vitest run src/features/archive/archive-page.test.tsx src/features/archive/app-card.test.tsx src/app/__tests__/home-shell.test.tsx`
Expected: PASS with no CSS-selector-related breakage.

- [ ] **Step 6: Commit**

```bash
git add src/app/globals.css
git commit -m "style: tune public archive rhythm for desktop and mobile"
```

## Task 4: Verify Real User Flows In Browser

**Files:**
- Modify: `tests/e2e/public-archive.spec.ts`

- [ ] **Step 1: Add the failing E2E assertions for the refreshed public archive**

```ts
test("public archive exposes active filter state and stays usable on mobile", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "#영어" }).click();
  await expect(page.getByText(/#영어/)).toBeVisible();
  await expect(page.getByRole("button", { name: /필터 초기화/i })).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("searchbox", { name: "앱 검색" })).toBeVisible();
  await expect(page.getByRole("link", { name: "앱 열기" }).first()).toBeVisible();
});
```

- [ ] **Step 2: Run the single E2E spec to verify it fails**

Run: `npx playwright test tests/e2e/public-archive.spec.ts`
Expected: FAIL until the refreshed results-state and mobile structure are in place.

- [ ] **Step 3: Update the E2E spec for the final copy and selectors**

```ts
await expect(page.getByText("3개의 앱")).toBeVisible();
await expect(page.getByRole("button", { name: "필터 초기화" })).toBeVisible();
await expect(page.getByRole("searchbox", { name: "앱 검색" })).toBeVisible();
```

- [ ] **Step 4: Run the full public archive verification suite**

Run: `npm run test && npm run lint && npx playwright test tests/e2e/public-archive.spec.ts`
Expected: PASS across unit, integration, and browser checks.

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/public-archive.spec.ts
git commit -m "test: verify refreshed public archive flow"
```

## Final Verification

- [ ] Run: `npm run test`
- [ ] Run: `npm run lint`
- [ ] Run: `npx playwright test tests/e2e/public-archive.spec.ts`
- [ ] Run: `npm run build`

Expected:
- Vitest passes all archive and shared tests
- ESLint passes with no new warnings
- Playwright passes the public archive scenario on the refreshed layout
- Production build succeeds without hydration or type errors

## Notes For Execution

- Keep `src/app/page.tsx` untouched unless the archive props contract truly changes.
- Do not expand scope into admin UI during this plan.
- Prefer a new small component file over overloading `archive-page.tsx` past orchestration responsibilities.
- If the first implementation makes mobile hero copy too tall, shorten copy before introducing new layout tricks.
