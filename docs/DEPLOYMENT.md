# 배포 가이드 (Linux 서버 · Docker Compose)

연구실 서버에 koneps_ai_project를 배포하는 절차.

## 사전 요구 사항

| 항목 | 비고 |
|---|---|
| Linux 서버 (Ubuntu 22.04+ 권장) | RHEL/Rocky 계열도 가능 |
| Docker Engine 20.10+ | `docker --version` 으로 확인 |
| Docker Compose v2 | `docker compose version` 으로 확인 |
| 사용자가 `docker` 그룹에 속해 있을 것 | `sudo usermod -aG docker $USER` (sudo 필요) |
| 공인 IP + 80 포트 인바운드 허용 | 학교/연구실 방화벽 정책 확인 |
| 외부 API 키 | G2B / Gemini / 리브레AI |

## 1. 서버에 코드 가져오기

```bash
ssh <user>@<서버IP>
cd ~                 # 또는 배포용 디렉토리
git clone https://github.com/AI-G2B/koneps_ai_project.git
cd koneps_ai_project
git checkout develop  # PR #33 머지 후 develop 기준
```

## 2. 환경변수 작성

```bash
cp .env.example .env
nano .env
```

채워야 할 값:

```env
POSTGRES_PASSWORD=<강력한 패스워드>
JWT_SECRET_KEY=<openssl rand -hex 32 결과>
G2B_API_KEY=<나라장터 Open API 인증키>
LIBREAI_API_KEY=<리브레AI 발급 키>
GEMINI_API_KEY=<Google AI Studio 발급 키>
CORS_ORIGINS=http://<서버IP>      # 운영 시 좁히길 권장
WEB_PORT=80                       # 80 외에 다른 포트 쓰려면 변경
```

랜덤 비밀번호/시크릿 생성 예:
```bash
openssl rand -base64 24    # POSTGRES_PASSWORD
openssl rand -hex 32       # JWT_SECRET_KEY
```

## 3. 빌드 + 기동

```bash
docker compose up -d --build
```

처음 한 번만 빌드(수 분 소요). 이후엔 `docker compose up -d`만 해도 됨.

진행 확인:
```bash
docker compose ps               # 모든 컨테이너 healthy 인지
docker compose logs -f backend  # FastAPI 시작 로그
```

postgres 컨테이너가 첫 실행 시 `db/schema.sql`을 자동 적용합니다.

## 4. 초기 사용자 시드 (최초 1회)

로그인 가능한 사용자가 없으므로 직접 삽입합니다.

```bash
docker compose exec postgres psql -U koneps -d koneps -c \
  "INSERT INTO users (username, password, name, role) VALUES \
   ('manager01', '1234', '담당자', 'manager'), \
   ('ceo01', '1234', '대표', 'ceo');"
```

> ⚠️ 운영 환경에선 평문 비밀번호 대신 해시 + 강력한 패스워드 사용 권장.

## 5. 접속 확인

브라우저: `http://<서버IP>/`

- `/` → SPA (대시보드 로그인 화면)
- `/api/bids` → FastAPI 직접 호출 (JSON 응답)

API 헬스 체크:
```bash
curl http://<서버IP>/api/openapi.json | head -c 100
```

## 6. 운영 명령

| 작업 | 명령 |
|---|---|
| 로그 보기 | `docker compose logs -f [backend\|web\|postgres]` |
| 재시작 (코드 무변경) | `docker compose restart backend` |
| 코드 업데이트 + 재배포 | `git pull && docker compose up -d --build` |
| 전체 중지 | `docker compose down` |
| 전체 중지 + DB 삭제 | `docker compose down -v`  (⚠️ 데이터 영구 삭제) |
| DB 백업 | `docker compose exec postgres pg_dump -U koneps koneps > backup_$(date +%F).sql` |
| DB 복원 | `cat backup.sql \| docker compose exec -T postgres psql -U koneps -d koneps` |
| 호스트에서 DB 쿼리 | `docker compose exec postgres psql -U koneps -d koneps` |

## 7. 데이터/파일 영속화

호스트 볼륨 마운트로 컨테이너 삭제 시에도 유지되는 데이터:

| 호스트 경로 | 컨테이너 경로 | 용도 |
|---|---|---|
| Docker volume `pgdata` | `/var/lib/postgresql/data` | PostgreSQL 데이터 |
| `./downloads/` | `/app/downloads` | G2B 자동 다운로드 + 수동 업로드 RFP |
| `./samples/` | `/app/samples` (RO) | ISP/ISMP 학습 샘플 (코드에서 읽기만) |

## 8. 스키마 변경 시

`db/schema.sql`은 **첫 컨테이너 실행 시(빈 데이터 디렉토리)에만** 자동 적용됩니다. 이후엔 직접 실행:

```bash
docker compose cp db/schema.sql postgres:/tmp/schema.sql
docker compose exec postgres psql -U koneps -d koneps -f /tmp/schema.sql
```

또는 마이그레이션 도구(Alembic) 도입 권장.

## 9. 보안 권장 사항 (도메인/SSL 도입 시)

이 가이드는 IP + HTTP 기준. 추후 도메인 + HTTPS로 전환할 때:

1. 도메인 등록 (학교 서브도메인 또는 무료 DDNS)
2. Caddy 또는 nginx + Certbot 으로 자동 SSL 발급
3. `docker-compose.yml`에 reverse proxy 컨테이너 추가
4. `CORS_ORIGINS`를 정확한 origin으로 좁힘
5. `JWT_SECRET_KEY` 강력화

## 트러블슈팅

| 증상 | 점검 |
|---|---|
| `permission denied` (docker) | 사용자가 docker 그룹 미포함. `sudo usermod -aG docker $USER` 후 재로그인 |
| `web` 컨테이너 80 포트 충돌 | 호스트에 이미 nginx/apache 실행 중. `.env`의 `WEB_PORT=8080` 변경 |
| backend가 postgres에 연결 못 함 | `docker compose logs postgres` → schema 적용 오류 확인. 볼륨 초기화 후 재시도 |
| 한글 깨짐 | DB locale (image 기본값 `en_US.utf8` 사용) — clientside 이슈 가능, charset 확인 |
| Gemini 401/403 | `.env`의 GEMINI_API_KEY 오타, Google AI Studio에서 키 재발급 |
| 리브레AI 일일 50회 초과 | 다음날 자동 리셋. 분석은 PDF 경로로 fallback (HWPX 분석 스킵) |
