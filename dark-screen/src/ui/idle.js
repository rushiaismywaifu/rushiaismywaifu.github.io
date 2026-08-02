import { $ } from '../utils.js';

export function initIdle(timeout = 2600) {
  const bar = $('bar');
  let idleT = 0, overBar = false;

  bar.addEventListener('pointerenter', () => { overBar = true; });
  bar.addEventListener('pointerleave', () => { overBar = false; wake(); });

  function wake() {
    document.body.classList.remove('idle');
    clearTimeout(idleT);
    idleT = setTimeout(() => {
      if (overBar || bar.contains(document.activeElement)) return wake();
      document.body.classList.add('idle');
    }, timeout);
  }

  for (const ev of ['mousemove', 'mousedown', 'wheel', 'touchstart', 'keydown']) {
    window.addEventListener(ev, wake, { passive: true });
  }
  wake();

  return { wake };
}
