# GEO 학년 정보 원본 확인 기록

- 확인일: 2026-08-20
- 대상: strict GEO 검사에서 학년 맥락이 비어 있던 7개 앱
- 결론: 7개 모두 특정 학생 학년이 아니라 `교사용` / `teacher`로 분류

## 확인 방법

1. HVC 공개 스냅샷의 제목, 요약, 활용 메모, 대상 정보를 확인했습니다.
2. 각 공개 앱 URL의 현재 응답 상태와 HTML 제목·설명을 확인했습니다.
3. 각 GitHub 원본 저장소의 기본 브랜치를 새로 내려받아 사용자 역할과 기능 설명을 확인했습니다.
4. 원본에 특정 학생 학년 근거가 없으면 임의의 학년군을 부여하지 않았습니다.

## 앱별 판단

| 앱 | 확인한 원본 근거 | 학년 정보 판단 |
|---|---|---|
| PDF to PNG 1080p | [공개 앱](https://wbmaker2.github.io/pdf-to-png/)과 [원본 저장소](https://github.com/WBmaker2/pdf-to-png)에서 브라우저 안에서 PDF를 PNG로 변환하는 범용 자료 변환 기능을 확인했습니다. HVC의 등록 요약과 활용 메모는 교사가 PDF 안내문·학습지를 LMS, 슬라이드, 학급 게시 자료로 준비하는 용도를 명시합니다. 학생 교육과정 학년을 정할 근거는 없습니다. | `교사용` / `teacher` |
| 우리 반 학급일지 | [원본 저장소](https://github.com/WBmaker2/class-journal2)의 `README.md`와 `PROJECT_OVERVIEW.md`가 교사의 학급일지 업무를 위한 앱임을 직접 명시합니다. [공개 앱](https://class-journal2.vercel.app/)에서도 출결, 수업, 학급 일지, 학생 기록 관리 흐름을 확인했습니다. | `교사용` / `teacher` |
| 클라우드 수업실 | [공개 앱](https://wbmaker2.github.io/edu-word-cloud/)의 제목이 `클라우드 수업실 | 교사용 워드 클라우드`이고, [원본 저장소](https://github.com/WBmaker2/edu-word-cloud)의 설계·구현 문서가 교사가 학생 답변을 붙여넣어 수업 자료를 만드는 흐름을 명시합니다. | `교사용` / `teacher` |
| HEIC -> JPG 변환기 | [공개 앱](https://wbmaker2.github.io/heic-to-jpg/)과 [원본 저장소](https://github.com/WBmaker2/heic-to-jpg)에서 브라우저 안에서 HEIC/HEIF 사진을 JPG로 변환하는 범용 자료 변환 기능을 확인했습니다. HVC 활용 메모는 수업 자료 준비 용도를 명시하며, 특정 학생 학년을 정할 근거는 없습니다. | `교사용` / `teacher` |
| 담임 행정 허브 | [원본 저장소](https://github.com/WBmaker2/homeroom-admin-hub)의 설계 문서가 주 사용자를 담임교사 1명으로 한정하고 학생·학부모 직접 사용을 제외합니다. [공개 앱](https://wbmaker2.github.io/homeroom-admin-hub/)은 공문, 제출물, 마감, 템플릿 관리 기능을 제공합니다. | `교사용` / `teacher` |
| 교실 자리 바꾸기 도우미 | [원본 저장소](https://github.com/WBmaker2/class-random-seat)의 페이지 설명이 교사를 위한 자리표·타이머·랜덤 뽑기라고 명시하고, 화면 문구도 `교사용 관리 페이지`를 사용합니다. [공개 앱](https://class-random-seat.vercel.app/)의 현재 HTML 설명도 같은 대상을 명시합니다. | `교사용` / `teacher` |
| 학급 업무 체크리스트 | [공개 앱](https://task-checklist-prod.web.app/)과 [원본 저장소](https://github.com/WBmaker2/task-checklist)에서 학급 업무를 날짜별로 점검하고 업무·통계·백업을 관리하는 기능을 확인했습니다. HVC 등록 요약은 담임교사가 사용하는 도구임을 명시하며 학생 학습 단계는 없습니다. | `교사용` / `teacher` |

## 확인한 원본 리비전

| 저장소 | 커밋 |
|---|---|
| `WBmaker2/pdf-to-png` | `e458800e454336dad1bd45fe07f872ecea0d2ded` |
| `WBmaker2/class-journal2` | `3f064ba15a2c85e85997858016156a578f0250a0` |
| `WBmaker2/edu-word-cloud` | `027efcb8705daf049c6309da17baccd8327e9354` |
| `WBmaker2/heic-to-jpg` | `9cb509aa7a02eeb5c0d7cf0746432dcbe62f6693` |
| `WBmaker2/homeroom-admin-hub` | `b5b22a58ac47fb8b65e714e0fb90a7dc03fd109e` |
| `WBmaker2/class-random-seat` | `b3d1ced4eafcf81f1d0497e5bc563468a5fd46d0` |
| `WBmaker2/task-checklist` | `ac336edbdb5af41f2466108150083df1911a14af` |

## 반영 계약

각 앱의 기존 레코드에서 다음 두 필드만 학년 정보로 보완합니다.

```json
{
  "grade": "교사용",
  "gradeBands": ["teacher"]
}
```

관리자 원본 데이터 저장과 공개 정적 스냅샷 동기화는 별도 단계입니다. 관리자 원본 저장을 확인한 뒤 별도 동기화 절차로 공개 스냅샷을 다시 생성해야 합니다.
