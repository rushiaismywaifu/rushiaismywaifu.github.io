const { test, expect } = require('@playwright/test');
const { tone } = require('./tone.cjs');
const wav = tone();

// Observe the actual browser media element and analyser without replacing them.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const NativeAudio = window.Audio;
    window.Audio = function (...args) {
      const audio = new NativeAudio(...args);
      window.testAudio = audio;
      return audio;
    };
    const createAnalyser = AudioContext.prototype.createAnalyser;
    AudioContext.prototype.createAnalyser = function () {
      window.testAnalyser = createAnalyser.call(this);
      return window.testAnalyser;
    };
    window.unhandled = [];
    window.addEventListener('unhandledrejection', e => window.unhandled.push(String(e.reason)));
  });
});

test.afterEach(async ({ page }) => {
  expect(await page.evaluate(() => window.unhandled)).toEqual([]);
});

async function expectSignal(page) {
  await expect.poll(() => page.evaluate(() => {
    const analyser = window.testAnalyser;
    if (!analyser) return 0;
    const values = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(values);
    return Math.max(...values);
  })).toBeGreaterThan(0);
}

test('cross-origin track produces a real Web Audio signal, with pause/resume and volume', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#totalTime')).toHaveText('0:12');
  expect(await page.evaluate(() => testAudio.volume)).toBeCloseTo(0.8);
  await page.locator('#btnPlayPause').click();
  await expectSignal(page);
  expect(await page.evaluate(() => testAudio.crossOrigin)).toBe('anonymous');
  await expect(page.locator('#btnPlayPause')).toHaveText('⏸️');
  await expect.poll(() => page.evaluate(() => testAudio.currentTime)).toBeGreaterThan(0);
  await page.locator('#btnPlayPause').click();
  expect(await page.evaluate(() => testAudio.paused)).toBe(true);
  await expect(page.locator('#albumArt')).not.toHaveClass(/playing/);
  await page.locator('#btnPlayPause').click();
  await expectSignal(page);
  await page.locator('#btnMute').click();
  expect(await page.evaluate(() => testAudio.muted)).toBe(true);
  await page.locator('#volumeSlider').fill('0.3');
  expect(await page.evaluate(() => testAudio.volume)).toBeCloseTo(0.3);
  expect(await page.evaluate(() => testAudio.muted)).toBe(false);
});

test('local files play, filenames stay text, and removing tracks keeps the correct selection', async ({ page }) => {
  await page.goto('/');
  await page.locator('#fileInput').setInputFiles([
    { name: 'Artist - <b>song</b>.wav', mimeType: '', buffer: wav },
    { name: 'second.wav', mimeType: 'audio/wav', buffer: wav },
  ]);
  await expect(page.locator('#trackCount')).toHaveText('3 首');
  await expect(page.locator('#trackTitle')).toHaveText('<b>song</b>');
  await expect(page.locator('.item-title b')).toHaveCount(0);
  await expectSignal(page);
  expect(await page.evaluate(() => testAudio.src.startsWith('blob:'))).toBe(true);
  expect(await page.locator('#fileInput').inputValue()).toBe('');
  const src = await page.evaluate(() => testAudio.src);
  await page.locator('.item-remove').first().click({ force: true });
  expect(await page.evaluate(() => testAudio.src)).toBe(src);
  await expect(page.locator('.playlist-item').first()).toHaveClass(/playing/);
  await page.locator('.item-remove').first().click({ force: true });
  await expect(page.locator('#trackTitle')).toHaveText('second');
  await expect(page.locator('#btnPlayPause')).toHaveText('⏸️');
  await expectSignal(page);
});

test('decode failure resets UI, displays an error, and next track recovers', async ({ page }) => {
  await page.goto('/');
  await page.locator('#btnPlayPause').click();
  await expectSignal(page);
  await page.locator('#fileInput').setInputFiles({ name: 'broken.wav', mimeType: 'audio/wav', buffer: Buffer.from('not audio') });
  await expect(page.locator('#playbackStatus')).toContainText('無法播放');
  await expect(page.locator('#btnPlayPause')).toHaveText('▶️');
  await expect(page.locator('#albumArt')).not.toHaveClass(/playing/);
  await page.locator('#btnNext').click();
  await expectSignal(page);
  await expect(page.locator('#btnPlayPause')).toHaveText('⏸️');
  await expect(page.locator('#playbackStatus')).toBeEmpty();
});

test('network failure is visible and a local upload can still play', async ({ page }) => {
  await page.route('http://127.0.0.1:4174/**', route => route.abort());
  await page.goto('/');
  await expect(page.locator('#playbackStatus')).toContainText('無法播放');
  await page.locator('#fileInput').setInputFiles({ name: 'local.wav', mimeType: 'audio/wav', buffer: wav });
  await expectSignal(page);
  await expect(page.locator('#playbackStatus')).toBeEmpty();
});

test('pending playback can be cancelled without stale state or an error', async ({ page }) => {
  await page.route('http://127.0.0.1:4174/**', async route => {
    await new Promise(resolve => setTimeout(resolve, 700));
    await route.continue();
  });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.locator('#btnPlayPause').click();
  await page.locator('#btnPlayPause').click();
  await expect(page.locator('#totalTime')).toHaveText('0:12');
  expect(await page.evaluate(() => testAudio.paused)).toBe(true);
  await expect(page.locator('#btnPlayPause')).toHaveText('▶️');
  await expect(page.locator('#playbackStatus')).toBeEmpty();
  await page.locator('#btnPlayPause').click();
  await expectSignal(page);
  await page.locator('#btnNext').click();
  await page.locator('#btnPrev').click();
  await expect(page.locator('#btnPlayPause')).toHaveText('⏸️');
  await expect(page.locator('#playbackStatus')).toBeEmpty();
});

for (const failure of ['unavailable', 'initialization']) {
  test(`ordinary playback works when Web Audio is ${failure}`, async ({ page }) => {
    await page.addInitScript(failure => {
      if (failure === 'unavailable') {
        window.AudioContext = undefined;
        window.webkitAudioContext = undefined;
      } else {
        AudioContext.prototype.createAnalyser = () => { throw new Error('No analyser'); };
      }
    }, failure);
    await page.goto('/');
    await page.locator('#btnPlayPause').click();
    await expect.poll(() => page.evaluate(() => testAudio.currentTime)).toBeGreaterThan(0);
    await expect(page.locator('#btnPlayPause')).toHaveText('⏸️');
    await expect(page.locator('#playbackStatus')).toBeEmpty();
  });
}

test('a rejected AudioContext resume is handled and can be retried', async ({ page }) => {
  await page.addInitScript(() => {
    const NativeContext = window.AudioContext;
    window.AudioContext = class extends NativeContext {
      constructor() {
        super();
        this.suspend();
      }
    };
    const resume = AudioContext.prototype.resume;
    let first = true;
    AudioContext.prototype.resume = function () {
      if (first) {
        first = false;
        return Promise.reject(new DOMException('blocked', 'NotAllowedError'));
      }
      return resume.call(this);
    };
  });
  await page.goto('/');
  await page.locator('#btnPlayPause').click();
  await expect(page.locator('#playbackStatus')).toContainText('再按一次');
  await expect(page.locator('#btnPlayPause')).toHaveText('▶️');
  expect(await page.evaluate(() => testAudio.paused)).toBe(true);
  await page.locator('#btnPlayPause').click();
  await expectSignal(page);
  await expect(page.locator('#playbackStatus')).toBeEmpty();
});

test('seeking and repeat-one replay the current track', async ({ page }) => {
  await page.goto('/');
  await page.locator('#btnPlayPause').click();
  await expectSignal(page);
  await page.locator('#progressBar').click({ position: { x: 100, y: 3 } });
  await expect.poll(() => page.evaluate(() => testAudio.currentTime)).toBeGreaterThan(1);
  await page.locator('#btnMode').click();
  await expect(page.locator('#btnMode')).toHaveText('🔂');
  await page.evaluate(() => { testAudio.currentTime = 11.8; });
  await expect.poll(() => page.evaluate(() => testAudio.currentTime)).toBeLessThan(2);
  await expect(page.locator('#btnPlayPause')).toHaveText('⏸️');
});


test('player uses its own SVG favicon and the browser can decode it', async ({ page }) => {
  await page.goto('/');
  const icon = page.locator('link[rel="icon"]');
  await expect(icon).toHaveAttribute('href', 'favicon.svg');
  await expect(icon).toHaveAttribute('type', 'image/svg+xml');
  const response = await page.request.get('/favicon.svg');
  expect(response.ok()).toBe(true);
  expect(response.headers()['content-type']).toBe('image/svg+xml');
  const size = await page.evaluate(async () => {
    const image = new Image();
    image.src = document.querySelector('link[rel="icon"]').href;
    await image.decode();
    return [image.naturalWidth, image.naturalHeight];
  });
  expect(size).toEqual([64, 64]);
});
