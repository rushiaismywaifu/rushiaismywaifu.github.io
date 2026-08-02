import { $ } from '../utils.js';
import { MODES } from '../effects/index.js';

export function initControls(handlers) {
  const { onCommit, onPreview, onPreviewEnd, onBrightChange, onSpeedChange } = handlers;

  const modesEl = $('modes');
  modesEl.style.display = 'flex';

  const btns = MODES.map((m, i) => {
    const b = Object.assign(document.createElement('button'), {
      className: 'm', type: 'button', textContent: m.name
    });
    b.dataset.id = m.id;
    b.setAttribute('aria-pressed', 'false');
    b.title = `${m.desc}（${i + 1}）`;

    b.addEventListener('click', () => onCommit(m.id));
    b.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') onPreview(m.id); });
    b.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') onPreviewEnd(); });
    b.addEventListener('focus', () => onPreview(m.id));
    b.addEventListener('blur',  () => onPreviewEnd());

    modesEl.appendChild(b);
    return b;
  });

  const brightEl = $('bright');
  const speedEl  = $('speed');
  brightEl.addEventListener('input', () => onBrightChange(brightEl.value / 100));
  speedEl .addEventListener('input', () => onSpeedChange (speedEl .value / 100));

  return {
    setActive(id) {
      for (const b of btns) b.setAttribute('aria-pressed', String(b.dataset.id === id));
    },
    setBright(v) { brightEl.value = Math.round(v * 100); },
    setSpeed (v) { speedEl .value = Math.round(v * 100); }
  };
}
