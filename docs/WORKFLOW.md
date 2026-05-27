# koneps — 개발 워크플로우

## 1. 팀 역할

| 영역 | 담당 |
|---|---|
| AI 분석 / RFP 프롬프트 / 위험요소 | 강현묵 |
| DB 스키마 | 강주현 |
| 백엔드 라우트 / 수집기 | 최서원 |
| 프론트엔드 (대시보드·슬라이드오버·로그인) | 프론트 담당 |

## 2. 로컬 개발 환경

### 2.1 사전 준비
- Python 3.11+, Node 20+
- Docker (PostgreSQL 15 + pgvector)
- Google Gemini API 키, 리브레AI API 키, 나라장터 OpenAPI 서비스키

### 2.2 DB 기동
```bash
docker run -d --name g2b_postgres \
  -p 5432:5432 \
  -e POSTGRES_DB=koneps \
  -e POSTGRES_USER=g2b_user \
  -e POSTGRES_PASSWORD=g2b_pass \
  postgres:15

# pgvector 설치
docker exec g2b_postgres bash -c "apt-get update && apt-get install -y postgresql-15-pgvector"

# 스키마 적용
docker exec -i g2b_postgres psql -U g2b_user -d koneps < db/schema.sql
```

### 2.3 백엔드
```bash
cd backend
python -m venv ../venv && source ../venv/bin/activate
pip install -r ../requirements.txt
# 루트에 .env (DATABASE_URL, NARA_API_KEY, GEMINI_API_KEY, LIBREAI_API_KEY)
cd ..
uvicorn backend.main:app --port 8001
```

### 2.4 프론트
```bash
cd frontend
npm install
VITE_API_BASE_URL=http://localhost:8001 npm run dev
```

### 2.5 시드 계정
```sql
INSERT INTO users (username, password, name, role) VALUES
('manager01','1234','홍길동 PM','manager'),
('ceo01','1234','대표이사','ceo');
```

## 3. Git 브랜치 전략 (Git-flow)

```
main      ← 릴리즈 (보호)
 │
 └─ develop  ← 통합 (기본 PR target)
     ├─ feature/<이슈번호>-<설명>
     ├─ fix/<설명>
     └─ refactor/<설명>
```

- 기본 브랜치: **`develop`** (`main` 아님)
- 새 작업은 `develop`에서 분기: `git checkout -b feature/22-claude-api-integration`
- PR target은 `develop`
- 머지 후 브랜치 삭제

## 4. 커밋 컨벤션

| prefix | 용도 |
|---|---|
| `Feat:` | 새 기능 |
| `Fix:` | 버그 수정 |
| `Refactor:` | 동작 동일, 구조/이름 변경 |
| `Chore:` | 빌드/패키지/문서 등 |
| `Docs:` | 문서만 |

한글 한 줄, 50자 이내 권장. 이슈 번호는 본문에 `(#22)` 등.

## 5. PR 워크플로우

1. 작업 완료 → 본인 브랜치 push
2. `gh pr create --base develop` 또는 GitHub UI
3. PR 제목: 한글, 변경의 본질을 한 줄로
4. PR 본문:
   - **Summary**: 무엇을 왜
   - **변경 내용**: 파일/모듈별
   - **Test plan**: 어떻게 검증했는지
   - **Notes**: 후속 작업·이견 여지
5. 리뷰어 지정 + 머지

스택 PR (PR이 다른 PR 위에 쌓일 때): base 브랜치를 부모 PR 브랜치로 지정하고 본문에 의존 관계 명시.

## 6. AI 분석 추가 작업 시 체크리스트

`analyze_rfp` 또는 `outline_service`를 수정할 때:

- [ ] 새 응답 키를 만들면 → 프롬프트(`prompts/rfp_analysis.py`)에도 명시
- [ ] DB 컬럼 추가/변경 → `db/schema.sql` + `db/models.py` 동기화
- [ ] DB 컬럼 추가 → `backend/api/routes/bids.py`의 `AnalysisResultSchema` + 프론트 `api.ts`의 `ApiAnalysisResult` 함께 수정
- [ ] 신규 progress_store emit → 프론트 폴링(`fetchAnalysisStatus`)이 자동으로 받아 표시됨 (별도 작업 불요)
- [ ] 외부 API(Gemini/리브레AI) 호출 추가 → 429/503 재시도 + fallback 모델 패턴 따름

## 7. 디버깅 유틸

- `backend/scripts/ask_gemini.py` — Gemini 단발 호출 디버깅
- `/analysis/{bid_ntce_no}/status` — progress_store 로그 확인 (분석 중 폴링)
- `docker exec g2b_postgres psql -U g2b_user -d koneps` — DB 직접 조회

## 8. 알려진 한계 / TODO

| 항목 | 비고 |
|---|---|
| 리브레AI 일 50회 한도 | `attachments.converted_md` 캐시 컬럼 추가 시 완화 |
| 분석 진행 — 폴링 | SSE로 전환 가능 (현재 충분히 작동) |
| 인증 보안 | bcrypt + JWT 도입 필요 |
| 검색 결과 → 상세 진입 동선 | 현재 검색은 드롭다운까지만, 클릭 시 상세 안 열림(현황 리스트 행 클릭은 OK) |
| 자동 동기화 버튼 | `handleSync`가 collect API 의존 — 실패 시 fetchBids도 안 됨 |
