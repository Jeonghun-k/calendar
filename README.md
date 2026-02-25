# Calander-antigravity

공유 캘린더 웹앱(PWA) 프로젝트입니다.
부모님 사업 일정 관리를 위해 제작된 pwa용 캘린더 웹사이트 입니다.

## 기능
1. 부모님 두명만 참여 가능하도록 아이디는 하나로 통일
2. 바로바로 업데이트가 진행될 수 있도록 라이브 커넥팅 완료
3. 주로 마감, 기초 라는 단어로 일정 관리하는 경향이 있음 -> 마감과 기초를 한눈에 확인 할 수있도록 해당 단어가 포함되면 자동으로 색상이 선택되도록 제작
4. 공공 데이터 포탈에서 국가 공휴일 api를 가져와 공휴일이 표시될 수 있도록 제작
5. 주로 모바일 사용이므로 스크롤 기반으로 작동할 수 있게 제작
6. 스크롤을 하면서 현재 보고있는 월이 좌측 상단에 표시될수 있고, 월이 바뀔때 마다 자연스럽게 전환되게 제작
7. 일정을 날짜별로 한번에 묶어두는게 아닌 일정별로 나눠서 각각 수정및 삭제가 가능하게 제작 

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

## Phase 2 (Supabase) 시작
- 단계별 가이드: `docs/phase2-supabase-setup.md`
- 실행용 SQL: `supabase/sql/phase2_events_setup.sql`

## Phase 3 (인증/세션) 검증
- 검증 가이드: `docs/phase3-auth-verification.md`
