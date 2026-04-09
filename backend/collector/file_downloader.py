"""
첨부파일 다운로드
담당: 최서원

naramarket.py에서 받은 file_url로 PDF/HWP 다운로드
→ 강현묵 파싱 모듈이 이 파일 경로를 받아서 텍스트 추출
"""

import requests
import os
from pathlib import Path

# 다운로드 저장 폴더
DOWNLOAD_DIR = Path("downloads")


def download_file(file_url: str, file_name: str) -> str | None:
    """
    URL에서 파일 다운로드 후 로컬 경로 반환

    Args:
        file_url  : 나라장터 첨부파일 다운로드 URL
        file_name : 저장할 파일명

    Returns:
        저장된 파일 경로 (str), 실패 시 None
    """
    DOWNLOAD_DIR.mkdir(exist_ok=True)
    save_path = DOWNLOAD_DIR / file_name

    # 이미 다운로드된 파일이면 재다운로드 스킵
    if save_path.exists():
        return str(save_path)

    try:
        resp = requests.get(file_url, timeout=30, stream=True)
        resp.raise_for_status()
        with open(save_path, "wb") as f:
            for chunk in resp.iter_content(chunk_size=8192):
                f.write(chunk)
        return str(save_path)
    except requests.RequestException as e:
        print(f"다운로드 실패 [{file_name}]: {e}")
        return None


def download_attachments(attachments: list[dict]) -> list[dict]:
    """
    공고의 첨부파일 목록을 순서대로 다운로드

    Args:
        attachments: naramarket.parse_attachments() 결과 리스트

    Returns:
        각 항목에 "local_path" 키 추가된 리스트
        (다운로드 실패 시 local_path = None)
    """
    result = []
    for att in attachments:
        local_path = download_file(att["file_url"], att["file_name"])
        result.append({**att, "local_path": local_path})
    return result
