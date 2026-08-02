import { $ } from '../utils.js';

export function initFullscreen(canvas) {
  const btn = $('full');

  function toggle() {
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    } else {
      const el = document.documentElement;
      const fn = el.requestFullscreen || el.webkitRequestFullscreen;
      fn?.call(el);
    }
  }

  btn.addEventListener('click', toggle);
  canvas.addEventListener('dblclick', toggle);
  document.addEventListener('fullscreenchange', () => {
    btn.setAttribute('aria-pressed', String(!!document.fullscreenElement));
  });

  return { toggle };
}
