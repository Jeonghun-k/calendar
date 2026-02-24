# Calander-antigravity

공유 캘린더 웹앱(PWA) 프로젝트입니다.

## 로컬 실행

### 1) 의존성 설치
```bash
npm install
```

### 2) 환경변수 설정
```bash
cp .env.example .env
```
`.env`에 Supabase 값을 입력하세요.

- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`: 필수
- `VITE_HOLIDAY_PROXY_ENDPOINT`: 공휴일 API 프록시 엔드포인트(서버에서 비밀키 보관)
- `VITE_SHARED_ACCOUNT_EMAIL`, `VITE_SHARED_ACCOUNT_PASSWORD`: 선택 (자동 로그인 사용 시)

### 3) 개발 서버 실행
```bash
npm run dev
```

### 4) 프로덕션 빌드
```bash
npm run build
```

## GitHub Pages 배포 기준
- Vite `base`는 프로덕션에서 `/Calander-antigravity/`로 설정되어 있습니다.
- 저장소 이름이 바뀌면 `vite.config.js`의 `base` 값을 함께 수정해야 합니다.
- GitHub Actions로 배포할 경우 `Settings > Secrets and variables > Actions`에 아래 시크릿을 등록해야 Supabase 동기화가 동작합니다.
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `VITE_HOLIDAY_PROXY_ENDPOINT` (선택)
  - `VITE_SHARED_ACCOUNT_EMAIL` (선택)
  - `VITE_SHARED_ACCOUNT_PASSWORD` (선택)

## Phase 2 (Supabase) 시작
- 단계별 가이드: `docs/phase2-supabase-setup.md`
- 실행용 SQL: `supabase/sql/phase2_events_setup.sql`

## Phase 3 (인증/세션) 검증
- 검증 가이드: `docs/phase3-auth-verification.md`
