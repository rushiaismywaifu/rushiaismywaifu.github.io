import { rnd, TAU } from '../utils.js';

// 所有 Dust 實例共用同一份精靈圖，跨切換也不用重畫
let sharedSprite = null;
function buildSprite() {
  const c = document.createElement('canvas');
  c.width = c.height = 48;
  const g = c.getContext('2d');
  const rg = g.createRadialGradient(24, 24, 0, 24, 24, 24);
  rg.addColorStop(0,    'rgba(232,238,255,1)');
  rg.addColorStop(0.35, 'rgba(210,220,245,0.35)');
  rg.addColorStop(1,    'rgba(180,200,255,0)');
  g.fillStyle = rg;
  g.fillRect(0, 0, 48, 48);
  return c;
}

export function createDust(ctx, state) {
  const motes = [];

  return {
    init(w, h) {
      sharedSprite ??= buildSprite();
      const n = Math.min(200, Math.round(w * h / 16000));
      motes.length = 0;
      for (let i = 0; i < n; i++) {
        motes.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: rnd(2, 9),
          a: rnd(0.05, 0.2),
          vy: rnd(-9, -2),
          vx: rnd(-4, 4),
          p: Math.random() * TAU,
          sw: rnd(0.15, 0.5)
        });
      }
    },
    draw(t, dt, w, h) {
      const { speed } = state;
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < motes.length; i++) {
        const d = motes[i];
        d.y += d.vy * speed * dt;
        d.x += (d.vx + Math.sin(t * d.sw + d.p) * 6) * speed * dt;
        if (d.y < -20) { d.y = h + 20; d.x = Math.random() * w; }
        if (d.x < -20) d.x = w + 20;
        else if (d.x > w + 20) d.x = -20;
        ctx.globalAlpha = d.a * (0.6 + 0.4 * Math.sin(t * 0.7 + d.p));
        ctx.drawImage(sharedSprite, d.x - d.r, d.y - d.r, d.r * 2, d.r * 2);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
  };
}
