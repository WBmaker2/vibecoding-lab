# Admin Tag Pill Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 관리자 작업실의 등록된 앱 라이브러리에서 `태그 N개`를 눌렀을 때 해당 앱의 실제 태그 목록을 카드 안에서 바로 확인할 수 있게 한다.

**Architecture:** 기존 `AppList` 카드 내부에서만 상태를 관리한다. `태그 N개` pill을 `button`으로 바꾸고, 앱별 확장 상태를 `Set<string>`으로 추적해 선택한 카드 아래에 태그 칩 목록을 인라인으로 렌더링한다.

**Tech Stack:** Next.js App Router, React client component, TypeScript, Vitest, Testing Library, CSS Modules 대신 기존 `globals.css` 클래스 체계.

---

### Task 1: 태그 펼침 동작 테스트 추가

**Files:**
- Modify: `src/features/admin/app-list.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
it("expands the registered tags when the tag count button is clicked", () => {
  render(
    <AppList
      apps={apps}
      deleteAction={async () => {}}
      onSelectApp={() => {}}
      selectedAppId={null}
    />
  );

  fireEvent.click(screen.getByRole("button", { name: "Talking Vocab Quiz 태그 3개 보기" }));

  expect(screen.getByText("#영어")).toBeInTheDocument();
  expect(screen.getByText("#게임형")).toBeInTheDocument();
  expect(screen.getByText("#형성평가")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/features/admin/app-list.test.tsx`

Expected: FAIL because `태그 N개` is not a button and no expanded tag list exists.

### Task 2: AppList에 앱별 태그 확장 상태 추가

**Files:**
- Modify: `src/features/admin/app-list.tsx`

- [ ] **Step 1: Add local expanded state**

Use `useState<Set<string>>` inside `AppList`.

- [ ] **Step 2: Convert the tag count pill to a button**

Render `button.admin-meta-pill.admin-tag-count-button` with:
- `type="button"`
- `aria-expanded`
- `aria-controls`
- label: `태그 {app.tags.length}개`
- accessible label: `${app.title} 태그 ${app.tags.length}개 보기` or `${app.title} 태그 접기`

- [ ] **Step 3: Render expanded tags inline**

When expanded, render a small block below metadata:

```tsx
<div className="admin-app-tag-details" id={tagDetailsId}>
  {app.tags.map((tag) => (
    <span className="admin-tag-detail-pill" key={tag}>#{tag}</span>
  ))}
</div>
```

### Task 3: 스타일 추가

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Add button reset styling**

Make the tag count button visually match existing pills but clearly clickable on hover/focus.

- [ ] **Step 2: Add expanded tag list styling**

Use compact wrapping chips so the card remains scannable on desktop and mobile.

### Task 4: 검증

**Files:**
- Test: `src/features/admin/app-list.test.tsx`

- [ ] **Step 1: Run focused test**

Run: `npm run test -- src/features/admin/app-list.test.tsx`

Expected: PASS.

- [ ] **Step 2: Run full verification**

Run:
- `npm run test`
- `npm run lint`
- `npm run build`

Expected: all pass.
