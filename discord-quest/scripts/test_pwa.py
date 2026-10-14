#!/usr/bin/env python3
"""Verify PWA metadata, cache isolation and offline navigation in Chromium."""

import argparse
import json
import struct
from pathlib import Path
from urllib.parse import urljoin, urlparse

from playwright.sync_api import expect, sync_playwright

from test_ui import route_remote


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", default="http://127.0.0.1:8765/discord-quest/")
    parser.add_argument("--browser-path", help="Optional Chromium executable")
    args = parser.parse_args()
    base = args.base_url.rstrip("/") + "/"
    errors = []

    with sync_playwright() as playwright:
        options = {"headless": True}
        if args.browser_path:
            options["executable_path"] = args.browser_path
        browser = playwright.chromium.launch(**options)
        try:
            context = browser.new_context()
            page = context.new_page()
            page.on("pageerror", lambda error: errors.append(str(error)))
            page.route("https://**/*", route_remote)

            # Seed caches before installing the worker, on an uncontrolled page.
            page.goto(urljoin(base, "assets/favicon.svg"))
            page.evaluate("""async () => {
                await caches.open('notes-v3');
                await caches.open('discord-quest-shell-obsolete');
            }""")
            page.goto(base)
            expect(page.locator("#grid")).to_be_visible()
            page.wait_for_function("navigator.serviceWorker.controller !== null")
            scope = page.evaluate("async () => (await navigator.serviceWorker.ready).scope")
            assert scope == base, scope

            manifest_url = urljoin(base, page.locator('link[rel="manifest"]').get_attribute("href"))
            response = context.request.get(manifest_url)
            assert response.ok
            manifest = response.json()
            for key in ("id", "start_url", "scope"):
                assert urljoin(manifest_url, manifest[key]) == base
            assert manifest["display"] == "standalone"
            assert manifest["theme_color"] == page.locator('meta[name="theme-color"]').get_attribute("content")
            assert {"192x192", "512x512", "any"} <= {icon["sizes"] for icon in manifest["icons"]}
            for icon in manifest["icons"]:
                response = context.request.get(urljoin(manifest_url, icon["src"]))
                assert response.ok
                if icon["type"] == "image/png":
                    body = response.body()
                    assert body[:8] == b"\x89PNG\r\n\x1a\n"
                    width, height = struct.unpack(">II", body[16:24])
                    assert f"{width}x{height}" == icon["sizes"]

            favicon = page.locator('link[rel="icon"]')
            assert favicon.get_attribute("type") == "image/svg+xml"
            assert favicon.get_attribute("href").endswith(".svg")
            apple = context.request.get(urljoin(base, page.locator('link[rel="apple-touch-icon"]').get_attribute("href")))
            assert apple.ok and struct.unpack(">II", apple.body()[16:24]) == (180, 180)

            cdp = context.new_cdp_session(page)
            cdp.send("Page.enable")
            assert not cdp.send("Page.getAppManifest")["errors"]
            install_errors = cdp.send("Page.getInstallabilityErrors")["installabilityErrors"]
            assert not install_errors, install_errors

            keys = page.evaluate("caches.keys()")
            assert "notes-v3" in keys, keys
            assert "discord-quest-shell-obsolete" not in keys, keys
            shell_caches = [key for key in keys if key.startswith("discord-quest-shell-")]
            assert len(shell_caches) == 1, keys
            cached = page.evaluate("""async name => {
                const cache = await caches.open(name);
                return (await cache.keys()).map(request => new URL(request.url).pathname);
            }""", shell_caches[0])
            app_dir = Path(__file__).resolve().parents[1]
            for folder, pattern in (("js", "*.js"), ("styles", "*.css"), ("assets", "*")):
                for asset in (app_dir / folder).glob(pattern):
                    assert urlparse(urljoin(base, asset.relative_to(app_dir).as_posix())).path in cached
            assert all(path.startswith(urlparse(base).path) for path in cached)

            # No remote fixtures while offline: actual fetch failures must trigger
            # the existing, clearly labeled demo-data fallback.
            page.unroute("https://**/*", route_remote)
            context.set_offline(True)
            for path in ("", "index.html", "?from=pwa-test", "index.html?from=pwa-test"):
                page.goto(urljoin(base, path))
                expect(page.locator("#grid")).to_be_visible()
                expect(page.locator("#resultsMeta")).to_contain_text("離線示範資料")
                assert page.locator(".card").count() > 0
                assert page.locator("body").evaluate("el => getComputedStyle(el).backgroundColor") == "rgb(49, 51, 56)"

            # Out-of-scope pages, unknown routes and POST requests must not get
            # an unrelated cached app shell response.
            outside = urljoin(base, "../index.html")
            for url, method in ((outside, "GET"), (urljoin(base, "missing-page"), "GET"), (urljoin(base, "index.html"), "POST")):
                assert page.evaluate("""async ({url, method}) => {
                    try { await fetch(url, {method}); return false; }
                    catch { return true; }
                }""", {"url": url, "method": method})
            assert not errors, errors
            print(json.dumps({"result": "passed", "checks": [
                "manifest and Chromium installability", "SVG favicon and PNG dimensions",
                "scoped worker and complete shell cache", "unrelated cache preservation",
                "old shell cleanup", "offline directory/index/query navigation",
                "labeled demo data", "out-of-scope and POST isolation", "no page errors",
            ]}, indent=2))
        finally:
            browser.close()


if __name__ == "__main__":
    main()
