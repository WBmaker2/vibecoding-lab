# SEO Discovery and App Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 검색엔진이 Hong's Vibe Coding Lab과 개별 교사용 웹앱을 안정적으로 발견하고 이해하도록 기술 SEO와 정적 앱 상세 페이지를 구축합니다.

**Architecture:** 공개 SEO 경로는 `src/data/public-apps.json` 정적 스냅샷만 읽습니다. 앱 상세 URL은 제목의 영문 단어와 앱 URL에서 만든 ASCII-safe 조각에 UUID를 결합하고, UUID로 앱을 찾아 제목 수정 후에도 기존 주소를 안전하게 처리합니다. 이 방식은 Next.js 정적 생성기의 한글 동적 경로 `ByteString` 오류를 피합니다. 랜딩과 상세 페이지는 각각 `CollectionPage`, `SoftwareApplication`, `BreadcrumbList` JSON-LD를 서버 렌더링하며 Turso 조회를 추가하지 않습니다.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, CSS Modules, Vitest, Testing Library

**Spec:** 승인된 실행 순서인 크롤링 기반 정비, 검색 스니펫 개선, 앱별 상세 페이지, 구조화 데이터와 내부 링크, 검색도구 소유권 확인 준비, 검증 순서를 따릅니다.

---

## Task 1: 공식 도메인과 검색 메타데이터 기준 확립

**Files:**
- Modify: `src/app/site-metadata.ts`
- Modify: `src/app/site-metadata.test.ts`
- Create: `src/lib/seo/site-url.ts`
- Create: `src/lib/seo/site-url.test.ts`

- [ ] 공식 기본 URL을 `https://www.vibehong.shop`으로 고정하고 끝 슬래시를 정규화합니다.
- [ ] 랜딩 title/description, canonical, `og:url`, robots 지시자를 테스트로 먼저 정의합니다.
- [ ] Google/Naver 소유권 확인 토큰이 있을 때만 verification 메타를 출력합니다.
- [ ] 관련 단위 테스트를 통과시킵니다.

## Task 2: robots.txt와 sitemap.xml 정적 생성

**Files:**
- Create: `src/app/robots.ts`
- Create: `src/app/robots.test.ts`
- Create: `src/app/sitemap.ts`
- Create: `src/app/sitemap.test.ts`

- [ ] 공개 경로는 허용하고 `/admin`과 `/api`는 크롤링 대상에서 제외하는 테스트를 추가합니다.
- [ ] 홈과 모든 앱 상세 URL을 포함하며 앱의 `updatedAt`을 쓰는 사이트맵 테스트를 추가합니다.
- [ ] 두 MetadataRoute를 정적 스냅샷 기반으로 구현합니다.
- [ ] Turso/DB 모듈을 import하지 않는 구조를 유지합니다.

## Task 3: 안정적인 앱 slug와 관련 앱 계산

**Files:**
- Create: `src/lib/apps/app-slug.ts`
- Create: `src/lib/apps/app-slug.test.ts`
- Create: `src/lib/apps/related-apps.ts`
- Create: `src/lib/apps/related-apps.test.ts`

- [ ] 한글·영문 제목을 안전한 URL 조각으로 바꾸고 전체 UUID를 붙이는 테스트를 작성합니다.
- [ ] slug의 제목 부분이 달라도 UUID로 기존 앱을 찾는 회귀 테스트를 작성합니다.
- [ ] 태그·교과 일치 점수로 관련 앱을 최대 3개 고르는 테스트를 작성합니다.
- [ ] 테스트를 만족하는 순수 함수를 구현합니다.

## Task 4: 구조화 데이터 생성

**Files:**
- Create: `src/lib/seo/structured-data.ts`
- Create: `src/lib/seo/structured-data.test.ts`
- Create: `src/components/seo/json-ld.tsx`

- [ ] 랜딩 `CollectionPage`가 앱 상세 item URL을 포함하는 테스트를 작성합니다.
- [ ] 상세 `SoftwareApplication`과 `BreadcrumbList`가 실제 앱 정보만 사용하도록 테스트합니다.
- [ ] 평점·후기처럼 보유하지 않은 정보를 만들지 않습니다.
- [ ] `<` 문자를 안전하게 이스케이프해 JSON-LD 스크립트 삽입 위험을 줄입니다.

## Task 5: 정적 앱 상세 페이지와 내부 링크 구축

**Files:**
- Create: `src/app/apps/[slug]/page.tsx`
- Create: `src/features/app-detail/app-detail-page.tsx`
- Create: `src/features/app-detail/app-detail-page.module.css`
- Create: `src/features/app-detail/app-detail-page.test.tsx`
- Modify: `src/features/archive/app-card.tsx`
- Modify: `src/features/archive/app-card.test.tsx`
- Modify: `src/app/page.tsx`

- [ ] 카드 제목에 앱 상세 페이지 내부 링크가 생기는 실패 테스트를 추가합니다.
- [ ] 상세 화면의 제목, 설명, 썸네일, 교과·학년, 전체 태그, 메이커 노트, 원본 앱 CTA, 관련 앱을 테스트합니다.
- [ ] `generateStaticParams`로 현재 앱을 빌드 시 정적 생성하고, canonical/OG/Twitter 메타를 앱별 생성합니다.
- [ ] 잘못된 slug는 404, 제목 부분만 오래된 slug는 현재 canonical 주소로 리디렉션합니다.
- [ ] 랜딩과 상세 페이지에 JSON-LD를 서버 렌더링합니다.

## Task 6: 검색도구 연결 준비와 변경 이력

**Files:**
- Modify: `.env.example`
- Modify: `README.md`
- Modify: `src/features/archive/update-history.tsx`
- Modify: `src/features/archive/update-history.test.tsx`

- [ ] `GOOGLE_SITE_VERIFICATION`, `NAVER_SITE_VERIFICATION` 선택 환경변수를 문서화합니다.
- [ ] 배포 후 Search Console과 네이버 서치어드바이저에서 `/sitemap.xml`을 제출하는 절차를 기록합니다.
- [ ] 2026-08-20 SEO 개선 내역을 업데이트 내역에 추가하고 테스트합니다.

## Task 7: 회귀·빌드 검증

**Files:**
- Verify: all changed files

- [ ] 새 테스트가 구현 전 실패하고 구현 후 통과했는지 확인합니다.
- [ ] `npm test`를 실행합니다.
- [ ] `npm run lint`를 실행합니다.
- [ ] `npm run build`에서 홈, robots, sitemap, 84개 앱 상세 페이지가 생성되는지 확인합니다.
- [ ] `git diff --check`와 `git status --short`로 의도한 파일만 변경됐는지 확인합니다.
- [ ] 실제 배포와 Google/Naver 계정 등록은 별도 승인 단계로 남깁니다.
