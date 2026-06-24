"""
캐치테이블 자동 로그인 → 세션 쿠키 갱신 스크립트.

사용법:
  1. 최초 1회: 브라우저 뜸 → 카카오/네이버로 수동 로그인 → 쿠키 저장됨
  2. 이후: 저장된 쿠키로 자동 세션 유지 → 만료 시 자동 재로그인

의존성:
  pip install playwright
  playwright install chromium

프로덕션:
  cron으로 12시간마다 실행 → 세션 만료 전 갱신
  0 */12 * * * cd /path/to/project && /path/to/venv/bin/python scripts/catchtable-auth.py
"""

import asyncio
import json
import os
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent
ENV_FILE = PROJECT_ROOT / ".env.local"
COOKIE_STORE = PROJECT_ROOT / ".catchtable-cookies.json"
CT_URL = "https://app.catchtable.co.kr"


async def get_session_cookie() -> str | None:
    """Playwright로 캐치테이블 세션 쿠키를 획득."""
    from playwright.async_api import async_playwright

    async with async_playwright() as p:
        # 저장된 쿠키가 있으면 재사용 시도
        context_options = {
            "viewport": {"width": 390, "height": 844},
            "user_agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
        }

        if COOKIE_STORE.exists():
            context_options["storage_state"] = str(COOKIE_STORE)
            print("📦 저장된 쿠키로 세션 복원 시도...")
            headless = True
        else:
            print("🔐 최초 로그인 필요 — 브라우저가 열립니다. 로그인해주세요.")
            headless = False

        browser = await p.chromium.launch(headless=headless)
        context = await browser.new_context(**context_options)
        page = await context.new_page()

        await page.goto(CT_URL, wait_until="domcontentloaded")
        await page.wait_for_timeout(2000)

        # 현재 쿠키에서 x-ct-a 확인
        cookies = await context.cookies()
        ct_cookie = next((c for c in cookies if c["name"] == "x-ct-a"), None)

        if ct_cookie and ct_cookie.get("value"):
            print(f"✅ 세션 유효 — x-ct-a: {ct_cookie['value'][:20]}...")
            await context.storage_state(path=str(COOKIE_STORE))
            await browser.close()
            return ct_cookie["value"]

        # 쿠키 없음 → 로그인 필요
        if headless:
            print("⚠️ 세션 만료 — 브라우저 열어서 재로그인합니다.")
            await browser.close()
            # headless=False로 재시도
            browser = await p.chromium.launch(headless=False)
            context = await browser.new_context(
                viewport={"width": 390, "height": 844},
                user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
            )
            page = await context.new_page()
            await page.goto(CT_URL, wait_until="domcontentloaded")

        # 로그인 대기 (최대 5분)
        print("⏳ 로그인 완료를 기다리는 중... (최대 5분)")
        for _ in range(300):
            await page.wait_for_timeout(1000)
            cookies = await context.cookies()
            ct_cookie = next((c for c in cookies if c["name"] == "x-ct-a"), None)
            if ct_cookie and ct_cookie.get("value"):
                print(f"✅ 로그인 성공! x-ct-a: {ct_cookie['value'][:20]}...")
                await context.storage_state(path=str(COOKIE_STORE))
                await browser.close()
                return ct_cookie["value"]

        print("❌ 타임아웃 — 로그인하지 못했습니다.")
        await browser.close()
        return None


def update_env_file(cookie_value: str) -> None:
    """CT_SESSION_COOKIE 값을 .env.local에 업데이트."""
    if not ENV_FILE.exists():
        ENV_FILE.write_text(f'CT_SESSION_COOKIE="{cookie_value}"\n')
        print(f"📝 .env.local 생성됨")
        return

    lines = ENV_FILE.read_text().splitlines()
    updated = False
    new_lines = []

    for line in lines:
        if line.startswith("CT_SESSION_COOKIE"):
            new_lines.append(f'CT_SESSION_COOKIE="{cookie_value}"')
            updated = True
        else:
            new_lines.append(line)

    if not updated:
        new_lines.append(f'CT_SESSION_COOKIE="{cookie_value}"')

    ENV_FILE.write_text("\n".join(new_lines) + "\n")
    print(f"📝 .env.local 업데이트 완료")


async def main():
    print("🔄 캐치테이블 세션 쿠키 갱신 시작\n")

    cookie = await get_session_cookie()

    if cookie:
        update_env_file(cookie)
        print(f"\n✅ 완료! CT_SESSION_COOKIE가 .env.local에 저장됨")
        print(f"   → time-slots API (시간대별 예약 조회) 사용 가능")
    else:
        print(f"\n❌ 실패 — 수동으로 쿠키를 설정해주세요")
        print(f"   1. https://app.catchtable.co.kr 로그인")
        print(f"   2. 개발자도구 → Application → Cookies → x-ct-a 값 복사")
        print(f'   3. .env.local에 CT_SESSION_COOKIE="복사한값" 추가')


if __name__ == "__main__":
    asyncio.run(main())
