"""
캐치테이블 time-slots 수집 워커 (병렬 버전).

Playwright 다중 탭으로 식당별 time-slots를 병렬 수집 → DB 캐시.

사용법:
  python scripts/catchtable-timeslots-worker.py [--restaurants 50] [--workers 5] [--headless]

프로덕션:
  0 * * * * python3 scripts/catchtable-timeslots-worker.py --restaurants 50 --workers 5 --headless
"""

import asyncio
import json
import sqlite3
import sys
import time as time_mod
from datetime import datetime, timedelta
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent
COOKIES_FILE = PROJECT_ROOT / ".catchtable-cookies.json"
DB_PATH = PROJECT_ROOT / "prisma" / "dev.db"
CT_BASE = "https://app.catchtable.co.kr"


def get_restaurants_to_scan(limit: int = 50) -> list[dict]:
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute("""
        SELECT r.id, r.nameKor, r.catchtableAlias, cc.shopRef
        FROM Restaurant r
        LEFT JOIN CatchtableCache cc ON cc.restaurantId = r.id
        WHERE r.catchtableMatched = 1
          AND r.catchtableAlias IS NOT NULL
          AND cc.onlineYn = 'Y'
        ORDER BY r.id
        LIMIT ?
    """, (limit,))
    rows = cur.fetchall()
    conn.close()
    return [dict(row) for row in rows]


def save_time_slots(restaurant_id: int, date: str, persons: int, slots: list[dict]):
    conn = sqlite3.connect(str(DB_PATH))
    cur = conn.cursor()
    cur.execute("DELETE FROM DaySlotCache WHERE restaurantId = ? AND date = ?",
                (restaurant_id, date))

    available_times = [s["time"] for s in slots if s.get("available")]
    status = "AVAILABLE" if available_times else "CLOSED"

    cur.execute("""
        INSERT OR REPLACE INTO DaySlotCache
        (restaurantId, date, availableStatus, availablePersons, benefit, fetchedAt, ttl)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        restaurant_id, date, status,
        json.dumps([persons]),
        json.dumps({"timeSlots": slots}),
        datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S.000Z"),
        3600,
    ))
    conn.commit()
    conn.close()


def parse_time_slots_response(data: dict) -> list[dict]:
    slots = []
    time_data = data.get("data", data)
    if not isinstance(time_data, dict):
        return slots

    time_slot_map = time_data.get("timeSlotMap", {})
    if time_slot_map and isinstance(time_slot_map, dict):
        for time_key, slot_info in sorted(time_slot_map.items()):
            if not isinstance(slot_info, dict):
                continue
            time_str = slot_info.get("time", time_key)
            if len(time_str) == 4 and time_str.isdigit():
                time_str = f"{time_str[:2]}:{time_str[2:]}"
            slots.append({
                "time": time_str,
                "available": bool(slot_info.get("availableYn", False)),
                "date": slot_info.get("date"),
                "benefit": slot_info.get("benefitLabel"),
            })
        return slots

    items = time_data.get("timeSlots") or time_data.get("slots") or []
    for item in items:
        if isinstance(item, dict):
            time_str = item.get("visitHhmi") or item.get("time") or ""
            if len(time_str) == 4 and time_str.isdigit():
                time_str = f"{time_str[:2]}:{time_str[2:]}"
            slots.append({
                "time": time_str,
                "available": bool(item.get("isAvailable", item.get("availableYn", True))),
                "benefit": item.get("benefitLabel"),
            })
    return slots


async def scrape_single(context, alias: str, restaurant_id: int, persons: int) -> dict:
    """단일 식당 time-slots 수집 (최소 대기, 응답 인터셉트)."""
    result = {"id": restaurant_id, "alias": alias, "slots": {}, "error": None}
    captured = []

    async def on_response(response):
        if "time-slot" in response.url and response.status == 200:
            try:
                body = await response.json()
                captured.append(body)
            except:
                pass

    page = await context.new_page()
    page.on("response", on_response)

    try:
        await page.goto(f"{CT_BASE}/ct/shop/{alias}", wait_until="commit", timeout=8000)

        # 예약하기 버튼 — 나타나면 바로 클릭
        try:
            btn = page.locator('text=예약하기').first
            await btn.wait_for(state="visible", timeout=3000)
            await btn.click()
        except:
            result["error"] = "no_booking_btn"
            return result

        # 확인 팝업 (있으면 바로 클릭, 없어도 OK)
        try:
            confirm = page.locator('button:has-text("확인")').first
            await confirm.wait_for(state="visible", timeout=1500)
            await confirm.click()
        except:
            pass

        # time-slots 응답 대기 (최대 5초)
        for _ in range(10):
            if captured:
                break
            await page.wait_for_timeout(500)

        if captured:
            slots = parse_time_slots_response(captured[-1])
            today = datetime.now().strftime("%Y-%m-%d")
            result["slots"][today] = slots

    except Exception as e:
        result["error"] = str(e)
    finally:
        await page.close()

    return result


async def worker(context, queue: asyncio.Queue, results: list, persons: int, worker_id: int):
    """워커: 큐에서 식당을 꺼내서 처리."""
    while True:
        try:
            restaurant = queue.get_nowait()
        except asyncio.QueueEmpty:
            break

        alias = restaurant["catchtableAlias"]
        rid = restaurant["id"]
        name = restaurant["nameKor"]

        start = time_mod.time()
        result = await scrape_single(context, alias, rid, persons)
        elapsed = time_mod.time() - start

        if result["slots"]:
            total = sum(len(s) for s in result["slots"].values())
            for date, slots in result["slots"].items():
                save_time_slots(rid, date, persons, slots)
            print(f"  ✅ {name} — {total}개 슬롯 ({elapsed:.1f}s)")
        elif result["error"]:
            print(f"  ⚠️ {name} — {result['error']} ({elapsed:.1f}s)")
        else:
            print(f"  ⚠️ {name} — 슬롯 없음 ({elapsed:.1f}s)")

        results.append(result)
        queue.task_done()


async def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--restaurants", type=int, default=50)
    parser.add_argument("--workers", type=int, default=5, help="병렬 탭 수")
    parser.add_argument("--headless", action="store_true")
    parser.add_argument("--persons", type=int, default=2)
    args = parser.parse_args()

    if not COOKIES_FILE.exists():
        print("❌ .catchtable-cookies.json 없음. catchtable-auth.py 먼저 실행하세요.")
        sys.exit(1)

    restaurants = get_restaurants_to_scan(args.restaurants)
    if not restaurants:
        print("❌ 스캔할 식당 없음")
        sys.exit(1)

    print(f"🔍 time-slots 병렬 수집: {len(restaurants)}곳, {args.workers}탭 동시, {args.persons}명")
    print(f"   headless={args.headless}\n")

    start_time = time_mod.time()

    from playwright.async_api import async_playwright

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=args.headless)
        context = await browser.new_context(
            storage_state=str(COOKIES_FILE),
            viewport={"width": 390, "height": 844},
        )

        # 큐에 식당 넣기
        queue: asyncio.Queue = asyncio.Queue()
        for r in restaurants:
            queue.put_nowait(r)

        # 워커 병렬 실행
        results: list = []
        workers = [
            asyncio.create_task(worker(context, queue, results, args.persons, i))
            for i in range(min(args.workers, len(restaurants)))
        ]
        await asyncio.gather(*workers)

        await browser.close()

    elapsed = time_mod.time() - start_time
    success = sum(1 for r in results if r["slots"])
    failed = len(results) - success

    print(f"\n✅ 완료: {success}성공 / {failed}실패 — 총 {elapsed:.1f}초 ({elapsed/len(restaurants):.1f}초/식당)")


if __name__ == "__main__":
    asyncio.run(main())
