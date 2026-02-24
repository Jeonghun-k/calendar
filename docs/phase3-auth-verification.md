# Phase 3 인증/세션 검증 가이드

기준: `TODO_List.md`의 Phase 3 남은 항목

## 검증 전 준비
1. `.env`에 Supabase URL/ANON KEY가 설정되어 있어야 함
2. `npm run dev`로 앱 실행
3. 공동 계정으로 로그인

## 1) 세션 유지(persist session) 검증
1. 로그인 완료 후 브라우저 탭 새로고침
2. 로그인 화면으로 돌아가지 않고 메인 화면 유지되는지 확인
3. 브라우저를 완전히 닫았다가 다시 열어 접속
4. 로그인 상태가 유지되면 통과

기대 결과:
- 로그인 재입력 없이 메인 진입
- 메인에 `마지막 인증 이벤트`가 표시됨 (`INITIAL_SESSION` 또는 `SIGNED_IN` 등)

## 2) 자동 토큰 갱신(auto refresh) 검증
1. 로그인 상태로 앱을 일정 시간 유지
2. 메인 화면의 `마지막 인증 이벤트`가 `TOKEN_REFRESHED`로 변경되는지 확인
3. 변경 이후에도 화면이 로그인 상태를 유지하면 통과

기대 결과:
- `TOKEN_REFRESHED` 이벤트 관찰 가능
- 이벤트 이후 강제 로그아웃/에러 없음

## 3) 실패 시 점검 포인트
- Supabase Auth Email provider 활성화 여부
- 프로젝트 일시 중지(Supabase Free) 여부
- 브라우저의 localStorage 차단/프라이빗 모드 여부
