# Page Capture Thumbnail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 앱 링크만 입력해도 메타 이미지가 없을 때 실제 페이지를 자동 캡처해 썸네일 URL로 저장한다.

**Architecture:** `auto` 썸네일 경로를 `메타 이미지 -> 서버 캡처 -> 생성형 기본 썸네일` 순서로 확장한다. 실제 캡처는 서버 전용 유틸에서 수행하고, 결과 PNG는 기존 업로드와 같은 공개 URL로 저장한다.

**Tech Stack:** Next.js App Router, React 19, Vitest, Playwright Core, Vercel Blob

---

### Task 1: 자동 캡처 fallback 을 테스트로 고정

**Files:**
- Modify: `src/lib/storage/thumbnails.test.ts`

- [ ] `캡처 모듈` mock 을 추가한다.
- [ ] 메타 이미지가 있으면 캡처를 건너뛰는 실패 테스트를 먼저 작성한다.
- [ ] 메타 이미지가 없을 때 캡처 URL을 쓰는 실패 테스트를 작성한다.
- [ ] 메타 요청 실패 시에도 캡처를 시도하는 실패 테스트를 작성한다.
- [ ] 캡처도 실패하면 생성형 기본 썸네일로 fallback 하는 테스트를 유지하거나 보강한다.

### Task 2: 서버 전용 페이지 캡처 유틸 구현

**Files:**
- Create: `src/lib/storage/page-capture.ts`
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] `http/https` URL만 허용하는 유효성 검사를 추가한다.
- [ ] `playwright-core`와 서버리스 Chromium 을 동적 import 로 불러오게 만든다.
- [ ] `1200x630` PNG 캡처 로직을 작성한다.
- [ ] 캡처 결과를 `Vercel Blob` 또는 `data:` URL로 저장하는 함수를 만든다.

### Task 3: auto 썸네일 해석 로직 연결

**Files:**
- Modify: `src/lib/storage/thumbnails.ts`

- [ ] 메타 이미지가 없으면 새 캡처 유틸을 호출한다.
- [ ] 메타 요청 실패 후에도 캡처를 시도하게 만든다.
- [ ] 캡처 실패 시 기존 생성형 기본 썸네일 경로를 유지한다.

### Task 4: 검증

**Files:**
- Verify: `src/lib/storage/thumbnails.test.ts`

- [ ] `npm test -- src/lib/storage/thumbnails.test.ts` 로 변경 동작을 먼저 확인한다.
- [ ] `npm run lint` 를 실행한다.
- [ ] `npm run build` 로 Next.js production build 가 통과하는지 확인한다.
