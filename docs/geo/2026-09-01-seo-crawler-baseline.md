# SEO·AEO·GEO 크롤러 기준선

- 확인일: 2026-09-01 (KST)
- 대상 공개 URL: https://www.vibehong.shop
- 로컬 브랜치: `fix/archive-hero-mascot-responsive`
- 로컬 기준 커밋: `3b3af65`
- 기준선은 이번 SEO 개선을 적용하기 전 공개 배포와 현재 작업 트리를 기준으로 기록했습니다.

## 크롤러 확인

| 확인 항목 | 결과 |
|---|---|
| 공개 루트 | HTTP 200, Vercel 정적 사전 렌더링 응답 |
| 루트 HTML | `h1`, `title`, description, canonical, robots, OG, JSON-LD 존재 |
| 대표 앱 상세 | HTTP 200, 앱별 title·description·canonical·`h1`·JSON-LD 존재 |
| `robots.txt` | HTTP 200, 공개 경로 허용, `/admin`·`/api` 차단 |
| `sitemap.xml` | HTTP 200, `<loc>` 115개 |
| sitemap URL 상태 | 115/115 HTTP 200 |
| `/llms.txt` | HTTP 404 |
| 존재하지 않는 앱 URL | HTTP 404 |
| 404 메타 | `noindex`와 전역 `index, follow`가 함께 출력되고 canonical이 루트로 남음 |

## 콘텐츠 기준선

로컬 `src/data/public-apps.json`은 84개 앱이며 다음 검사를 통과했습니다.

- `npm run apps:verify-geo`: 오류 없음, 학년 맥락 경고 7건
- 질문별 완성도: 무엇인가요 84/84, 대상 77/84, 교과·주제 84/84, 활용 84/84, 수정일 84/84
- 중복 ID·제목·URL: 없음

## 배포 드리프트

공개 sitemap은 홈 1개와 앱 상세 114개를 제공하지만, 현재 로컬 정적 스냅샷은 84개 앱입니다. 이번 변경에서는 운영 데이터를 덮어쓰지 않고 원인 확인만 수행합니다. 정적 갤러리 동기화와 배포는 별도 릴리스 승인으로 남깁니다.

## 재측정 계획

- 1차 기술 재검증: 구현 직후 로컬 빌드와 공개 URL에서 `robots.txt`, `sitemap.xml`, `/llms.txt`, 대표 상세, 404를 다시 확인합니다.
- GEO 질문 기준선: [`query-set.md`](./query-set.md)의 24개 질문을 같은 문장으로 기록합니다.
- 검색·AI 노출 재측정 제안일: 2026-09-15
- 인용 여부만으로 품질을 판단하지 않고, 인용된 URL이 실제 답변을 뒷받침하는지 함께 판정합니다.

## 구현 후 로컬 재검증

2026-09-01에 원격 `main`을 병합한 최종 로컬 산출물을 `npm run build`로 생성하고
`http://127.0.0.1:3100`에서 확인했습니다. 병합으로 공개 정적 스냅샷이 84개에서
114개 앱으로 갱신되었습니다.

| 확인 항목 | 결과 |
|---|---|
| 정적 빌드 | 성공, 홈·메타데이터 경로·앱 상세 114개를 포함한 127개 정적 경로 생성 |
| `robots.txt` | 검색·가져오기 봇 6종은 공개 경로 허용, 학습용 크롤러 5종은 `/` 차단 |
| `sitemap.xml` | HTTP 200, `<loc>` 115개(홈 1개 + 로컬 앱 상세 114개) |
| `/llms.txt` | HTTP 200, `text/plain`, 안내 링크 115개(아카이브 1개 + 앱 상세 114개) |
| 대표 앱 상세 | HTTP 200, 앱별 title·description·canonical·`h1`·JSON-LD·FAQPage 존재 |
| 존재하지 않는 경로 | HTTP 404, `페이지를 찾을 수 없습니다`, `noindex,nofollow`, canonical 없음 |
| 코드 검증 | `npm run test` 374/374, `npm run lint` 성공, `npm run apps:verify-geo` 오류 없음(학년 경고 7건) |
| 브라우저 E2E | Playwright Chromium 실행 파일 미설치로 차단됨; 같은 공개 흐름은 로컬 HTTP 응답과 정적 HTML로 대체 확인 |

공개 URL은 배포 승인 전이므로 기준선 상태(`/llms.txt` 404, sitemap 115개)를 유지합니다. 공개 재검증은 별도 커밋·푸시·배포 승인 뒤 수행합니다.
