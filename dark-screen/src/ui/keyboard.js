import { MODES } from '../effects/index.js';

export function initKeyboard({ onMode, onToggleFullscreen }) {
  document.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key.toLowerCase();
    const num = Number(k);
    if (Number.isInteger(num) && num >= 1 && num <= MODES.length) {
      onMode(MODES[num - 1].id);
      e.preventDefault();
    } else if (k === 'f') {
      onToggleFullscreen();
      e.preventDefault();
    } else if (k === 'h') {
      document.body.classList.toggle('hidebar');
      e.preventDefault();
    } else if (k === 'escape') {
      document.body.classList.remove('hidebar');
    }
  });
}
