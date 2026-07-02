# koneps — 시스템 아키텍처

> 나라장터 용역 공고(IT 컨설팅·ISP/ISMP) AI 분석 플랫폼

## 1. 시스템 개요

```
[조달청 나라장터 OpenAPI]
        │
        ▼
[Collector] ─── 4회/일 자동 + 빈틈 보정 + 수동
        │  (notices + attachments)
        ▼
[PostgreSQL + pgvector]
        │
        ▼
[FastAPI Backend] ─── REST + 진행상황(폴링)
        │
        ▼
[React Frontend] ─── 담당자 / CEO 모드
        │
        ▼
[Gemini AI] ←─ analyze_rfp (위험요소·핵심항목 추출)
[리브레AI] ←─ HWP → MD 변환
```

## 2. 기술 스택

| 영역 | 스택 |
|---|---|
| Backend | Python 3.11+, FastAPI, SQLAlchemy 2(async) + asyncpg, APScheduler |
| DB | PostgreSQL 15 + pgvector |
| AI | Google Gemini (`gemini-3.1-pro-preview` / fallback `gemini-2.5-pro`) |
| HWP 변환 | 리브레AI API |
| Frontend | React 19, TypeScript, Vite 8, Tailwind v4, Radix UI, recharts, lucide-react |
| 컨테이너 | Docker (postgres) |

## 3. 디렉토리 구조

```
koneps_ai_project/
├── backend/
│   ├── main.py                 # FastAPI 진입 + lifespan(스케줄러, 테이블 보강)
│   ├── config.py               # Gemini/리브레AI 설정 (pydantic-settings)
│   ├── api/routes/             # bids / analysis / search / auth
│   ├── collector/              # 나라장터 수집 + 첨부 다운로드
│   ├── db/
│   │   ├── database.py         # 비동기 엔진 / 세션 / Base
│   │   ├── models.py           # ORM 모델
│   │   └── crud.py             # 쿼리/저장 헬퍼
│   ├── prompts/                # rfp_analysis / outline_generation
│   ├── services/
│   │   ├── analysis_service.py # analyze_rfp (Gemini 호출 + DB 저장)
│   │   ├── outline_service.py  # 제안목차 생성 + Excel
│   │   ├── hwp_service.py      # HWP/HWPX/PDF → md (리브레AI)
│   │   └── progress_store.py   # 분석 진행 로그 인메모리
│   └── scripts/                # 디버깅 유틸 (ask_gemini.py)
├── frontend/
│   └── src/
│       ├── App.tsx             # 라우팅 / 폴링 / persist
│       ├── services/api.ts     # 백엔드 API 클라이언트 + 매퍼
│       └── components/         # 대시보드 / 슬라이드오버 / 상세 리포트
├── db/schema.sql               # 정식 스키마 (notices 등 5개)
└── docs/                       # 본 문서들
```

## 4. 데이터 모델 (요지)

| 테이블 | 역할 | 핵심 컬럼 |
|---|---|---|
| `notices` | 수집된 공고 | bid_ntce_no, bid_ntce_nm, ntce_instt_nm, bid_clse_dt, pipeline_status |
| `attachments` | 공고 첨부파일 | notice_id, file_name, file_type, file_url, local_path |
| `analysis_results` | AI 분석 결과 (1:1) | project_type, estimated_price, risk_level, eval_criteria(JSONB), requirements(JSONB), poison_clauses(JSONB), raw_analysis(JSONB) |
| `proposal_outlines` | 제안목차 (1:N) | notice_id, sections(JSONB), guideline_base |
| `users` | 로그인 계정 | username, password, role |
| `notice_memos` | 공고별 담당자 메모 | notice_id, content, author_name |

설계 원칙: **자주 필터/집계하는 필드는 정형 컬럼, 가변/리스트형은 JSONB**. 독소조항·요구사항·제안목차 섹션은 항상 공고 단위 전체로 다뤄지므로 별도 row 정규화 대신 JSONB.

## 5. AI 분석 파이프라인

```
POST /analysis/run/{bid_ntce_no}
   │
   │ (BackgroundTasks)
   ▼
analyze_rfp(notice_id, db)
   ├─ attachments 로드 (local_path 우선 → G2B fallback)
   ├─ PDF: 원본 바이트로 Gemini 직접 전송
   ├─ HWP: 리브레AI 변환 → 텍스트로 전송
   ├─ Gemini 호출 (429/503 재시도 + 모델 fallback)
   ├─ 응답 JSON 파싱 → poison_clauses / eval_criteria / requirements / basic_info
   └─ analysis_results upsert (status='completed')

폴링: GET /analysis/{bid_ntce_no}/status
   → progress_store.get(notice_id) — 실시간 로그 (인메모리, 서버 재시작 시 소멸)
```

위험도 등급: `safe | caution | warning | danger` (4단계).
독소조항 16개 체크리스트 (S1~L4): 과업/인력/비용/법무 4분류.

## 6. 외부 의존성

| 서비스 | 용도 | 한도/주의 |
|---|---|---|
| 나라장터 OpenAPI | 공고 수집 | `serviceKey` 필요, 날짜는 `YYYYMMDDHHmm` |
| Google Gemini | RFP 분석·제안목차 생성 | 토큰/요청 한도 |
| 리브레AI | HWP/HWPX → MD 변환 | **일 50회 한도** |

## 7. 보안·운영

- 인증: 평문 password 단순 비교 (캡스톤 PoC 수준 — 운영 전 bcrypt + JWT 필요)
- CORS: dev 전체 허용
- 로그: SQLAlchemy echo=True (개발), progress_store는 인메모리
- DB 초기화: `db/schema.sql` + 일부 테이블(users / notice_memos)은 lifespan의 `CREATE TABLE IF NOT EXISTS`로 보강
