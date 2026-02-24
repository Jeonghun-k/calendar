# 공유 캘린더 웹앱(PWA) TODO List (v1)

기준 문서: `PRD.md` (v1.1, 2026-02-12 KST)

## Phase 0. 프로젝트 준비
- [x] 저장소 기본 구조 점검 (`src`, `public`, `docs` 등)
- [x] `.env.example` 작성 (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
- [x] 실행/빌드 스크립트 점검 (`npm run dev`, `npm run build`)
- [x] 배포 베이스 경로 확인 (GitHub Pages용 `base` 설정)
- [x] README에 로컬 실행 방법 추가

## Phase 1. 설계 확정
- [x] 화면 흐름 확정: 로그인 → 월간 달력 → 일정 목록/상세 → 일정 폼
- [x] 상태 구조 설계: 인증 상태, 현재 월, 선택 날짜, 이벤트 목록
- [x] 시간 정책 확정: 저장은 `timestamptz`, 표시는 KST(Asia/Seoul)
- [x] 종일 일정 규칙 확정: `start_at=00:00`, `end_at=다음날 00:00`
- [x] 폼 유효성 규칙 정의: 제목 필수, 종료시각 > 시작시각

## Phase 2. Supabase 세팅
- [x] 로컬 준비: SQL 스크립트 작성 (`supabase/sql/phase2_events_setup.sql`)
- [x] 로컬 준비: 세팅 가이드 작성 (`docs/phase2-supabase-setup.md`)
- [x] Supabase 프로젝트 생성
- [x] Auth Email/Password 활성화
- [x] `events` 테이블 생성
- [x] 컬럼 구성 반영 (`id`, `title`, `start_at`, `end_at`, `all_day`, `notes`, `color`, `created_at`, `updated_at`)
- [x] `updated_at` 자동 갱신 트리거 추가
- [x] RLS 활성화
- [x] RLS 정책 추가: authenticated 사용자 CRUD 허용
- [x] Realtime에서 `events` 테이블 활성화
- [x] 공동 계정 1개 생성 및 로그인 검증

## Phase 3. 인증/세션 구현
- [x] Supabase 클라이언트 초기화 모듈 작성
- [x] 로그인 화면 구현 (email/password)
- [x] 로그인 성공 시 메인 이동
- [x] 세션/인증 이벤트 확인 UI 추가 (`lastAuthEvent`, `expires_at`)
- [x] 수동 검증 가이드 작성 (`docs/phase3-auth-verification.md`)
- [x] 세션 유지(persist session) 동작 확인
- [x] 자동 토큰 갱신(auto refresh) 동작 확인
- [x] 로그아웃 기능(옵션) 추가 및 만료 시 재로그인 처리

## Phase 4. 달력/목록 UI 구현
- [x] 월간 달력 화면 구현 (현재 월 표시)
- [x] "오늘" 날짜 강조
- [x] 날짜 클릭 시 해당 날짜 일정 목록 표시
- [x] 목록 정렬: 시간 오름차순
- [x] 로딩 상태 UI 추가
- [x] 빈 상태 UI 추가 (일정 없음 안내)
- [x] 모바일 터치 영역 44px 이상 적용
- [x] 기본 폰트 크기 16~18px 이상 적용

## Phase 5. 일정 CRUD 구현
- [x] 일정 생성 폼 구현 (제목/시작/종료/종일/메모/색상)
- [x] 일정 수정 폼 구현 (기존값 로드)
- [x] 삭제 기능 + 확인 팝업 구현
- [x] Supabase insert 연동
- [x] Supabase update 연동
- [x] Supabase delete 연동
- [x] 저장 실패 시 에러 메시지 표시
- [x] 실패 시 재시도 액션 제공

## Phase 6. Realtime 동기화
- [x] `events` insert/update/delete Realtime 구독 연결
- [x] 이벤트 수신 시 "해당 월 데이터 재조회" 로직 구현
- [x] Realtime 연결 끊김/타임아웃 자동 재연결 처리
- [x] 오프라인→온라인 복구 시 자동 재조회 처리
- [x] 최근 실시간 지연(ms) 표시로 실측 보조
- [ ] 중복 반영/깜빡임 여부 점검
- [ ] 다른 기기 반영 지연(3초 이내) 실측
- [ ] 네트워크 불안정 시 복구 동작 점검

## Phase 7. PWA/배포
- [x] PWA 메타/매니페스트 점검 (앱 이름/아이콘/테마)
- [ ] 모바일 홈 화면 추가 동작 확인 (iOS/Android)
- [x] GitHub Pages 배포 설정
- [ ] 실제 배포 URL에서 라우팅/새로고침 동작 확인
- [ ] 부모님 휴대폰 2대 설치 및 기본 사용성 확인

## Phase 8. QA (수용 기준 기반)
- [ ] AC-01: 기기 A 추가 → 기기 B 3초 내 반영
- [ ] AC-02: 앱 재실행 시 로그인 화면 없이 메인 진입
- [ ] AC-03: 추가/수정/삭제 후 새로고침해도 데이터 유지
- [ ] AC-04: 네트워크 오류 시 오류 노출 + 앱 무응답 없음
- [ ] KST 표시/저장 일치 여부 검증
- [ ] 종일 일정 경계(자정) 케이스 검증

## Phase 9. 문서화/마무리
- [ ] 환경변수/배포 절차 문서화
- [ ] 운영 시 주의사항 문서화 (Supabase Free 일시 중지 가능성)
- [ ] v2 백로그 분리 (반복 일정, 공유 확장 등)
- [ ] 최종 점검 체크리스트 1회 재실행

---

## 현재 진행 상태
- [x] Phase 0
- [x] Phase 1
- [x] Phase 2
- [x] Phase 3
- [x] Phase 4
- [x] Phase 5
- [ ] Phase 6
- [ ] Phase 7
- [ ] Phase 8
- [ ] Phase 9
