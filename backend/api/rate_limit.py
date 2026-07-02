"""레이트리밋 — 로그인 등 무차별 대입 가능 엔드포인트 보호."""
from slowapi import Limiter
from slowapi.util import get_remote_address
from starlette.requests import Request


def _client_ip(request: Request) -> str:
    """nginx + cloudflared 뒤라 X-Forwarded-For 의 첫 IP 가 실제 클라이언트.
    헤더가 없으면 직접 연결 IP 로 폴백."""
    xff = request.headers.get("x-forwarded-for")
    if xff:
        return xff.split(",")[0].strip()
    return get_remote_address(request)


limiter = Limiter(key_func=_client_ip)
