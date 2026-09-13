#!/usr/bin/env python3
"""Deterministic Playwright smoke checks against a running static web server.

Install Playwright and Chromium, serve the repository, then run:
    uv run --with playwright scripts/test_ui.py --base-url http://127.0.0.1:8765

All remote data and artwork are test fixtures; these checks do not establish
compatibility or availability of the live public data sources.
"""

import argparse
from datetime import datetime, timezone
import html
import json
from pathlib import Path
import re
from urllib.parse import urlparse

from playwright.sync_api import expect, sync_playwright


NOW = datetime(2026, 9, 13, 4, 0, tzinfo=timezone.utc)
MALFORMED_REGION = '<img src=x onerror="window.__regionUnsafe=1">'


def quest(identifier, game, title, color, *, status="live", reward=4, task="PLAY_ON_DESKTOP"):
    start, end = {
        "live": ("2026-09-10T00:00:00Z", "2026-09-25T00:00:00Z"),
        "upcoming": ("2026-10-01T00:00:00Z", "2026-10-15T00:00:00Z"),
        "ended": ("2026-08-01T00:00:00Z", "2026-08-15T00:00:00Z"),
    }[status]
    reward_name = {4: "500 Discord Orbs", 3: "星光旅人 · 頭像裝飾", 2: "限定遊戲道具包", 5: "Discord Nitro 試用"}[reward]
    return {
        "id": identifier,
        "config": {
            "application": {"name": game, "link": "https://example.test/game"},
            "messages": {"quest_name": title, "game_title": game, "game_publisher": "Quest Studio"},
            "assets": {"hero": f"https://quest-art.test/{identifier}.svg"},
            "rewards": [{"name": reward_name, "type": reward, **({"orb_quantity": 500} if reward == 4 else {})}],
            "task_config_v2": {"tasks": {task: {"type": task, "target": 900}}},
            "starts_at": start,
            "expires_at": end,
            "colors": {"primary": color},
        },
    }


QUESTS = [
    quest("valorant", "VALORANT", "組隊出擊，解鎖你的下一場勝利", "#f46778"),
    quest("starrail", "Honkai: Star Rail", "登上星穹列車，展開全新旅程", "#9692ff", reward=3, task="WATCH_VIDEO"),
    quest("apex", "Apex Legends", "集結傳奇，挑戰巔峰競技場", "#fa9d53", reward=2),
    quest("minecraft", "Minecraft", "建造屬於你的冒險世界", "#8dce91"),
    quest("league", "League of Legends", "召喚師峽谷的全新挑戰", "#62cbdc", reward=2),
    quest("unknown", "Deep Space", "探索未知星域的神秘訊號", "#b9a0dd", reward=3),
    quest("future", "Cyberpunk 2077", "夜城正在等你：新一季即將登場", "#e9dd60", status="upcoming"),
    quest("ended", "Final Fantasy XIV", "艾奧傑亞的夏日回憶", "#88b7e6", status="ended", reward=5),
]
QUESTS[0]["config"]["assets"]["quest_bar_hero"] = "https://quest-art.test/valorant.webm"
QUESTS[5]["config"]["task_config_v2"] = {
    "join_operator": "FUTURE_OPERATOR",
    "tasks": {"FUTURE_TASK": {"type": "FUTURE_TASK", "target": 900}},
}
RESTRICTIONS = {"quests": [
    {"id": "valorant", "show_age_gate": True, "regions": ["TW", "US", "UK", "BR"]},
    {"id": "starrail", "is_global": True, "regions": []},
    {"id": "apex", "is_global": True, "regions": {"exclude": ["JP"]}},
    {"id": "league", "regions": ["BR"]},
    {"id": "unknown", "regions": ["ZZ", MALFORMED_REGION]},
    {"id": "future", "regions": {"include": ["TW", "US", "UK", "BR"], "exclude": ["US", "JP"]}},
    {"id": "ended", "regions": ["JP"]},
]}


def artwork(record):
    """Original inline vector fixture, never downloaded or shipped as site art."""
    config = record["config"]
    color = config["colors"]["primary"]
    game = html.escape(config["messages"]["game_title"])
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="960" height="480" viewBox="0 0 960 480">
      <defs><linearGradient id="bg"><stop stop-color="#151824"/><stop offset="1" stop-color="{color}"/></linearGradient>
      <radialGradient id="glow"><stop stop-color="{color}" stop-opacity=".8"/><stop offset="1" stop-color="{color}" stop-opacity="0"/></radialGradient></defs>
      <rect width="960" height="480" fill="url(#bg)"/>
      <circle cx="770" cy="90" r="290" fill="url(#glow)"/>
      <path d="M530 480 735 85 940 480Z" fill="#121523" opacity=".45"/>
      <path d="M640 480 813 170 1010 480Z" fill="#fff" opacity=".13"/>
      <circle cx="740" cy="225" r="99" fill="none" stroke="#fff" stroke-width="2" opacity=".25"/>
      <path d="M0 373H960M0 420H960M530 0V480M580 0V480" stroke="#fff" opacity=".06"/>
      <text x="48" y="162" fill="#fff" font-family="sans-serif" font-size="16" letter-spacing="8" opacity=".7">DISCOVER YOUR NEXT QUEST</text>
      <text x="44" y="238" fill="#fff" font-family="sans-serif" font-weight="700" font-size="48">{game}</text>
      <rect x="48" y="274" width="52" height="5" rx="2" fill="{color}"/>
      <text x="48" y="318" fill="#fff" font-family="sans-serif" font-size="20" opacity=".65">PLAY · EXPLORE · EARN</text>
    </svg>'''


def route_remote(route):
    url = route.request.url
    if "gist.githubusercontent.com" in url:
        route.fulfill(json=RESTRICTIONS)
    elif "raw.githubusercontent.com" in url:
        route.fulfill(json=QUESTS if "quests-01.json" in url else [])
    elif urlparse(url).hostname == "quest-art.test":
        if urlparse(url).path.endswith(".webm"):
            route.fulfill(status=404)
            return
        identifier = Path(urlparse(url).path).stem
        record = next(record for record in QUESTS if record["id"] == identifier)
        route.fulfill(content_type="image/svg+xml", body=artwork(record))
    else:
        route.fulfill(status=204)


def ids(page):
    return set(page.locator("#grid .card").evaluate_all("cards => cards.map(card => card.dataset.id)"))


def expect_ids(page, expected):
    expect(page.locator("#grid .card")).to_have_count(len(expected))
    assert ids(page) == set(expected), (ids(page), set(expected))


def assert_no_overflow(page, label):
    page.evaluate("() => Promise.all(document.getAnimations().map(animation => animation.finished.catch(() => {})))")
    result = page.evaluate("""() => ({
      viewport: innerWidth,
      document: document.documentElement.scrollWidth,
      body: document.body.scrollWidth,
      offenders: [...document.querySelectorAll('.main, .content, .card, .country-chip, .search-bar')]
        .filter(el => {const r = el.getBoundingClientRect(); return !el.closest('[aria-hidden="true"]') && getComputedStyle(el).visibility === 'visible' && r.width && (r.right > innerWidth + 1 || r.left < -1);})
        .map(el => ({tag: el.tagName, className: el.className, rect: el.getBoundingClientRect().toJSON()}))
    })""")
    assert result["document"] <= result["viewport"] + 1, (label, result)
    assert result["body"] <= result["viewport"] + 1, (label, result)
    assert not result["offenders"], (label, result)


def countries(page):
    expected = {
        "TW": ("🇹🇼", "台灣", "Taiwan"),
        "US": ("🇺🇸", "美國", "United States"),
        "UK": ("🇬🇧", "英國", "United Kingdom"),
        "BR": ("🇧🇷", "巴西", "Brazil"),
        "JP": ("🇯🇵", "日本", "Japan"),
    }
    for code, parts in expected.items():
        option = page.locator("#regionSel option").filter(has_text=re.compile(rf"\b{code}\b"))
        expect(option).to_have_count(1)
        for part in parts:
            expect(option).to_contain_text(part)
    expect(page.locator("#regionSel option").filter(has_text="ZZ")).to_have_count(1)
    expect(page.locator('.card[data-id="valorant"] .regions')).to_contain_text("🇹🇼")
    expect(page.locator('.card[data-id="valorant"] .regions')).to_contain_text("台灣")
    expect(page.locator('.card[data-id="valorant"] .regions')).to_contain_text("Taiwan")
    expect(page.locator('.card[data-id="valorant"] .regions')).to_contain_text("TW")
    expect(page.locator('.card[data-id="apex"] .regions')).to_contain_text("日本")
    assert page.evaluate("window.__regionUnsafe") is None
    assert page.locator(".regions img, #regionSel img, .country-chip img").count() == 0


def desktop_checks(page, output):
    expect_ids(page, ["valorant", "starrail", "apex", "minecraft", "league", "unknown"])
    expect(page.locator("#summaryLive")).to_have_text("6")
    expect(page.locator("#summaryUpcoming")).to_have_text("1")
    expect(page.locator("#summaryOrbs")).to_have_text("2")
    countries(page)
    hero = page.locator('.card[data-id="valorant"] .hero > img').first
    expect(hero).to_have_attribute("src", "https://quest-art.test/valorant.svg")
    expect(hero).to_be_visible()
    assert hero.evaluate("image => image.complete && image.naturalWidth > 0")
    page.screenshot(path=str(output / "quest-desktop.png"), full_page=True)

    page.locator('[data-quick-filter="upcoming"]').click()
    expect_ids(page, ["future"])
    page.locator('[data-quick-filter="orbs"]').click()
    expect_ids(page, ["valorant", "minecraft"])
    page.locator('[data-clear-filter="reward"]').click()
    expect_ids(page, ["valorant", "starrail", "apex", "minecraft", "league", "unknown"])
    page.locator('[data-clear-filter="filter"]').click()
    expect_ids(page, [record["id"] for record in QUESTS])

    page.locator('[data-task="watch"]').click()
    expect_ids(page, ["starrail"])
    page.locator('[data-clear-filter="task"]').click()
    page.locator("#regionSel").select_option("TW")
    expect_ids(page, ["valorant", "starrail", "apex", "minecraft", "future"])
    page.locator('[data-clear-filter="region"]').click()
    page.locator("#ageSel").select_option("age")
    expect_ids(page, ["valorant"])
    page.locator('[data-clear-filter="age"]').click()

    page.locator("#searchInput").fill("APEX")
    expect_ids(page, ["apex"])
    page.locator('[data-clear-filter="search"]').click()
    expect(page.locator("#searchInput")).to_have_value("")
    page.locator("#searchInput").fill("Minecraft")
    expect_ids(page, ["minecraft"])
    page.locator("#searchClear").click()
    expect(page.locator("#searchInput")).to_be_focused()
    expect_ids(page, [record["id"] for record in QUESTS])
    page.locator("#searchInput").press_sequentially("Honkai: Star Rail", delay=40)
    expect(page.locator("#searchInput")).to_have_value("Honkai: Star Rail")
    expect_ids(page, ["starrail"])
    page.locator("#searchClear").click()

    page.locator("#regionSel").select_option("JP")
    expect_ids(page, ["starrail", "minecraft", "ended"])
    page.locator("#regionSel").select_option("US")
    expect_ids(page, ["valorant", "starrail", "apex", "minecraft"])
    page.locator("#regionSel").select_option("UK")
    expect_ids(page, ["valorant", "starrail", "apex", "minecraft", "future"])
    page.locator("#searchInput").fill("no quest matches this")
    expect(page.locator("#grid")).to_be_hidden()
    expect(page.locator("#state")).to_contain_text("找不到")
    page.locator("#state [data-reset-filters]").click()
    expect_ids(page, [record["id"] for record in QUESTS])
    expect(page.locator("#searchInput")).to_have_value("")
    expect(page.locator("#regionSel")).to_have_value("")
    page.locator("#questResults").focus()
    page.keyboard.press("/")
    expect(page.locator("#searchInput")).to_be_focused()

    card = page.locator('.card[data-id="future"]')
    card.focus()
    page.keyboard.press("Enter")
    expect(page.locator("#modal")).to_have_attribute("aria-hidden", "false")
    expect(page.locator(".modal-close")).to_be_focused()
    expect(page.locator("#modal .country-chip")).to_have_count(6)
    for part in ("🇹🇼", "台灣", "Taiwan", "TW", "🇺🇸", "United States", "US", "英國", "United Kingdom", "UK", "巴西", "Brazil", "BR", "日本", "Japan", "JP"):
        expect(page.locator("#modalCard")).to_contain_text(part)
    expect(page.locator("#modalCard")).to_contain_text("限定參與地區")
    expect(page.locator("#modalCard")).to_contain_text("無法參與的地區")
    page.screenshot(path=str(output / "quest-detail.png"))
    page.locator("#modal .region-details").scroll_into_view_if_needed()
    page.screenshot(path=str(output / "quest-regions.png"))
    page.keyboard.press("Shift+Tab")
    assert page.evaluate("document.getElementById('modalCard').contains(document.activeElement)")
    page.keyboard.press("Escape")
    expect(page.locator("#modal")).to_have_attribute("aria-hidden", "true")
    expect(card).to_be_focused()

    page.locator('.card[data-id="unknown"]').click()
    expect(page.locator("#modalCard")).to_contain_text("ZZ")
    expect(page.locator("#modalCard")).to_contain_text("請依 Discord 說明完成")
    expect(page.locator("#modalCard")).to_contain_text("請依 Discord 中的任務說明完成")
    assert page.locator("#modalCard .country-chip img").count() == 0
    assert page.evaluate("window.__regionUnsafe") is None
    page.keyboard.press("Escape")

    page.locator('[data-quick-filter="live"]').click()
    for width in (1440, 900, 768, 390, 320):
        page.set_viewport_size({"width": width, "height": 960})
        page.evaluate("document.fonts.ready")
        assert_no_overflow(page, f"results at {width}px")


def mobile_checks(page, output):
    page.set_viewport_size({"width": 390, "height": 844})
    page.locator("#filterToggle").click()
    expect(page.locator("#filterToggle")).to_have_attribute("aria-expanded", "true")
    expect(page.locator("#sidebarClose")).to_be_focused()
    expect(page.locator(".main")).to_have_attribute("inert", "")
    expect(page.locator("#sidebar")).to_have_attribute("role", "dialog")
    page.locator("#sidebar .brand").focus()
    page.keyboard.press("Shift+Tab")
    assert page.evaluate("document.getElementById('sidebar').contains(document.activeElement)")
    page.keyboard.press("Tab")
    expect(page.locator("#sidebar .brand")).to_be_focused()
    page.locator('[data-filter="all"]').click()
    page.locator("#regionSel").select_option("TW")
    page.locator("#applyFilters").click()
    expect(page.locator("#filterToggle")).to_have_attribute("aria-expanded", "false")
    expect(page.locator("#filterToggle")).to_be_focused()
    expect(page.locator("#sidebar")).to_have_attribute("inert", "")
    expect_ids(page, ["valorant", "starrail", "apex", "minecraft", "future"])
    assert_no_overflow(page, "mobile filtered results")
    page.screenshot(path=str(output / "quest-mobile.png"), full_page=True)
    page.locator("#filterToggle").click()
    page.keyboard.press("Escape")
    expect(page.locator("#filterToggle")).to_be_focused()
    expect(page.locator("#filterToggle")).to_have_attribute("aria-expanded", "false")

    page.locator('.card[data-id="valorant"]').click()
    expect(page.locator(".modal-close")).to_be_focused()
    expect(page.locator("#modal .modal-hero > video")).to_be_hidden()
    hero = page.locator("#modal .modal-hero > img")
    expect(hero).to_be_visible()
    expect(hero).to_have_attribute("src", "https://quest-art.test/valorant.svg")
    assert hero.evaluate("image => image.complete && image.naturalWidth > 0")
    assert_no_overflow(page, "mobile detail")
    page.screenshot(path=str(output / "quest-mobile-detail.png"))
    page.set_viewport_size({"width": 320, "height": 720})
    assert_no_overflow(page, "320px detail")
    page.keyboard.press("Escape")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", default="http://127.0.0.1:8765")
    parser.add_argument("--screenshots", type=Path, default=Path("/tmp"))
    args = parser.parse_args()
    args.screenshots.mkdir(parents=True, exist_ok=True)
    errors = []
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        try:
            page = browser.new_page(viewport={"width": 1440, "height": 960}, locale="zh-TW", reduced_motion="reduce")
            page.clock.set_fixed_time(NOW)
            page.on("pageerror", lambda error: errors.append(str(error)))
            page.route("https://**/*", route_remote)
            page.route("**/favicon.ico", lambda route: route.fulfill(status=204))
            page.goto(args.base_url)
            page.wait_for_load_state("networkidle")
            desktop_checks(page, args.screenshots)
            mobile_checks(page, args.screenshots)
            assert not errors, errors
            print(json.dumps({"result": "passed", "checks": ["country names and flags", "include/exclude semantics", "unknown/malformed regions", "video artwork fallback", "unknown task descriptions", "quick and individual filters", "typed search spaces, clear and empty reset", "modal keyboard and focus", "mobile filter apply", "1440/900/768/390/320px overflow", "no page errors"], "screenshots": [str(output) for output in (args.screenshots / name for name in ("quest-desktop.png", "quest-detail.png", "quest-regions.png", "quest-mobile.png", "quest-mobile-detail.png"))]}, ensure_ascii=False, indent=2))
        except Exception:
            if "page" in locals():
                page.screenshot(path=str(args.screenshots / "quest-failure.png"), full_page=True)
                print(json.dumps({"page_errors": errors, "visible_ids": sorted(ids(page)), "active_element": page.evaluate("({tag: document.activeElement?.tagName, id: document.activeElement?.id, classes: document.activeElement?.className})")}, ensure_ascii=False))
            raise
        finally:
            browser.close()


if __name__ == "__main__":
    main()
