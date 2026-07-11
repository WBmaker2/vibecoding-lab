# Hong's Vibe Coding Lab

교사용 웹앱을 소개하는 미니멀 아카이브형 포트폴리오와 1인용 관리자 페이지입니다.

## 주요 기능

- 검색창과 다중 태그 기반의 공개 앱 아카이브
- `Hong` 캐릭터를 활용한 빈 결과 상태와 보조 가이드
- 비밀번호 기반 관리자 로그인
- 관리자 페이지에서 앱 등록, 수정, 삭제
- 관리자 페이지에서 현재 앱 목록 JSON 백업 다운로드
- 관리자 페이지에서 정적 공개 갤러리 동기화 작업 시작
- 링크 기반 썸네일 자동 수집과 관리자용 캡처
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

관리자 페이지의 `수정 사항 동기화` 버튼을 운영에서 사용하려면 Vercel 환경변수에 아래 서버 전용 값을 추가합니다. 이 값들은 브라우저에 노출되지 않고 `/api/admin/sync-static-gallery`에서 GitHub Actions를 시작할 때만 사용됩니다.

```bash
HVC_SYNC_GITHUB_TOKEN=
HVC_SYNC_GITHUB_OWNER=WBmaker2
HVC_SYNC_GITHUB_REPO=vibecoding-lab
HVC_SYNC_GITHUB_WORKFLOW_ID=sync-static-gallery.yml
HVC_SYNC_GITHUB_REF=codex/hongs-vibe-coding-lab
HVC_SYNC_BASE_URL=https://www.vivehong.shop
```

`HVC_SYNC_GITHUB_TOKEN`은 대상 저장소의 Actions workflow dispatch 권한이 있는 GitHub 토큰이어야 합니다. `HVC_SYNC_GITHUB_REF`는 실제 운영 배포 브랜치와 워크플로 파일이 있는 브랜치로 맞춥니다. GitHub가 `sync-static-gallery.yml` 워크플로를 인식하려면 이 파일이 저장소의 기본 브랜치 또는 Actions에서 인식되는 운영 브랜치에 올라가 있어야 합니다.

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

## 정적 공개 갤러리 동기화

공개 첫 화면은 Vercel 사용량을 줄이기 위해 DB를 직접 읽지 않고 `src/data/public-apps.json`과 `public/app-thumbnails/`에 커밋된 정적 파일을 사용합니다. 관리자 페이지에서 앱을 등록, 수정, 삭제하면 DB의 관리자 목록은 즉시 바뀌지만 공개 페이지에는 아직 반영되지 않습니다.

자동 수집 결과가 embedded data URL이면 관리자와 정적 갤러리 export 과정에서만 로컬 썸네일 파일로 물질화하며, 공개 런타임에서는 이를 동적 썸네일 API로 제공하지 않습니다. 메타데이터와 캡처가 모두 실패하면 플레이스홀더를 사용합니다.

공개 페이지에 반영할 준비가 되면 관리자 페이지 상단의 `수정 사항 동기화` 버튼을 누릅니다. 버튼은 인증된 관리자 세션에서만 GitHub Actions의 `Sync Static Gallery` 워크플로를 시작합니다. 워크플로는 아래 순서로 실행됩니다.

1. DB에서 앱 목록을 읽어 `src/data/public-apps.json`을 다시 생성합니다.
2. 썸네일을 `public/app-thumbnails/` 로컬 파일로 물질화합니다.
3. 기존 스냅샷과 로컬 썸네일 집합이 DB-backed 필드, 순서, ID까지 동일하면 JSON과 썸네일 파일을 건드리지 않고 `changed=false`로 종료합니다. 이때 검증, 테스트, 린트, 빌드, 커밋, 푸시, Vercel 배포를 건너뜁니다.
4. 변경이 있으면 `npm run apps:verify-static-gallery`로 DB와 정적 스냅샷의 개수, 필드, 정렬, 썸네일 파일을 검증합니다.
5. 테스트, 린트, 빌드를 통과하면 생성 파일을 커밋하고 푸시합니다.
6. Vercel 배포 secret이 있으면 운영 배포까지 이어서 실행합니다. 없더라도 Vercel Git 연동이 켜져 있으면 푸시된 커밋이 일반 배포 흐름을 탈 수 있습니다.

GitHub 저장소에는 아래 Actions secrets를 설정합니다.

```bash
POSTGRES_URL=
VERCEL_TOKEN=
VERCEL_ORG_ID=
VERCEL_PROJECT_ID=
```

`POSTGRES_URL`은 필수입니다. `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`는 워크플로 안에서 직접 Vercel production deploy까지 실행하려는 경우에만 필요합니다.

## Vercel 배포

1. 저장소를 Vercel 프로젝트에 연결합니다.
2. `POSTGRES_URL`, `BLOB_READ_WRITE_TOKEN`, `ADMIN_PASSWORD_HASH`, `SESSION_SECRET`, `APP_BASE_URL`를 등록합니다.
3. 관리자 동기화 버튼을 사용할 경우 `HVC_SYNC_GITHUB_TOKEN`과 `HVC_SYNC_*` 값을 함께 등록합니다.
4. `main` 또는 원하는 배포 브랜치에서 배포합니다.
