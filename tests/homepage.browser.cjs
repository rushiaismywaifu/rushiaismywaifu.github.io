// Uses the repository's existing Playwright dev dependency; no production build.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const requireBrowserTools = createRequire(path.resolve(__dirname, '../music-player/package.json'));
const { chromium, expect } = requireBrowserTools('@playwright/test');
const root = path.resolve(__dirname, '..');
let browser, server, baseURL;

before(async () => {
  const routes = {
    '/': ['index.html', 'text/html; charset=utf-8'],
    '/home.css': ['home.css', 'text/css'],
    '/assets/rushia-emblem.svg': ['assets/rushia-emblem.svg', 'image/svg+xml'],
    '/favicon.ico': ['favicon.ico', 'image/x-icon'],
  };
  server = http.createServer((req, res) => {
    const route = routes[req.url];
    if (!route) return res.writeHead(404).end();
    res.setHeader('Content-Type', route[1]);
    res.end(fs.readFileSync(path.join(root, route[0])));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  baseURL = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
});

after(async () => {
  if (browser) await browser.close();
  if (server) await new Promise(resolve => server.close(resolve));
});

async function openPage(options = {}) {
  const page = await browser.newPage(options);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  // All assets are local. Do not depend on production audio services.
  await page.route('**/*', route => route.request().url().startsWith(`${baseURL}/`)
    ? route.continue() : route.abort());
  await page.goto(baseURL);
  return { page, errors };
}

for (const width of [1440, 768, 390, 320]) {
  test(`garden layout, navigation and reduced motion at ${width}px`, async () => {
    const { page, errors } = await openPage({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
    try {
      await page.locator('.hero-art img').evaluate(img => img.decode());
      assert.equal(await page.locator('.hero-art img').evaluate(img => img.naturalWidth), 460);
      await expect(page.locator('#featured .card')).toHaveCount(8);
      await expect(page.locator('#ecosystem .card')).toHaveCount(8);
      const overflow = await page.evaluate(() => ({
        page: document.documentElement.scrollWidth > innerWidth,
        elements: [...document.querySelectorAll('nav, .hero-copy, .card, .lab-panel')]
          .filter(el => el.getBoundingClientRect().right > innerWidth + 1 || el.scrollWidth > el.clientWidth + 1)
          .map(el => el.className),
      }));
      assert.deepEqual(overflow, { page: false, elements: [] });
      assert.equal(await page.locator('.hero-art img').evaluate(img => getComputedStyle(img).animationName), 'none');
      await page.keyboard.press('Tab');
      await expect(page.locator('.skip-link')).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(page).toHaveURL(`${baseURL}/#main`);
      await page.locator('.nav-links a[href="#ecosystem"]').click();
      await expect(page).toHaveURL(`${baseURL}/#ecosystem`);
      const position = await page.evaluate(() => ({
        section: document.querySelector('#ecosystem').getBoundingClientRect().top,
        header: document.querySelector('.site-header').getBoundingClientRect().bottom,
      }));
      assert.ok(position.section >= position.header, 'Section title must not be hidden by sticky navigation');
      assert.deepEqual(errors, []);
    } finally {
      await page.close();
    }
  });
}

test('default theme uses the mint palette and gentle butterfly animation', async () => {
  const { page, errors } = await openPage({ reducedMotion: 'no-preference' });
  try {
    assert.equal(await page.locator('body').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(11, 18, 16)');
    assert.equal(await page.locator('.hero-art img').evaluate(el => getComputedStyle(el).animationName), 'butterfly-float');
    await expect(page.locator('.glow-cursor, .aurora')).toHaveCount(0);
    await expect(page.locator('#ayameAudio')).toHaveAttribute('controls', '');
    await expect(page.locator('#ayameAudio')).toHaveAttribute('preload', 'none');
    assert.deepEqual(errors, []);
  } finally {
    await page.close();
  }
});

test('lab retains audio and form controls without the removed short URL feature', async () => {
  const { page, errors } = await openPage({ reducedMotion: 'reduce' });
  try {
    await page.locator('.nav-links a[href="#lab"]').click();
    await expect(page).toHaveURL(`${baseURL}/#lab`);
    await expect(page.locator('#lab .lab-panel')).toHaveCount(2);
    await expect(page.locator('#ayameAudio')).toBeVisible();
    await expect(page.locator('#ayameAudio')).toHaveAttribute('controls', '');
    await expect(page.locator('#biliUrlInput, #genBtn, #shortUrlResult, .copy-btn')).toHaveCount(0);
    assert.doesNotMatch(await page.content(), /bilibili|b23\.tv|workers\.dev|generateShortUrl|fallbackCopyText/i);
    const input = page.getByRole('textbox', { name: '文字輸入框展示' });
    await input.fill('庭園的新靈感');
    await expect(input).toHaveValue('庭園的新靈感');
    const select = page.getByRole('combobox', { name: '主題配色展示' });
    await select.selectOption({ label: '選項 B：月光象牙' });
    await expect(select).toHaveValue('選項 B：月光象牙');
    await page.getByRole('button', { name: '測試按鈕' }).click();
    assert.deepEqual(errors, []);
  } finally {
    await page.close();
  }
});
