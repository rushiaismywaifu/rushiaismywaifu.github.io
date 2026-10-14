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
    '/ui-demo.css': ['ui-demo.css', 'text/css'],
    '/ui-demo.js': ['ui-demo.js', 'text/javascript'],
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
    await expect(select).toHaveValue('ivory');
    await expect(page.locator('#demoPreviewCard')).toHaveAttribute('data-theme', 'ivory');
    await page.getByRole('tab', { name: '03 互動回饋' }).click();
    await page.getByRole('button', { name: '測試按鈕' }).click();
    assert.deepEqual(errors, []);
  } finally {
    await page.close();
  }
});

test('playground text preview is safe and email validation stays local', async () => {
  const { page, errors } = await openPage({ reducedMotion: 'reduce' });
  try {
    await page.locator('#demoTitle').fill('<b>這是文字</b>');
    await expect(page.locator('#demoPreviewTitle')).toHaveText('<b>這是文字</b>');
    await expect(page.locator('#demoPreviewTitle b')).toHaveCount(0);
    await page.locator('#demoDescription').fill('新的靈感');
    await expect(page.locator('#demoCharCount')).toHaveText('4 / 120');
    await expect(page.locator('#demoPreviewDescription')).toHaveText('新的靈感');
    await page.locator('#demoTitle').fill('');
    await expect(page.locator('#demoPreviewTitle')).toHaveText('尚未命名的靈感');
    await page.locator('#demoValidate').click();
    await expect(page.locator('#demoEmail')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#demoValidation')).toContainText('請先輸入');
    await page.locator('#demoEmail').fill('invalid-email');
    await page.locator('#demoEmail').press('Enter');
    await expect(page.locator('#demoValidation')).toContainText('格式不正確');
    await page.locator('#demoEmail').fill('garden@example.com');
    await page.locator('#demoEmail').press('Enter');
    await expect(page.locator('#demoEmail')).toHaveAttribute('aria-invalid', 'false');
    await expect(page.locator('#demoValidation')).toContainText('格式正確');
    assert.equal(await page.evaluate(() => localStorage.length), 0);
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});

test('tabs support keyboard navigation and settings only affect the preview card', async () => {
  const { page, errors } = await openPage({ reducedMotion: 'reduce' });
  try {
    await page.locator('#demoTabInput').focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('#demoTabChoice')).toBeFocused();
    await expect(page.locator('#demoPanelInput')).toBeHidden();
    await expect(page.locator('#demoPanelChoice')).toBeVisible();
    await page.getByRole('switch', { name: '柔光效果' }).uncheck();
    await expect(page.locator('#demoPreviewCard')).toHaveAttribute('data-glow', 'false');
    await page.locator('#demoBadge').uncheck();
    await expect(page.locator('#demoPreviewBadge')).toBeHidden();
    await page.getByRole('radio', { name: '緊湊' }).check();
    await expect(page.locator('#demoPreviewCard')).toHaveAttribute('data-density', 'compact');
    await page.locator('#demoRadius').fill('24');
    await expect(page.locator('#demoRadiusValue')).toHaveText('24 px');
    await expect(page.locator('#demoPreviewCard')).toHaveCSS('border-radius', '24px');
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(11, 18, 16)');
    await page.locator('#demoTabChoice').focus();
    await page.keyboard.press('End');
    await expect(page.locator('#demoTabFeedback')).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('#demoTabInput')).toBeFocused();
    await page.keyboard.press('ArrowLeft');
    await expect(page.locator('#demoTabFeedback')).toBeFocused();
    await page.keyboard.press('Home');
    await expect(page.locator('#demoTabInput')).toBeFocused();
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});

test('dialog supports focus, Escape, cancel and confirmation; notifications can be dismissed', async () => {
  const { page, errors } = await openPage({ reducedMotion: 'reduce' });
  try {
    await page.locator('#demoTabFeedback').click();
    await page.locator('#demoDialogButton').click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.locator('#demoDialogCancel')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(page.locator('#demoDialogButton')).toBeFocused();
    await page.locator('#demoDialogButton').click();
    await page.locator('#demoDialogCancel').click();
    await expect(page.getByRole('dialog')).toBeHidden();
    await page.locator('#demoDialogButton').click();
    await page.locator('#demoDialogConfirm').click();
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(page.locator('#demoToastText')).toContainText('未儲存任何資料');
    await page.getByRole('button', { name: '關閉通知' }).click();
    await expect(page.locator('#demoToastText')).toBeEmpty();
    await page.locator('#demoToastButton').click();
    await expect(page.locator('#demoToastText')).toContainText('操作成功');
    await page.locator('#demoDetails summary').click();
    await expect(page.locator('#demoDetails')).toHaveAttribute('open', '');
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});

test('progress simulation completes, resets cancel timers, and reload does not retain inputs', async () => {
  const { page, errors } = await openPage({ reducedMotion: 'reduce' });
  try {
    await page.clock.install();
    await page.locator('#demoTitle').fill('暫時的筆記');
    await page.locator('#demoTabFeedback').click();
    await page.locator('#demoLoad').click();
    await expect(page.locator('#demoLoad')).toBeDisabled();
    await page.clock.runFor(2000);
    await expect(page.locator('#demoProgressValue')).toHaveText('100%');
    await expect(page.locator('#demoLoad')).toBeEnabled();
    await expect(page.locator('#demoLoadStatus')).toContainText('模擬完成');
    await page.locator('#demoLoad').click();
    await page.clock.runFor(400);
    await page.locator('#demoReset').click();
    await page.clock.runFor(3000);
    await expect(page.locator('#demoProgress')).toHaveJSProperty('value', 0);
    await expect(page.locator('#demoTitle')).toHaveValue('一點靈感，一點魔法');
    await expect(page.locator('#demoTheme')).toHaveValue('mint');
    await expect(page.locator('#demoEmail')).toHaveValue('');
    await expect(page.locator('#demoTabInput')).toHaveAttribute('aria-selected', 'true');
    await page.clock.runFor(3000);
    await expect(page.locator('#demoToastText')).toBeEmpty();
    await page.locator('#demoTitle').fill('重新整理會消失');
    await page.reload();
    await expect(page.locator('#demoTitle')).toHaveValue('一點靈感，一點魔法');
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
});

for (const width of [320, 390, 768, 1440]) {
  test(`all playground panels and dialog fit at ${width}px`, async () => {
    const { page, errors } = await openPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    try {
      for (const id of ['demoTabInput', 'demoTabChoice', 'demoTabFeedback']) {
        await page.locator(`#${id}`).click();
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        const overflow = await page.locator('#ui-showcase').evaluate(root => [...root.querySelectorAll('.demo-panel:not([hidden]), .demo-preview, .demo-preview-card')]
          .some(el => el.scrollWidth > el.clientWidth + 1));
        assert.equal(overflow, false);
      }
      await page.locator('#demoDialogButton').click();
      const bounds = await page.locator('#demoDialog').boundingBox();
      assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width);
      await page.getByRole('button', { name: '確認體驗' }).click();
      await expect(page.locator('#demoToastText')).toBeVisible();
      assert.deepEqual(errors, []);
    } finally { await page.close(); }
  });
}
