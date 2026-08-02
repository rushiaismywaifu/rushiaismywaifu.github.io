import { clamp } from './utils.js';
import { MODE_MAP } from './effects/index.js';

let hashing = false;

export function readHash(state) {
  const q = new URLSearchParams(location.hash.slice(1));
  if (q.has('b')) state.bright = clamp((+q.get('b') || state.bright * 100) / 100, 0.05, 1);
  if (q.has('s')) state.speed  = clamp((+q.get('s') || state.speed  * 100) / 100, 0.2, 2);
  const id = q.get('m') || (state.reduce ? 'black' : 'stars');
  return MODE_MAP.has(id) ? id : 'black';
}

export function writeHash(state) {
  hashing = true;
  const params = new URLSearchParams({
    m: state.committedId,
    b: Math.round(state.bright * 100),
    s: Math.round(state.speed  * 100)
  });
  history.replaceState(null, '', '#' + params);
  queueMicrotask(() => { hashing = false; });
}

export function onHashChange(cb) {
  window.addEventListener('hashchange', () => { if (!hashing) cb(); });
}
