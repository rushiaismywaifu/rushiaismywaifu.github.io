import { $ } from '../utils.js';

export function initHint() {
  const hint = $('hint');
  if (!hint) return;
  setTimeout(() => hint.classList.add('gone'), 5200);
  setTimeout(() => hint.remove(), 6500);
}
