# Hong's Vibe Coding Lab

교사용 웹앱을 소개하는 미니멀 아카이브형 포트폴리오와 1인용 관리자 페이지입니다.

## 주요 기능

- 검색창과 다중 태그 기반의 공개 앱 아카이브
- `Hong` 캐릭터를 활용한 빈 결과 상태와 보조 가이드
- 비밀번호 기반 관리자 로그인
- 관리자 페이지에서 앱 등록, 수정, 삭제
- 관리자 페이지에서 현재 앱 목록 JSON 백업 다운로드
- 링크 기반 썸네일 자동 수집
- 자동 수집 실패 시 직접 업로드 또는 플레이스홀더 대체

## 로컬 개발

```bash
npm install
npm run dev
```

기본 주소:

- 공개 사이트: `http://localhost:3000`
- 관리자 로그인: `http://localhost:3000/admin/login`

## 환경변수

`.env.local`에 아래 값을 설정합니다.

```bash
POSTGRES_URL=
BLOB_READ_WRITE_TOKEN=
ADMIN_PASSWORD_HASH=
SESSION_SECRET=
APP_BASE_URL=http://localhost:3000
```

현재 구현은 로컬 개발 편의를 위해 메모리 저장 fallback이 포함되어 있습니다. 운영 환경에서는 `POSTGRES_URL`, `BLOB_READ_WRITE_TOKEN`, `ADMIN_PASSWORD_HASH`, `SESSION_SECRET`를 반드시 설정하고 Postgres를 사용해 영구 저장하는 것을 권장합니다.

## 테스트

```bash
npm run test
npm run test:e2e
npm run lint
npm run build
```

## 데이터 모델

앱 레코드는 아래 필드를 가집니다.

- `title`
- `summary`
- `url`
- `tags`
- `thumbnailMode`
- `thumbnailUrl`
- `subject`
- `grade`
- `memo`

## Drizzle 마이그레이션 생성

```bash
npx drizzle-kit generate
```

## Postgres 초기 연결과 데이터 이관

운영 데이터가 메모리 모드에 남아 있다면, 먼저 현재 공개 앱 목록을 JSON으로 스냅샷한 뒤 DB에 옮기십시오.

```bash
npm run apps:backup:live
POSTGRES_URL=... npm run db:migrate
POSTGRES_URL=... npm run apps:import:backup -- ./tmp/backups/<backup-file>.json
```

관리자 로그인 후 `/api/admin/backup`으로도 최신 앱 목록 JSON을 내보낼 수 있습니다.

## Vercel 배포

1. 저장소를 Vercel 프로젝트에 연결합니다.
2. `POSTGRES_URL`, `BLOB_READ_WRITE_TOKEN`, `ADMIN_PASSWORD_HASH`, `SESSION_SECRET`, `APP_BASE_URL`를 등록합니다.
3. `main` 또는 원하는 배포 브랜치에서 배포합니다.
