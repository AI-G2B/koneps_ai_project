# AI 기반 나라장터 입찰 분석 플랫폼

**팀명**: 최강제곱 | **협력기업**: ㈜넥스트아이앤아이

나라장터 OpenAPI에서 IT 컨설팅 공고(ISP/ISMP 우선)를 자동 수집하고, AI로 RFP를 분석해 제안서 목차와 요구사항을 자동 생성하는 플랫폼.

---

## 팀 구성

| 이름 | 담당 |
|------|------|
| 최서원 | 수집 · 파싱 · REST API |
| 강주현 | DB 설계 · React 대시보드 |
| 강현묵 | AI 분석 · 제안목차 서비스 · 프롬프트 |

---

## 기술 스택

| 분류 | 기술 |
|------|------|
| 백엔드 | Python 3.11+, FastAPI |
| DB | PostgreSQL 15+ (Supabase) |
| AI | Gemini API (google-genai SDK) |
| 문서 변환 | 리브레AI API (HWP·PDF → HTML/MD) |
| 프론트엔드 | React + TypeScript, Tailwind CSS |
| API 수집 | 나라장터 Open API |
| 스케줄링 | APScheduler |

---

## 로컬 실행 방법

```bash
# 패키지 설치
uv pip install -r requirements.txt

# 서버 실행 (프로젝트 루트에서)
uvicorn backend.main:app --reload

# API 문서 (ENABLE_DOCS=true 설정 시)
http://127.0.0.1:8000/docs

# 프론트엔드
cd frontend && npm install && npm run dev
```

---

## 환경변수 설정

`.env.example`을 복사해 `.env`를 생성하고 아래 값을 입력합니다.

```
NARA_API_KEY=나라장터_공공데이터포털_API키
DATABASE_URL=postgresql+asyncpg://...
GEMINI_API_KEY=구글_AI_Studio_API키
GEMINI_MODEL=gemini-2.5-pro-preview-05-06
GEMINI_FALLBACK_MODEL=gemini-2.0-flash
LIBREAI_API_KEY=리브레AI_API키
JWT_SECRET_KEY=JWT_시크릿키
```

> Gemini 무료 티어(Flash)를 사용하려면 결제 미등록 API 키를 발급해야 합니다.

---

## 주요 기능

### 공고 수집
- 나라장터 OpenAPI에서 ISP/ISMP IT 컨설팅 공고 자동 필터링
- 매일 10:00 / 13:00 / 16:00 / 20:00 자동 수집 (APScheduler)
- 서버 시작 시 수집 공백 자동 보완 (갭 수집)
- 수집 즉시 AI 분석 자동 트리거 (백그라운드 처리)
- 서버 시작 시 미분석 기존 공고 일괄 분석 (순차 처리)

### AI 분석 (Gemini API)
- RFP 문서(PDF/HWP) → 발주기관, 마감일, 요구사항, 세부과업 자동 추출
- 독소조항 분석 및 위험도(risk_level) 평가
- 분석 결과는 공고 상세 화면에서 즉시 확인 가능

### 제안목차 자동 생성
- ISP/ISMP 행정안전부 가이드라인 기반 Level 1~4 목차 생성
- 평가항목 배점 포함, 엑셀 다운로드 지원
- 제안목차 제출은 수동 버튼으로 처리

### 대시보드 및 공고 관리
- 공고 목록 / 관심공고 / 진행 프로젝트 구분
- 마감일 지난 공고 자동 필터링
- 공고 상세 화면에서 분석 결과, 독소조항 확인 후 의사결정
- 어드민 계정에서 LLM 모델 설정 및 독소조항 프롬프트 조정 가능

---

## 개발 현황

| 파트 | 상태 | 담당 |
|------|------|------|
| 나라장터 API 수집 | ✅ 완료 | 최서원 |
| FastAPI 엔드포인트 | ✅ 완료 | 최서원 |
| APScheduler 자동 수집 | ✅ 완료 | 최서원 |
| 수집 즉시 AI 분석 자동 트리거 | ✅ 완료 | 최서원 |
| 미분석 공고 서버 시작 시 일괄 분석 | ✅ 완료 | 최서원 |
| DB 모델/CRUD | ✅ 완료 | 강주현 |
| React 프론트엔드 | 🔄 진행 중 | 강주현 |
| 어드민 LLM 설정 / 독소조항 조정 페이지 | 🔄 진행 중 | 강주현 |
| AI 분석 (Gemini API) | ✅ 완료 | 강현묵 |
| HWP/PDF 문서 변환 (리브레AI) | ✅ 완료 | 강현묵 |
| 제안목차 자동 생성 | ✅ 완료 | 강현묵 |
| 독소조항 분석 | ✅ 완료 | 강현묵 |

---

## 브랜치 전략

```
main      → 최종 배포 버전 (Approve 2명 필요)
develop   → 팀원 간 통합 브랜치 (Approve 1명 필요)
feature/* → 개인 작업 브랜치
fix/*     → 버그 수정 브랜치
```

- main, develop에 직접 push 금지
- 모든 기여는 PR을 통해서만

---

## 커밋 메시지 컨벤션

```
태그: 작업 내용 요약 (#이슈번호)
```

| 태그 | 용도 |
|------|------|
| Feat | 새 기능 |
| Fix | 버그 수정 |
| Docs | 문서 수정 |
| Refactor | 리팩토링 |
| Test | 테스트 |
