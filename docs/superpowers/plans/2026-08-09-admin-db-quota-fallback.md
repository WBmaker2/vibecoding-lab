# 관리자 페이지 DB 한도 초과 대응 계획

## 문제

- `https://www.vibehong.shop/admin` 접속 시 Next.js 서버 오류 화면이 표시된다.
- Vercel 함수 로그의 직접 원인은 `apps` 테이블 조회 실패다.
- DB 원인 메시지는 `Your project has exceeded the data transfer quota. Upgrade your plan to increase limits.`이며, 연결된 Postgres DB의 전송량 한도가 초과된 상태다.
- 로그인 전 `/admin` 접근에서도 자식 페이지가 DB 조회를 시도해, 로그인 redirect와 서버 오류가 함께 발생할 수 있다.

## 목표

- 로그인하지 않은 사용자는 DB 조회 없이 `/admin/login`으로 보낸다.
- 로그인한 관리자에게 DB 한도 초과가 발생해도 서버 오류 화면 대신 원인과 다음 조치를 설명하는 관리자 fallback 화면을 보여준다.
- DB가 복구되기 전에는 등록, 수정, 삭제가 영구 저장되지 않으므로 이를 명확히 읽기 전용 상태로 안내한다.
- 공개 정적 스냅샷을 이용해 현재 공개된 앱 목록은 확인할 수 있게 한다.
- 변경 내역은 앱의 `업데이트 내역`에도 남긴다.

## 구현 순서

1. 관리자 페이지 데이터 로더를 분리한다.
2. 보호 페이지에서 `hasAdminSession()`을 먼저 확인한 뒤에만 DB를 읽는다.
3. DB 조회 실패 시 정적 공개 스냅샷을 관리자 표시용 읽기 전용 데이터로 변환한다.
4. 관리자 DB fallback 화면을 새 컴포넌트로 만든다.
5. 업데이트 내역에 2026-08-09 관리자 DB 한도 초과 대응 항목을 추가한다.
6. 단위 테스트로 DB 실패 fallback과 업데이트 내역 표시를 검증한다.
7. `npm test`, `npm run lint`, `npm run build`로 확인한다.

## 한계

- DB 전송량 한도 자체는 코드만으로 늘릴 수 없다.
- fallback 화면에서는 공개 스냅샷 확인만 가능하며, 새 앱 등록/수정/삭제는 DB 한도가 복구되거나 DB 제공자를 교체한 뒤 가능하다.
