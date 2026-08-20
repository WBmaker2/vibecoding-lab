# Hong's Vibe Coding Lab

교사용 웹앱을 소개하는 미니멀 아카이브형 포트폴리오와 1인용 관리자 페이지입니다.

## 주요 기능

- 검색창과 다중 태그 기반의 공개 앱 아카이브
- `Hong` 캐릭터를 활용한 빈 결과 상태와 보조 가이드
- 비밀번호 기반 관리자 로그인
- 관리자 페이지에서 앱 등록, 수정, 삭제
- 관리자 페이지에서 현재 앱 목록 JSON 백업 다운로드
- 관리자 페이지에서 정적 공개 갤러리 동기화 작업 시작
- 관리자 페이지에서 정적 스냅샷과 DB의 실제 동기화 상태 확인
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
TURSO_DATABASE_URL=
TURSO_AUTH_TOKEN=
BLOB_READ_WRITE_TOKEN=
ADMIN_PASSWORD_HASH=
SESSION_SECRET=
APP_BASE_URL=http://localhost:3000
GOOGLE_SITE_VERIFICATION=
NAVER_SITE_VERIFICATION=
```

`SESSION_SECRET`는 32자 이상이어야 합니다. 31자 이하는 관리자 세션을 만들거나 검증하지 못합니다.

현재 구현은 로컬 개발 편의를 위해 메모리 저장 fallback이 포함되어 있습니다. 운영 환경에서는 `BLOB_READ_WRITE_TOKEN`, `ADMIN_PASSWORD_HASH`, `SESSION_SECRET`과 함께 `TURSO_DATABASE_URL`/`TURSO_AUTH_TOKEN` 또는 기존 `POSTGRES_URL`을 설정해야 합니다. Turso 두 값이 모두 설정되면 Turso가 Postgres보다 우선합니다.

`GOOGLE_SITE_VERIFICATION`과 `NAVER_SITE_VERIFICATION`은 선택값입니다. 각 검색도구에서 HTML `meta` 태그 확인 방식을 고른 뒤 `content="..."` 안의 토큰만 입력합니다. 전체 태그를 넣지 않으며, 값을 추가한 뒤에는 새 배포가 필요합니다.

관리자 페이지의 `수정 사항 동기화` 버튼을 운영에서 사용하려면 Vercel 환경변수에 아래 서버 전용 값을 추가합니다. 이 값들은 브라우저에 노출되지 않고 `/api/admin/sync-static-gallery`에서 GitHub Actions를 시작할 때만 사용됩니다.

```bash
HVC_SYNC_GITHUB_TOKEN=
HVC_SYNC_GITHUB_OWNER=WBmaker2
HVC_SYNC_GITHUB_REPO=vibecoding-lab
HVC_SYNC_GITHUB_WORKFLOW_ID=sync-static-gallery.yml
HVC_SYNC_GITHUB_REF=main
HVC_SYNC_BASE_URL=https://www.vibehong.shop
```

`HVC_SYNC_GITHUB_TOKEN`은 대상 저장소의 Actions workflow dispatch 권한이 있는 GitHub 토큰이어야 합니다. `HVC_SYNC_GITHUB_REF`는 실제 운영 배포 브랜치와 워크플로 파일이 있는 브랜치로 맞추며, 이 프로젝트의 운영값은 `main`입니다. GitHub가 `sync-static-gallery.yml` 워크플로를 인식하려면 이 파일이 저장소의 기본 브랜치 또는 Actions에서 인식되는 운영 브랜치에 올라가 있어야 합니다. 서버는 lease token과 별도의 UUID `request_marker`를 workflow input으로 보내며, workflow run 이름에도 같은 marker를 표시합니다. 관리자 상태 조회는 최근 30개 run에서 이 marker가 정확히 일치하는 경우에만 해당 요청으로 연결하고, 만료된 marker 행도 24시간 범위 안에서 조회합니다. 브라우저 reload 시에는 공개 marker만 세션에 보존합니다. marker 없는 최초 조회의 최근 workflow run은 전역 실행 기록일 뿐 특정 요청의 완료로 표시하지 않습니다.

## 테스트

```bash
npm run test
npm run test:e2e
npm run lint
npm run build
```

E2E는 `POSTGRES_URL`을 비워 둔 격리 메모리 저장소를 사용합니다. 관리자 저장은 `/admin` 라이브러리와 새로고침 지속성만 검증하며, 공개 정적 아카이브 반영을 위해 동기화 작업을 시작하지 않습니다.

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
- `subjects`
- `gradeBands`
- `audience`
- `interactionType`
- `learningProcess`

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

### Turso Free로 이관

관리자 페이지에서 내려받은 `scope: "admin"` JSON 백업만 이관에 사용하십시오. 공개 `public-apps.json`이나 랜딩 페이지 HTML 백업은 관리자 전용 GitHub 링크를 포함하지 않을 수 있어 이관 도구가 거부합니다.

```bash
TURSO_DATABASE_URL=libsql://... TURSO_AUTH_TOKEN=... npm run db:migrate:turso
TURSO_DATABASE_URL=libsql://... TURSO_AUTH_TOKEN=... npm run apps:import:backup:turso -- --backup ./tmp/backups/<admin-backup>.json
TURSO_DATABASE_URL=libsql://... TURSO_AUTH_TOKEN=... npm run apps:verify:turso -- ./tmp/backups/<admin-backup>.json
```

Turso 대상 `apps` 테이블이 비어 있지 않으면 import가 기본 중단됩니다. 기존 데이터와 대조가 끝난 뒤 명시적으로 `--allow-non-empty`를 사용할 수 있지만, 일반 전환에서는 빈 DB에 먼저 import하는 방식을 권장합니다. `TURSO_DATABASE_URL`과 `TURSO_AUTH_TOKEN`은 반드시 함께 설정해야 합니다.

동기화 요청의 cross-instance 중복 방지 lease와 dispatch marker는 선택된 provider의 `static_gallery_sync_leases` 테이블에 저장됩니다. Turso에서는 SQLite 호환 lease를 사용하고, Postgres에서는 기존 lease를 사용합니다. lease는 30분 후 만료되며 GitHub 상태 조회나 dispatch 실패 시 즉시 해제됩니다. 저장되는 lease token은 서버에서만 사용하고 관리자 API에는 marker ID, 요청 시각, 만료 시각, 확인된 workflow run ID만 반환합니다.

## 정적 공개 갤러리 동기화

공개 첫 화면은 Vercel 사용량을 줄이기 위해 DB를 직접 읽지 않고 `src/data/public-apps.json`과 `public/app-thumbnails/`에 커밋된 정적 파일을 사용합니다. 관리자 페이지에서 앱을 등록, 수정, 삭제하면 DB의 관리자 목록은 즉시 바뀌지만 공개 페이지에는 아직 반영되지 않습니다.

자동 수집 결과가 embedded data URL이면 관리자와 정적 갤러리 export 과정에서만 로컬 썸네일 파일로 물질화하며, 공개 런타임에서는 이를 동적 썸네일 API로 제공하지 않습니다. 메타데이터와 캡처가 모두 실패하면 플레이스홀더를 사용합니다.

공개 페이지에 반영할 준비가 되면 관리자 페이지 상단의 `수정 사항 동기화` 버튼을 누릅니다. 관리자 화면은 커밋된 정적 스냅샷의 생성일, DB/스냅샷 개수, 변경 건수를 먼저 보여주며, 변경이 없으면 GitHub Actions를 시작하지 않습니다. 실행 중인 작업이 있으면 중복 시작을 막고 GitHub Actions 실행 상태와 링크를 표시합니다. 버튼은 인증된 관리자 세션에서만 GitHub Actions의 `Sync Static Gallery` 워크플로를 시작합니다. 워크플로는 아래 순서로 실행됩니다.

1. Turso 환경 변수가 있으면 `npm run db:migrate:turso`, 없으면 `npm run db:migrate`로 idempotent migration을 적용합니다.
2. DB에서 앱 목록을 읽어 `src/data/public-apps.json`을 다시 생성합니다.
3. 썸네일을 `public/app-thumbnails/` 로컬 파일로 물질화합니다.
4. 기존 스냅샷과 로컬 썸네일 집합·SHA-256 asset manifest가 DB-backed 필드, 순서, ID까지 동일하면 JSON과 썸네일 파일을 건드리지 않고 `changed=false`로 종료합니다. 이때 검증, 테스트, 린트, 빌드, 커밋, 푸시, Vercel Git 배포를 건너뜁니다.
5. 변경이 있으면 `npm run apps:verify-static-gallery`로 DB와 정적 스냅샷의 개수, 필드, 정렬, nullable placeholder, 로컬 파일, asset manifest를 검증합니다.
6. 누락·추가·변경된 asset이 있으면 exporter가 manifest와 로컬 파일을 다시 만들고, 테스트·린트·빌드를 통과하면 생성 파일을 커밋하고 푸시합니다.
7. Vercel Git 연동이 `main`을 운영 배포 브랜치로 감시하므로, 푸시된 커밋이 운영 배포를 시작합니다.
8. 배포 후 운영 사이트의 실제 앱 수가 정적 스냅샷의 `appCount`와 일치할 때까지 재확인하며, 불일치하면 워크플로를 실패 처리합니다.

GitHub 저장소에는 아래 Actions secrets를 설정합니다.

```bash
POSTGRES_URL=
TURSO_DATABASE_URL=
TURSO_AUTH_TOKEN=
```

Turso로 전환한 뒤에는 GitHub Actions secrets에 `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`을 등록합니다. `POSTGRES_URL`은 검증 기간의 롤백용으로 보존할 수 있습니다. Vercel은 GitHub `main` 연결로 배포하므로 GitHub Actions에 별도 Vercel 토큰을 보관하지 않습니다.

## Vercel 배포

1. 저장소를 Vercel 프로젝트에 연결합니다.
2. `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `BLOB_READ_WRITE_TOKEN`, `ADMIN_PASSWORD_HASH`, `SESSION_SECRET`, `APP_BASE_URL`를 등록합니다. 기존 Postgres로 롤백할 때만 `POSTGRES_URL`을 사용합니다.
3. 관리자 동기화 버튼을 사용할 경우 `HVC_SYNC_GITHUB_TOKEN`과 `HVC_SYNC_*` 값을 함께 등록합니다.
4. `main` 또는 원하는 배포 브랜치에서 배포합니다.

## 검색엔진 등록

공개 랜딩과 앱 상세 페이지는 Turso를 조회하지 않고 `src/data/public-apps.json` 정적 스냅샷으로 생성됩니다. 새 앱을 공개 동기화하면 다음 배포에서 앱 상세 페이지와 `/sitemap.xml`이 함께 갱신됩니다.

배포 후 아래 순서로 검색도구를 연결합니다.

1. `https://www.vibehong.shop/robots.txt`와 `https://www.vibehong.shop/sitemap.xml`이 열리는지 확인합니다.
2. [Google Search Console](https://search.google.com/search-console/about)에서 URL 접두어 속성 `https://www.vibehong.shop`을 추가하고 HTML 태그 확인 방식을 선택합니다.
3. Google이 제공한 `content` 토큰을 Vercel의 `GOOGLE_SITE_VERIFICATION`에 등록하고 재배포한 뒤 소유권을 확인합니다.
4. Search Console의 `Sitemaps`에 `https://www.vibehong.shop/sitemap.xml`을 제출합니다.
5. [네이버 서치어드바이저](https://searchadvisor.naver.com/)에서 같은 사이트를 추가하고 HTML 태그의 `content` 토큰을 `NAVER_SITE_VERIFICATION`에 등록합니다.
6. 재배포와 소유권 확인 후 네이버의 요청 > 사이트맵 제출에 `https://www.vibehong.shop/sitemap.xml`을 입력합니다.

사이트맵에는 홈과 모든 정적 앱 상세 주소가 포함됩니다. 관리자 및 API 경로는 `robots.txt`에서 크롤링 대상에서 제외하지만, 실제 접근 권한은 기존 관리자 세션 검증으로 보호합니다.
