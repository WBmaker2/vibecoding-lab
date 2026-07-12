# Thumbnail Auto Fallback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 웹앱 링크만 입력해도 썸네일이 최대한 자동으로 잡히고, 저장된 썸네일이 공개 아카이브 카드에 실제로 보이게 만든다.

**Architecture:** 공개 카드 렌더링과 관리자 등록 로직을 함께 수정한다. 썸네일은 메타 태그 우선, 아이콘 fallback, 실패 시 placeholder 유지 순서로 처리하고, 관리자 UI 기본값은 자동 수집으로 전환한다.

**Tech Stack:** Next.js App Router, React 19, Vitest, Testing Library

---

### Task 1: 썸네일 동작을 테스트로 고정

**Files:**
- Modify: `src/lib/metadata/fetch-link-preview.test.ts`
- Create: `src/features/archive/app-card.test.tsx`
- Create: `src/features/admin/thumbnail-controls.test.tsx`

- [ ] 메타데이터 fallback과 상대경로 정규화 테스트를 추가한다.
- [ ] 공개 카드가 `thumbnailUrl`을 이미지로 렌더링하는 테스트를 추가한다.
- [ ] 관리자 썸네일 기본 모드가 `auto`인지 테스트를 추가한다.

### Task 2: 자동 수집과 공개 렌더링 구현

**Files:**
- Modify: `src/lib/metadata/fetch-link-preview.ts`
- Modify: `src/lib/storage/thumbnails.ts`
- Modify: `src/features/archive/app-card.tsx`
- Modify: `src/features/admin/thumbnail-controls.tsx`
- Modify: `src/app/admin/actions.ts`
- Modify: `src/app/globals.css`

- [ ] 메타 이미지 fallback을 `og:image -> twitter:image -> apple-touch-icon -> icon` 순서로 확장한다.
- [ ] 상대경로 이미지를 절대 URL로 정규화한다.
- [ ] 자동 수집 실패 시 기존 썸네일 URL을 유지하도록 보완한다.
- [ ] 공개 카드가 저장된 썸네일 이미지를 실제로 보여주도록 렌더링과 스타일을 추가한다.
- [ ] 관리자 기본 모드를 `auto`로 바꾼다.

### Task 3: 검증

**Files:**
- Verify: `src/lib/metadata/fetch-link-preview.test.ts`
- Verify: `src/features/archive/app-card.test.tsx`
- Verify: `src/features/admin/thumbnail-controls.test.tsx`

- [ ] 관련 Vitest 테스트를 실행한다.
- [ ] 가능하면 lint 또는 최소 smoke 검증까지 실행한다.
