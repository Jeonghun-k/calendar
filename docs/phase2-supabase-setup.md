# Phase 2 Supabase 세팅 가이드

기준 문서: `PRD.md` v1.1, `TODO_List.md`

## 목표
- Supabase Auth(Email/Password) 활성화
- `events` 테이블/트리거/RLS/정책/Realtime 설정 완료
- 공동 계정 1개로 로그인 테스트 가능 상태 만들기

## 1) Supabase 프로젝트 생성
1. Supabase에서 새 프로젝트를 생성한다.
2. Region은 한국/가까운 지역으로 선택한다.
3. 프로젝트 생성 완료 후 `Project URL`, `anon key`를 확보한다.

## 2) Auth Email/Password 활성화
1. `Authentication > Providers > Email` 이동
2. Email provider 활성화
3. (권장) Confirm email 요구 여부를 팀 운영 방식에 맞게 결정

## 3) DB 스키마 적용
1. `SQL Editor` 이동
2. `supabase/sql/phase2_events_setup.sql` 전체 실행
3. 실행 후 `Table Editor`에서 `public.events` 확인

## 4) Realtime 확인
1. `Database > Replication` 또는 Realtime 관련 화면에서
2. `public.events`가 `supabase_realtime` publication에 포함되어 있는지 확인

## 5) 공동 계정 생성
1. `Authentication > Users`에서 `Add user`
2. 공동 계정 이메일/비밀번호 생성
3. 앱에서 해당 계정으로 로그인 테스트

## 6) 로컬 환경변수 반영
`.env` 파일에 아래 값 입력:

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

## 7) 빠른 검증 쿼리
아래 쿼리로 구조를 빠르게 확인 가능:

```sql
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'events'
order by ordinal_position;
```

```sql
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public' and tablename = 'events';
```

```sql
select policyname, permissive, roles, cmd
from pg_policies
where schemaname = 'public' and tablename = 'events';
```

## 완료 기준 (Phase 2)
- Auth Email/Password 동작 확인
- `events` 테이블 + `updated_at` 트리거 동작 확인
- RLS enabled + authenticated CRUD 정책 확인
- Realtime publication 등록 확인
- 공동 계정 로그인 성공
