# Phase 1 설계 확정

기준: `PRD.md` v1.1 (2026-02-12)

## 1) 화면 흐름
1. 로그인 화면
2. 월간 달력 메인 화면
3. 날짜 선택 시 일정 목록 패널
4. 일정 클릭 시 일정 폼(수정 모드)
5. 일정 추가 버튼 클릭 시 일정 폼(생성 모드)

## 2) 상태 구조
- `auth`
  - `session`: Supabase 세션 객체
  - `user`: 로그인 사용자
  - `isAuthLoading`: 인증 초기화 로딩
- `calendar`
  - `currentMonth`: 현재 보고 있는 월 (예: `2026-02`)
  - `selectedDate`: 선택 날짜 (`YYYY-MM-DD`)
  - `monthEvents`: 해당 월 일정 배열
  - `isEventsLoading`: 월 데이터 로딩
  - `eventsError`: 조회 에러 메시지
- `eventForm`
  - `mode`: `create | edit`
  - `editingEventId`: 수정 대상 id
  - `formValues`: 제목/시작/종료/종일/메모/색상
  - `isSubmitting`: 저장/삭제 중 상태
  - `submitError`: 저장 실패 메시지

## 3) 시간 정책
- DB 저장 타입: `timestamptz`
- 앱 표시 기준: `Asia/Seoul` (KST)
- 월 조회는 KST 월 경계를 UTC로 변환해 `start_at` 범위로 조회
- 화면 출력은 `Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul' })` 기준 사용

## 4) 종일 일정 저장 규칙
- 사용자가 `all_day=true`로 저장할 때:
  - `start_at`: 선택 날짜 `00:00` KST
  - `end_at`: 다음 날짜 `00:00` KST
- 종일 일정 수정 시에도 동일 규칙 재적용

## 5) 폼 유효성 규칙
- 제목(`title`)은 필수, 공백만 입력 불가
- `start_at`, `end_at` 필수
- `end_at`은 반드시 `start_at` 이후
- `all_day=true`일 때 시간 입력 UI 숨김(날짜 중심 입력)
- 메모/색상은 선택 입력

