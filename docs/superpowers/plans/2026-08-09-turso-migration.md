# Hong's Vibe Coding Lab Turso Free 전환 설계 및 구현 계획

작성일: 2026-08-09
상태: 설계 승인 후 구현 진행

## 1. 목표와 전환 원칙

현재 운영 DB인 Neon/Postgres의 전송량 한도 초과로 관리자 페이지가 읽기 전용 보호 화면으로 전환된 상태입니다. 앱 목록과 관리자 CRUD를 Turso Free로 옮겨 데이터 전송량 의존을 낮추고, 기존 Neon 데이터는 검증 완료 전까지 삭제하지 않습니다.

전환 원칙은 다음과 같습니다.

- Turso가 설정된 환경에서는 Turso를 기본 저장소로 사용합니다.
- `POSTGRES_URL`은 즉시 삭제하지 않고 롤백 및 데이터 대조용으로 보존합니다.
- Turso 대상이 비어 있지 않으면 기본 마이그레이션을 중단하여 실수로 기존 데이터를 덮어쓰지 않습니다.
- 관리자 전용 `githubUrl`과 썸네일 원본 정보가 포함된 백업 없이는 공개 정적 스냅샷만으로 운영 DB를 덮어쓰지 않습니다.
- 공개 랜딩 페이지는 계속 `src/data/public-apps.json`과 `public/app-thumbnails`를 사용하여 공개 요청마다 DB를 읽지 않습니다.

## 2. 현재 데이터 흐름

```text
관리자 페이지/API
  -> AppRepository
     -> 현재: Neon/Postgres + Drizzle
     -> 전환 후: Turso/libSQL + SQLite 호환 SQL

공개 랜딩 페이지
  -> public-apps.json + public/app-thumbnails

관리자 정적 갤러리 동기화
  -> DB에서 전체 앱 읽기
  -> 썸네일 로컬화 및 스냅샷 생성
  -> GitHub Actions가 커밋/푸시
  -> Vercel Git 배포
```

Neon 전용 SQL에는 Postgres 배열, `uuid`, `timestamptz`, advisory lock이 포함되어 있으므로, Turso 경로는 기존 Drizzle Postgres 스키마를 억지로 재사용하지 않고 별도의 작은 libSQL 어댑터로 구현합니다.

## 3. Turso 데이터 모델

Turso에는 다음 테이블을 생성합니다.

### `apps`

| 컬럼 | Turso 타입 | 저장 규칙 |
| --- | --- | --- |
| `id` | `TEXT PRIMARY KEY` | 기존 UUID 문자열 유지 |
| `title`, `summary`, `url` | `TEXT NOT NULL` | 문자열 그대로 |
| `github_url`, `thumbnail_url`, `subject`, `grade`, `memo` | `TEXT` | 선택 값은 `NULL` |
| `tags`, `subjects`, `grade_bands`, `learning_process` | `TEXT` | JSON 배열 문자열 |
| `thumbnail_mode`, `audience`, `interaction_type` | `TEXT` | 기존 값 유지 |
| `created_at`, `updated_at` | `TEXT NOT NULL` | ISO 8601 UTC 문자열 |

`tags`를 JSON 문자열로 저장하면 현재 앱 레코드의 배열 구조와 관리자 화면 동작을 유지하면서 Postgres 배열 문법을 제거할 수 있습니다. 읽을 때는 JSON 파싱 실패를 빈 배열로 조용히 삼키지 않고 안전한 기본값으로 정규화하여 손상된 데이터가 화면에 전파되지 않게 합니다.

### `static_gallery_sync_leases`

정적 갤러리 동기화의 중복 실행 방지에 사용하는 테이블입니다. `marker_id`와 시간 값은 `TEXT`, 실행 번호는 `INTEGER`로 저장합니다. Postgres advisory lock 대신 Turso의 단일 `INSERT ... ON CONFLICT ... WHERE expires_at <= ?` 갱신을 사용하여 만료된 lease만 획득하도록 합니다.

### `hvc_schema_migrations`

Turso 전용 버전 테이블입니다. 기존 Postgres 마이그레이션 파일을 실행하지 않고, 이름이 고정된 Turso 스키마 마이그레이션을 트랜잭션 단위로 기록합니다.

## 4. 런타임 전환 설계

새 환경 변수는 다음과 같습니다.

```text
TURSO_DATABASE_URL=libsql://...
TURSO_AUTH_TOKEN=...
```

저장소 선택 규칙은 `TURSO_DATABASE_URL`과 `TURSO_AUTH_TOKEN`이 모두 있을 때 Turso 우선, 그렇지 않으면 기존 `POSTGRES_URL`, 둘 다 없으면 로컬 메모리 저장소입니다. 한쪽만 설정된 Turso 환경은 시작 시 명확한 오류를 내어 부분 설정으로 운영 데이터가 사라지는 상황을 막습니다.

Turso 연결은 `@libsql/client`의 서버 전용 싱글턴으로 만들고, 관리자 CRUD는 `AppRepository` 인터페이스 뒤에 둡니다. Postgres 구현과 메모리 구현은 유지하여 롤백과 테스트를 지원합니다.

정적 갤러리 lease도 동일한 provider 선택 규칙을 사용합니다. Turso에서는 SQLite 호환 SQL, Postgres에서는 현재 구현을 사용하므로 Neon quota가 남아 있는 동안에도 Turso 경로가 Neon lease를 다시 호출하지 않습니다.

## 5. 백업 및 데이터 이관 흐름

1. 현재 운영 데이터에서 관리자 백업 JSON을 확보합니다. 이 백업은 `githubUrl`, `thumbnailUrl`, 선택 메타데이터를 포함해야 합니다.
2. 백업의 앱 수, ID 중복, 필수 문자열, 태그 배열, 날짜 형식을 사전 검증합니다.
3. Turso 전용 스키마를 생성합니다.
4. 대상 DB가 비어 있는지 확인합니다. 비어 있지 않으면 `--allow-non-empty` 없이는 중단합니다.
5. 백업 앱을 배치 트랜잭션으로 upsert하여 Turso에 기록합니다.
6. 원본과 Turso의 ID 집합, 앱 수, 선택 필드, 태그, `githubUrl`을 대조합니다.
7. Turso에서 백업 JSON을 다시 내보내고 해시/필드 검증을 수행합니다.
8. 검증이 끝난 뒤에만 Vercel Production과 GitHub Actions에 Turso 환경 변수를 등록합니다.
9. 프로덕션 관리자 로그인, 앱 목록, 앱 수정, 태그 삭제, JSON 백업, 정적 갤러리 동기화를 순서대로 확인합니다.
10. 이상이 있으면 Turso 환경 변수만 제거하여 Neon으로 되돌립니다. Neon 테이블은 검증 기간 동안 삭제하지 않습니다.

추가 명령은 다음과 같이 분리합니다.

- `npm run db:migrate:turso`: Turso 스키마만 적용
- `npm run apps:import:backup:turso -- --backup <path>`: 검증된 백업을 Turso에 이관
- `npm run apps:verify:turso -- --backup <path>`: 원본 백업과 Turso 비교
- 기존 `apps:export-static-gallery`, `apps:verify-static-gallery`: Turso 또는 Postgres provider 선택

## 6. 정적 갤러리와 비용 보호

GitHub Actions의 정적 갤러리 작업도 Turso 환경 변수를 사용하도록 전환합니다. 매 요청마다 DB 전체를 반복 조회하지 않도록 기존 idempotent snapshot 재사용 로직을 유지합니다.

썸네일은 DB에 큰 data URL을 남기지 않고, 관리자 저장 시 업로드 URL 또는 안전한 외부 URL만 보존합니다. 정적 export 단계에서 로컬 파일로 materialize하여 공개 페이지가 DB나 외부 원본을 직접 읽지 않게 합니다.

## 7. 구현 순서

### 1단계: 어댑터 기반 추가

- `@libsql/client` 추가
- Turso 환경 변수와 provider 판별 함수 추가
- Turso client, 스키마, 직렬화/역직렬화 유틸리티 추가
- Turso `AppRepository` 추가
- 기존 Postgres/메모리 저장소와 provider 선택 연결

### 2단계: 동기화 및 스크립트 연결

- Turso static-gallery lease 구현 및 provider dispatch
- Turso schema migration 스크립트 추가
- 백업 import/verify 스크립트 추가
- 정적 gallery export/verify가 Turso를 읽도록 확장
- GitHub Actions 환경 변수 전환

### 3단계: 테스트와 안전장치

- 환경 변수 부분 설정 및 provider 우선순위 테스트
- 배열/날짜/선택 값 round-trip 테스트
- CRUD와 태그 최소 1개 제약 테스트
- 빈 대상 보호, ID 대조, 중복/손상 백업 거부 테스트
- Turso lease 만료/소유권 상실 테스트
- lint, unit test, build, diff check 실행

### 4단계: 실제 이관 및 운영 전환

- Turso 계정에서 database URL과 auth token을 준비
- 현재 Neon에서 관리자 백업 JSON 확보
- Turso schema 적용 및 import/verify
- Vercel Production/Preview 및 GitHub Actions secret 등록
- production 배포와 브라우저 smoke test
- 문제 없을 때만 Neon 사용량 모니터링 후 보존/정리 결정

## 8. 현재 실행 조건과 차단 사항

현재 로컬/Vercel 환경에는 Turso 인증 변수와 데이터베이스 URL이 확인되지 않았습니다. 따라서 이번 구현에서는 코드, 마이그레이션 도구, 검증 도구까지 완성하고, 실제 원격 DB 생성·데이터 이관·Production 환경 변수 등록은 Turso URL과 auth token이 준비된 뒤 실행합니다.

이 조건을 무시하고 공개 정적 JSON을 Turso에 임의로 넣으면 관리자 전용 GitHub 링크가 사라질 수 있으므로, 자격 증명이 준비되기 전에는 운영 DB를 덮어쓰지 않습니다.

## 9. 완료 기준

- Turso 설정 시 관리자 앱 목록과 CRUD가 Turso에서 동작한다.
- Turso 설정 시 정적 갤러리 lease/export/verify가 Neon 없이 동작한다.
- 백업 import 후 ID와 관리자 전용 필드가 원본과 일치한다.
- Turso 미설정 시 기존 Postgres 또는 메모리 fallback이 깨지지 않는다.
- 기존 공개 페이지의 정적 snapshot 계약과 썸네일 경로가 유지된다.
- 모든 자동화 테스트, lint, build가 통과한다.

## 10. 구현 진행 기록

- 완료: `@libsql/client` 기반 Turso client와 `TursoAppRepository` 추가
- 완료: provider 선택, 배열 JSON/ISO 날짜 변환, Postgres fallback
- 완료: Turso apps/lease/migration schema와 idempotent migration 명령
- 완료: 관리자 백업 import, 원본 대조, 빈 대상 보호 및 `scope: "admin"` 확인
- 완료: 정적 gallery export/verify와 GitHub Actions의 Turso provider 연결
- 확인: 로컬 `file:` Turso DB에서 migration 2회 재실행, 샘플 관리자 백업 import/verify 통과
- 대기: Turso 원격 URL/auth token 준비 후 실제 Neon 백업 import, Vercel/GitHub secrets 등록, Production cutover
