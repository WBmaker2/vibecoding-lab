# Turso 사용량 제약 완화 계획

## 1. 목표

일반 사용자의 공개 페이지 이용과 관리자의 앱 등록·수정·삭제·sync 기능을 유지하면서, Turso에서 반복되는 전체 앱 목록 조회를 줄인다.

이번 작업의 우선 목표는 다음과 같다.

- 공개 페이지가 계속 정적 스냅샷만 읽도록 유지한다.
- 관리자 앱 수정에서 전체 앱 목록을 읽지 않고 대상 앱만 조회한다.
- 변경 없는 sync 버튼 클릭은 앱 전체 목록 조회 없이 종료한다.
- 실제 변경이 있는 sync는 기존처럼 GitHub Actions를 통해 정적 스냅샷을 생성한다.
- 기존 `public-apps.json`처럼 catalog revision이 없는 스냅샷도 첫 sync에서 안전하게 보정한다.
- Turso 최적화 기능이 실패하더라도 앱 CRUD 자체가 불필요하게 중단되지 않도록 한다.

## 2. 현재 분석

현재 앱 수는 약 84개이다.

| 흐름 | 현재 문제 | 예상 영향 |
| --- | --- | --- |
| 공개 페이지 로드 | `src/data/public-apps.json` 정적 스냅샷 사용 | Turso 조회 없음 |
| 관리자 페이지 로드 | `listAdminApps()`로 전체 앱 조회 | 관리자 접속 1회마다 전체 행 스캔 |
| 앱 수정 | action에서 전체 목록을 읽은 뒤 대상 앱을 찾고, repository에서도 수정 전후 재조회 | 수정 1회에 불필요한 전체 조회와 중복 point 조회 |
| 앱 등록 | INSERT 후 `getApp()`으로 같은 행을 다시 조회 | 1회 point read 제거 가능 |
| sync 사전 확인 | 변경이 없어도 전체 앱 목록을 읽어 pending 여부 계산 | 반복 클릭마다 전체 행 스캔 |
| 실제 sync | Vercel 사전 확인과 GitHub Actions export가 각각 전체 목록 조회 | 같은 sync에서 전체 목록 2회 조회 |
| 상태 polling | 관리자 화면이 진행 중일 때 5초마다 lease와 GitHub 상태 조회 | 앱 행 조회는 아니지만 요청·lease round trip 증가 |

Turso는 반환된 행 수가 아니라 쿼리가 스캔한 행을 기준으로 사용량을 계산할 수 있으므로, 단순히 `LIMIT`을 붙이는 방식보다 전체 목록 조회 자체를 피하는 것이 우선이다.

## 3. 설계

### 3.1 Catalog revision

Turso와 Postgres migration에 다음 singleton 상태 테이블을 추가한다.

```sql
app_catalog_state(
  state_key TEXT PRIMARY KEY,
  revision INTEGER NOT NULL
)
```

초기 행은 `state_key = 'apps'`, `revision = 0`으로 만든다.

앱의 실제 변경이 성공할 때 revision을 1 증가시킨다.

- 앱 등록
- 앱 수정
- 앱 태그 삭제
- 앱 삭제

정적 스냅샷에는 `catalogRevision`을 함께 기록한다.

### 3.2 Sync no-op gate

sync POST는 다음 순서로 동작한다.

1. 정적 스냅샷의 `catalogRevision`과 DB의 revision을 각각 1행 조회한다.
2. revision이 같고 generatedAt 및 썸네일 asset integrity가 유효하면 즉시 `{ dispatched: false }`를 반환한다.
3. revision이 다르거나 기존 스냅샷에 revision이 없으면 기존 방식대로 전체 앱 목록을 조회한다.
4. 실제 pending 변경 또는 revision metadata 보정이 있으면 GitHub Actions를 dispatch한다.

기존 스냅샷에는 revision이 없으므로 첫 sync는 전체 목록을 한 번 확인하고, export workflow가 새 revision을 스냅샷에 기록한다. 이 과정을 생략해 데이터 drift를 숨기지 않는다.

### 3.3 CRUD read/write 최적화

- `updateAppAction`은 `listAdminApps().find()` 대신 `getApp(id)`만 호출한다.
- Turso `INSERT`와 `UPDATE`는 `RETURNING`으로 저장된 행을 바로 반환한다.
- Turso 태그 삭제도 update 결과를 바로 반환한다.
- 삭제는 실제 삭제된 행이 있을 때만 revision을 증가시킨다.
- revision 갱신 실패는 CRUD 성공을 막지 않는다. 다음 sync는 revision gate를 사용할 수 없으므로 기존 전체 목록 비교로 안전하게 fallback한다.

## 4. 변경 대상

- `src/lib/apps/repository.ts`
- `src/lib/apps/turso-repository.ts`
- `src/app/admin/actions.ts`
- `src/lib/apps/static-public-apps.ts`
- `src/lib/apps/static-gallery-sync-state.ts`
- `src/app/api/admin/sync-static-gallery/route.ts`
- `scripts/lib/turso-schema.mjs`
- `scripts/lib/turso-apps.mjs`
- `scripts/lib/apps-database.mjs`
- `scripts/apps-export-static-gallery.mjs`
- `scripts/lib/static-gallery-export-state.mjs`
- `src/db/schema.ts`
- `src/db/migrations/0004_app_catalog_state.sql`
- 관련 repository, action, sync, export, migration 테스트

## 5. 검증 계획

### 자동 검증

- Turso repository가 `listAdminApps()` 없이 update하는지 확인한다.
- Turso INSERT/UPDATE/DELETE 결과와 revision 증가를 확인한다.
- revision이 같은 sync는 `listAdminApps()`를 호출하지 않는지 확인한다.
- revision이 없거나 다르면 기존 full comparison으로 fallback하는지 확인한다.
- export snapshot에 `catalogRevision`이 기록되는지 확인한다.
- 기존 revision 없는 snapshot과 backup export가 계속 동작하는지 확인한다.
- 전체 `npm test`, `npm run lint`, `npm run build`를 실행한다.

### 데이터 안전성 검증

- 기존 앱 데이터와 태그·썸네일·GitHub 링크를 변경하지 않는다.
- migration은 `IF NOT EXISTS`와 `ON CONFLICT DO NOTHING`으로 재실행 가능하게 만든다.
- revision 최적화 실패 시에도 관리자 CRUD가 데이터 저장 자체를 실패시키지 않는지 확인한다.
- sync fallback이 남아 있어 revision 누락 또는 DB state 오류가 데이터 누락으로 이어지지 않는지 확인한다.

## 6. 롤아웃 및 롤백

1. 코드와 migration을 함께 배포한다.
2. `npm run db:migrate:turso`로 Turso schema를 적용한다.
3. 관리자에서 기존 앱 1건을 수정하고 revision 증가 및 목록 반영을 확인한다.
4. 변경 없는 sync를 다시 눌러 full app list 없이 no-op 처리되는지 확인한다.
5. 변경 후 sync를 실행해 snapshot의 `catalogRevision`과 앱 데이터가 함께 갱신되는지 확인한다.

문제 발생 시 CRUD는 기존 repository 동작으로 되돌릴 수 있고, sync는 revision gate를 사용하지 않고 기존 전체 목록 비교로 fallback할 수 있다. migration으로 생성되는 singleton 상태 테이블은 앱 원본 데이터와 분리되어 있어 기존 `apps` 데이터 rollback이 필요하지 않다.

## 7. 기대 효과

현재 84개 앱 기준으로 일반 공개 페이지의 Turso read는 계속 0회이다. 관리자 수정은 약 84행 전체 스캔을 제거하고 대상 앱 point read 중심으로 바뀐다. 변경 없는 sync는 약 84행 전체 스캔 대신 상태 1행 조회로 종료한다. 실제 변경 sync는 필요한 경우에만 전체 앱 목록을 읽으므로, 무료 한도 초과로 인한 `BLOCKED` 위험과 불필요한 데이터 전송량을 함께 낮출 수 있다.
