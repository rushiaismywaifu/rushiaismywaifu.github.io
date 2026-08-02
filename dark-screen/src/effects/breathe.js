import { TAU } from '../utils.js';

const BLOBS = Object.freeze([
  { c: '201,162,39',  ax: 0.24, ay: 0.20, sx: 0.031, sy: 0.021, ph: 0,   r: 0.62, br: 0.055 },
  { c: '70,96,180',   ax: 0.28, ay: 0.24, sx: 0.023, sy: 0.029, ph: 2.1, r: 0.74, br: 0.049 },
  { c: '110,170,150', ax: 0.20, ay: 0.26, sx: 0.017, sy: 0.037, ph: 4.3, r: 0.55, br: 0.038 }
]);

export function createBreathe(ctx, state) {
  return {
    init() { /* 固定配置 */ },
    draw(t, _dt, w, h) {
      const { speed } = state;
      ctx.clearRect(0, 0, w, h);
      const base = Math.min(w, h);
      const tt = t * speed;
      ctx.globalCompositeOperation = 'lighter';
      for (const o of BLOBS) {
        const x = w / 2 + Math.sin(tt * o.sx + o.ph) * w * o.ax;
        const y = h / 2 + Math.cos(tt * o.sy + o.ph * 1.7) * h * o.ay;
        const puls = 0.85 + 0.15 * Math.sin(tt * 0.16 + o.ph);
        const r = base * o.r * puls;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0,   'rgba(' + o.c + ',' + (o.br * puls).toFixed(4) + ')');
        g.addColorStop(0.5, 'rgba(' + o.c + ',' + (o.br * 0.32).toFixed(4) + ')');
        g.addColorStop(1,   'rgba(' + o.c + ',0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, TAU);
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
    }
  };
}
