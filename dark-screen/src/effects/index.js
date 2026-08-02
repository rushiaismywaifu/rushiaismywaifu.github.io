import { createStars }   from './stars.js';
import { createDust }    from './dust.js';
import { createBreathe } from './breathe.js';
import { createClock }   from './clock.js';
import { createRain }    from './rain.js';

export const MODES = Object.freeze([
  { id: 'black',   name: '純黑',  desc: '全黑，什麼都不顯示',   make: null },
  { id: 'stars',   name: '星空',  desc: '漂移的星點與流星',     make: createStars },
  { id: 'dust',    name: '塵埃',  desc: '浮動的微塵',           make: createDust },
  { id: 'breathe', name: '呼吸',  desc: '緩慢漲落的光暈',       make: createBreathe },
  { id: 'clock',   name: '時間',  desc: '只有 hh:mm:ss',        make: createClock },
  { id: 'rain',    name: '字雨',  desc: '墜落的字元',           make: createRain }
]);

export const MODE_MAP = new Map(
  MODES.map((m, i) => [m.id, Object.freeze({ ...m, index: i })])
);
