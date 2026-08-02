import { $ } from './utils.js';
import { state } from './state.js';
import { MODE_MAP } from './effects/index.js';
import { createRenderer } from './renderer.js';
import { initControls }   from './ui/controls.js';
import { initFullscreen } from './ui/fullscreen.js';
import { initWakeLock }   from './ui/wakelock.js';
import { initIdle }       from './ui/idle.js';
import { initKeyboard }   from './ui/keyboard.js';
import { initHint }       from './ui/hint.js';
import { readHash, writeHash, onHashChange } from './hash.js';

const canvas   = $('stage');
const renderer = createRenderer(canvas, state);

// ---- 業務動作 ----
function render(id) {
  const def = MODE_MAP.get(id) ?? MODE_MAP.get('black');
  state.currentId = def.id;
  renderer.setEffect(def.make);
}
function commit(id) {
  state.committedId = id;
  render(id);
  controls.setActive(id);
  writeHash(state);
}

// ---- UI 綁定 ----
const controls = initControls({
  onCommit: commit,
  onPreview: (id) => { if (state.currentId !== id) render(id); },
  onPreviewEnd: () => { if (state.currentId !== state.committedId) render(state.committedId); },
  onBrightChange: (v) => { state.bright = v; renderer.setOpacity(v); writeHash(state); },
  onSpeedChange:  (v) => { state.speed  = v; writeHash(state); }
});
const fullscreen = initFullscreen(canvas);
const wakelock   = initWakeLock();

initIdle();
initKeyboard({ onMode: commit, onToggleFullscreen: fullscreen.toggle });
initHint();
onHashChange(() => commit(readHash(state)));

// ---- 生命週期 ----
window.addEventListener('resize', () => renderer.resize());
document.addEventListener('visibilitychange', () => {
  if (document.hidden) renderer.stop();
  else {
    if (renderer.hasEffect) renderer.start();
    if (wakelock.wanted) wakelock.reapply();
  }
});
window.addEventListener('pagehide', () => {
  wakelock.release();
  renderer.stop();
});

// ---- 啟動 ----
const initialId = readHash(state);
controls.setBright(state.bright);
controls.setSpeed(state.speed);
renderer.resize();
commit(initialId);
