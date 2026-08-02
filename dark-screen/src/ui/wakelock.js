import { $ } from '../utils.js';

export function initWakeLock() {
  const btn = $('awake');
  const supported = 'wakeLock' in navigator;
  let lock = null, wantLock = true;

  if (!supported) {
    btn.disabled = true;
    btn.title = '此瀏覽器不支援防止休眠';
    wantLock = false;
  }

  async function apply() {
    if (!supported) return;
    if (wantLock && !lock) {
      try {
        const l = await navigator.wakeLock.request('screen');
        lock = l;
        btn.setAttribute('aria-pressed', 'true');
        l.addEventListener('release', () => {
          lock = null;
          if (!wantLock) btn.setAttribute('aria-pressed', 'false');
        });
      } catch {
        btn.setAttribute('aria-pressed', 'false');
      }
    } else if (!wantLock && lock) {
      try { await lock.release(); } catch {}
      lock = null;
      btn.setAttribute('aria-pressed', 'false');
    }
  }

  btn.addEventListener('click', () => { wantLock = !wantLock; apply(); });
  apply();

  return {
    reapply: apply,
    release: () => lock?.release().catch(() => {}),
    get wanted() { return wantLock; }
  };
}
