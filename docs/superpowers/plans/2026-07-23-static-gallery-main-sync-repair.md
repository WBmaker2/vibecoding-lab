# 정적 갤러리 main 동기화 복구 계획

## 배경

관리자 화면의 DB 앱 수는 84개인데 공개 정적 스냅샷은 56개에 머물러 있다. `수정 사항 동기화` 요청은 더 이상 운영하지 않는 `codex/hongs-vibe-coding-lab` 브랜치로 dispatch되고, 현재 워크플로 입력 계약과 달라 GitHub가 HTTP 422로 거절한다.

## 목표

관리자 버튼이 `main`의 `sync-static-gallery.yml`을 실행해 현재 DB 앱과 썸네일을 정적 갤러리로 내보내고, 성공 후 공개 랜딩페이지에 같은 앱 수와 최신 스냅샷 날짜가 보이게 한다.

## 작업

1. API 기본 ref와 예시 환경값·운영 환경값을 `main`으로 통일한다.
2. 기본 ref와 dispatch body를 검증하는 API 회귀 테스트를 추가·갱신한다.
3. 공개 업데이트 내역에 2026-07-23 동기화 복구 기록을 추가한다.
4. 테스트·린트·빌드를 실행한 뒤 커밋·푸시·Vercel 배포한다.
5. GitHub Actions 실행과 DB/정적 스냅샷 수를 확인하고, 공개 랜딩페이지의 앱 수를 검증한다.

## 완료 기준

- `POST /api/admin/sync-static-gallery`가 `main` ref와 `request_marker`를 함께 GitHub에 전달한다.
- GitHub Actions가 422 없이 실행되고 정적 스냅샷을 갱신한다.
- 관리자와 공개 화면의 앱 수가 일치하며 마지막 스냅샷이 2026-07-23으로 표시된다.
