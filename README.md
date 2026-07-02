# koneps — AI 기반 나라장터 공고 분석 플랫폼

**팀명**: 최강제곱  **협력기업**: ㈜넥스트아이앤아이

나라장터 OpenAPI에서 IT 컨설팅 공고(ISP/ISMP)를 자동 수집하고, AI가 제안요청서(RFP)를 분석해
요구사항·독소조항·평가항목을 구조화하고 제안목차(Word/Excel)를 생성한다. 관리자는 코드 수정 없이
콘솔에서 LLM·프롬프트·운영 파라미터를 조정할 수 있다.

---

## 핵심 기능

### 1) 자동 수집 + 자동 분석
- 매일 **10:00 / 13:00 / 16:00 / 20:00 KST** APScheduler cron 자동 수집
- 서버 시작 5초 후 갭 수집 (마지막 슬롯 이후 누락분 자동 보완)
- 수집 직후 `analysis_queue` 가 신규 공고를 즉시 enqueue → 백그라운드 분석
  - `ANALYSIS_CONCURRENCY=10` 동시성, 일일 한도(`AUTO_ANALYSIS_DAILY_CAP=200`), 전역 backoff
  - RFP 첨부 없는 공고는 자동 제외 + 사유 기록

### 2) AI 분석 (RFP → 구조화 JSON)
- PDF 는 Gemini 멀티모달에 바이트 직전송, HWP 는 LibreAI 변환 후 텍스트
- 분리된 프롬프트로 정확도 향상
  - **ISP/ISMP 전용**: 컨설팅 산출물·평가항목 기준
  - **범용**: SI 구축·유지관리·연구용역 등
- 추출 항목: 발주기관·마감·금액·요구사항(코드별 ID·name·description)·평가항목·자격·**16개 독소조항** + 종합 risk_level
- 결과는 `analysis_results.raw_analysis` (JSONB) + 정형 컬럼으로 동시 저장

### 3) 제안목차 + RFP 원문 추출
- ISP/ISMP 가이드라인 + 동일 유형 샘플을 자동 첨부해 outline LLM 호출
- **요구사항 섹션 verbatim 추출**: 앵커 식별 LLM + 코드 fuzzy slice 로 원문 그대로 보존
- Excel 4시트 (`Main` / `제안 목차` / `RFP 요구사항` / `RFP 원문`)
- AI 분석 결과는 Word(.docx)로 별도 다운로드

### 4) 관리자 콘솔 (role='admin' 전용)
- 로그인 시 사이드바·대시보드 우회, 전용 셸로 진입
- **LLM 설정**: provider(Gemini/Claude/OpenAI) · 모델 · temperature · fallback. 새 모델 동적 등록
- **프롬프트 관리**: 10개 프롬프트 키 편집 · 필수 placeholder 검증 · 버전 히스토리 · 롤백 · 기본값 복원
- **운영 대시보드**: 동시성·캐시·시드 현황 + 5개 유지보수 액션 (stuck reset, 캐시 wipe, 프롬프트 재시드, LLM 테스트 호출)

### 5) Multi-Provider LLM 추상화
- `LLMProvider` 인터페이스 + `call_with_fallback(config, request, timeout)` 헬퍼
- PDF 처리 차이 흡수: Gemini native / Claude 32MB 이내 native+text 폴백 / OpenAI 항상 text
- RateLimit · Timeout · ContextOverflow · ProviderError 를 공통 예외로 정규화

### 6) 사용자 워크플로
- 공고 목록·검색·관심·진행 프로젝트 (역할별 사이드바: manager / ceo / proposal)
- 공고 상세에서 첨부 다운로드 + 분석 결과 + 독소조항 + 제안목차 탭
- 분석 진행은 폴링으로 실시간 로그 노출, 실패 시 사유 + "다시 시도" 버튼

---

## 팀 구성

| 이름 | 담당 |
|------|------|
| 최서원 | 수집 · 파싱 · REST API |
| 강주현 | DB 설계 · React 대시보드 |
| 강현묵 | AI 분석 · 제안목차 · 프롬프트 · 관리자 콘솔 · LLM 추상화 |

---

## 기술 스택

| 분류 | 사용 기술 |
|------|----------|
| 백엔드 | Python 3.11+, FastAPI, SQLAlchemy(async), asyncpg, APScheduler, SlowAPI |
| 인증 | bcrypt, python-jose (JWT) |
| 데이터베이스 | PostgreSQL 15+ (pgvector) — Supabase 공용 인스턴스 |
| LLM | google-genai · anthropic · openai (어댑터 패턴) |
| 문서 변환 | LibreAI (HWP→md), pypdf (PDF→text), BeautifulSoup (HTML 표 → md) |
| 출력 | openpyxl (Excel), python-docx (Word) |
| 프론트엔드 | React 19 + TypeScript + Vite, Tailwind, lucide-react |
| 데이터 수집 | 나라장터 OpenAPI (목록 + e-발주 첨부) |

---

## 빠른 시작

### 사전 준비
- Python 3.11+, Node 20+, Docker (또는 공용 Supabase 접근)
- API 키: `NARA_API_KEY`, `GEMINI_API_KEY`, `LIBREAI_API_KEY`

### 1) 의존성
```bash
# 백엔드
python -m venv venv && source venv/bin/activate
pip install -r backend/requirements.txt

# 프론트
cd frontend && npm install
```

### 2) .env 설정
`.env.example` 복사 후 값 채움. **최소 필수**:
```env
DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/dbname
NARA_API_KEY=...
GEMINI_API_KEY=...
LIBREAI_API_KEY=...
LIBREAI_API_URL=https://...
JWT_SECRET_KEY=<16자 이상 임의 문자열>

# (옵션) 활성 모델 시드값 — 관리자 콘솔에서 변경 가능
GEMINI_MODEL=gemini-3.1-pro-preview
GEMINI_FALLBACK_MODEL=gemini-2.5-pro

# (옵션) 다른 provider 활성화
ANTHROPIC_API_KEY=...
OPENAI_API_KEY=...

# (옵션) 운영 파라미터
ANALYSIS_CONCURRENCY=10
AUTO_ANALYSIS_DAILY_CAP=200
ANALYSIS_BACKOFF_SEC=60
CORS_ORIGINS=["http://localhost:5173"]

# (옵션) 초기 관리자 부트스트랩 — 미설정 시 기본 admin01/1234
ADMIN_BOOTSTRAP_USERNAME=admin01
ADMIN_BOOTSTRAP_PASSWORD=1234
```

### 3) 실행
```bash
# 백엔드 (프로젝트 루트)
uvicorn backend.main:app --port 8001 --log-level info

# 프론트 (별도 터미널)
cd frontend && VITE_API_BASE_URL=http://localhost:8001 npm run dev
```

### 4) 로그인
- 일반 사용자: `manager01 / 1234` (테스트 계정)
- **관리자**: `admin01 / 1234` (첫 부팅 시 lifespan 이 자동 생성)

> 부팅 시 lifespan 이 모든 테이블·컬럼·시드를 idempotent하게 처리하므로 별도 마이그레이션 명령 불필요.

---

## 디렉토리 구조

```
backend/
 ├ main.py              FastAPI 진입점 + lifespan (스키마 마이그레이션·시드·스케줄러)
 ├ config.py            설정 (pydantic-settings)
 ├ api/
 │   ├ security.py      bcrypt + JWT + get_current_user + require_admin
 │   ├ rate_limit.py    SlowAPI 한도
 │   └ routes/
 │       ├ auth.py      로그인 / 사용자 정보 / 발주기관 설정
 │       ├ bids.py      공고 목록·상세·수집·검색·북마크
 │       ├ analysis.py  분석 트리거·상태·삭제·Word 다운로드
 │       ├ outline.py   제안목차 트리거·상태·Excel
 │       ├ search.py    공고 검색 (DB → 나라장터)
 │       └ admin.py     /admin/* (prompts, llm-config, providers, ops)
 ├ collector/
 │   ├ naramarket.py    나라장터 OpenAPI 호출 + 공고 분류
 │   ├ service.py       save_bids + collect_and_save (new_notice_ids)
 │   ├ file_downloader.py  첨부 다운로드
 │   └ g2b_service.py   e-발주 첨부 보강
 ├ services/
 │   ├ extract.py            PDF/HWP → converted_md 캐싱 + HTML 표 정리
 │   ├ analysis_service.py   분석 파이프라인 (notice 분류 → LLM 호출)
 │   ├ analysis_queue.py     동시성·backoff·일일 한도 큐
 │   ├ analysis_docx.py      AI 분석 결과 Word 빌더
 │   ├ outline_service.py    제안목차 LLM + Excel 빌더 (4시트)
 │   ├ outline_types.py      ISP/ISMP 메타 + 샘플 로더
 │   ├ rfp_extract.py        앵커 식별 LLM + fuzzy slice (요구사항 verbatim)
 │   ├ hwp_service.py        LibreAI HWP→md 클라이언트
 │   ├ g2b_service.py        e-발주 첨부 API
 │   ├ progress_store.py     인메모리 작업 로그 (폴링용)
 │   ├ prompt_store.py       프롬프트 DB 저장소 + 버전 관리
 │   ├ llm_config_store.py   활성 LLM 설정 + provider 모델 레지스트리
 │   └ llm/
 │       ├ base.py           LLMProvider ABC + LLMRequest/Response/FilePart
 │       ├ exceptions.py     공통 예외 계층
 │       ├ gemini.py / claude.py / openai.py   provider 어댑터
 │       └ registry.py       call_with_fallback 헬퍼
 ├ prompts/
 │   ├ rfp_analysis.py            ISP/ISMP 분석 프롬프트 (정적 기본값)
 │   ├ rfp_analysis_general.py    범용 분석 프롬프트
 │   ├ outline_generation.py      제안목차 프롬프트
 │   └ rfp_section.py             앵커 식별 프롬프트
 ├ db/
 │   ├ models.py        SQLAlchemy ORM 정의
 │   ├ crud.py          CRUD 헬퍼
 │   └ database.py      async engine + SessionLocal
 └ scripts/
     ├ seed_admin.py    CLI: 관리자 계정 추가/갱신
     └ ask_gemini.py    Gemini 단발 호출 디버깅

frontend/src/
 ├ App.tsx              라우팅 (role='admin' → AdminConsole, 그 외 → 사이드바+페이지)
 ├ services/api.ts      백엔드 호출 + JWT 래퍼 + 도메인 매핑
 ├ types.ts             Bid / AnalysisLog / RiskFactor 등
 └ components/
     ├ LoginPage.tsx
     ├ Sidebar.tsx
     ├ BidTable.tsx + BidSlideOver.tsx + BidDetailPanel.tsx
     ├ AnalysisDetailPage.tsx     분석/독소/제안목차 탭 + 첨부 다운로드 + Word 다운로드
     ├ ProposalOutlinePage.tsx + ProposalPage.tsx
     ├ DashboardHeader.tsx + KpiCards.tsx + BottomWidgets.tsx
     ├ BookmarkPage.tsx + ProjectPage.tsx + StrategyReportPage.tsx
     ├ SettingsPage.tsx           선호/기피 발주기관
     ├ AdminConsole.tsx           관리자 셸 (3 탭)
     ├ AdminLLMConfig.tsx
     ├ AdminPromptManager.tsx
     └ AdminOps.tsx

db/schema.sql           초기 스키마 (참고용 — lifespan이 idempotent하게 보장)
samples/                ISP/ISMP 학습 샘플 (Excel + analysis.md)
docs/                   ARCHITECTURE / REQUIREMENTS / WORKFLOW / DEPLOYMENT
```

---

## 데이터 모델

```
notices ──┬─< attachments          (converted_md 캐시)
          ├─< analysis_results     (raw_analysis / poison_clauses JSONB)
          ├─< proposal_outlines    (sections + rfp_raw_text)
          └─< notice_memos

users ────┬─< agency_settings      (선호/기피 발주기관)
          ├─< prompts.updated_by
          └─< llm_config.updated_by

prompts ──< prompt_versions        (롤백 히스토리)
llm_config (싱글톤 id=1)
provider_models                    (UNIQUE provider+model)
```

자세한 데이터 흐름: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md), [`docs/WORKFLOW.md`](docs/WORKFLOW.md)

---

## 관리자 콘솔 사용법

`admin01 / 1234` 로 로그인 시 좌측 3탭:

| 탭 | 무엇을 할 수 있나 |
|---|---|
| **LLM 설정** | provider/model/temperature/fallback 즉시 변경 (DB 반영, 다음 호출부터 적용). 새 모델 ID 동적 등록 |
| **프롬프트 관리** | 10개 프롬프트 키 편집 — `rfp_analysis.{system,template,poison_checklist}`, `rfp_analysis_general.{...}`, `outline.{system,template}`, `rfp_section.{system,template}`. 저장 시 필수 placeholder 자동 검증, 버전 히스토리·롤백·기본값 복원 |
| **운영** | 동시성·일일 사용량·캐시·stuck 모니터링 + 5개 액션 (stuck reset, converted_md wipe, poison wipe, 프롬프트 재시드, LLM 테스트 호출) |

CLI 시드:
```bash
# 신규 admin 추가 또는 비번 변경
python -m backend.scripts.seed_admin --username admin02 --password <pw> --name "관리자2"
```

---

## 운영 환경 변수

| 변수 | 기본값 | 용도 |
|---|---|---|
| `ANALYSIS_CONCURRENCY` | 10 | 자동 분석 동시 실행 수 |
| `AUTO_ANALYSIS_DAILY_CAP` | 200 | 일일 자동 분석 상한 (비용 폭주 방지) |
| `ANALYSIS_BACKOFF_SEC` | 60 | 429/503 시 전역 일시 정지 시간 |
| `ENABLE_DOCS` | false | true 면 `/docs` (Swagger), `/redoc` 노출 |
| `CORS_ORIGINS` | `["http://localhost:5173"]` | 허용 origin (JSON 배열 또는 콤마 구분) |
| `ADMIN_BOOTSTRAP_USERNAME` | admin01 | lifespan 자동 시드 사용자명 |
| `ADMIN_BOOTSTRAP_PASSWORD` | 1234 | 위 비밀번호 |

---

## 브랜치 & 커밋 규칙

```
main      ← 릴리즈 (Approve 2명)
 └ develop ← 통합 (Approve 1명, 기본 PR target)
     ├ feature/<이슈번호>-<설명>
     ├ fix/<설명>
     └ refactor/<설명>
```

커밋 prefix: `Feat:` (새 기능) / `Fix:` (버그) / `Refactor:` / `Docs:` / `Chore:` / `Test:`

자세한 워크플로: [`docs/WORKFLOW.md`](docs/WORKFLOW.md)

---

## 부가 문서

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — 시스템 아키텍처 다이어그램·계층
- [`docs/REQUIREMENTS.md`](docs/REQUIREMENTS.md) — 요구사항 정의
- [`docs/WORKFLOW.md`](docs/WORKFLOW.md) — 개발 워크플로 + 디버깅 가이드
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — Docker Compose 배포

---

## 보안 메모

- `.env` 는 `.gitignore` 처리됨 (`.env.bak` 포함)
- JWT 시크릿은 최소 16자 임의 문자열 필수 (`security.py` import 시 검증)
- 비밀번호는 bcrypt 해시로 저장 (평문 X)
- `/admin/*` 라우터는 `require_admin` 가드로 비-admin 403
- 어드민 콘솔의 LLM 설정·프롬프트 변경은 `prompt_versions` / `llm_config.updated_by` 로 감사 추적

---

## 라이선스

캡스톤 학술 프로젝트 — 협력기업 ㈜넥스트아이앤아이 제공 가이드라인·샘플 데이터는 비공개. 코드는 팀 내부 사용 목적.
