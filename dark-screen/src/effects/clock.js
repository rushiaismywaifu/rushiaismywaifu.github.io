import { COL } from '../utils.js';

export function createClock(ctx, state) {
  const stack = getComputedStyle(document.body).fontFamily;
  let digitW = 0, colonW = 0;

  return {
    init(w, h) {
      ctx.clearRect(0, 0, w, h);
      // 基準級數量測，只跑一次
      ctx.font = '200 100px ' + stack;
      digitW = 0;
      for (let i = 0; i < 10; i++) digitW = Math.max(digitW, ctx.measureText(String(i)).width);
      colonW = ctx.measureText(':').width;
    },
    draw(t, _dt, w, h) {
      const { speed, reduce } = state;
      ctx.clearRect(0, 0, w, h);
      if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
      ctx.textBaseline = 'alphabetic';
      ctx.textAlign = 'left';

      const now = new Date();
      const txt = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

      const TRACK = 6;
      const ratio = (digitW * 6 + colonW * 2 + TRACK * 7) / 100;
      const size = Math.max(36, Math.min(h * 0.30, w * 0.74 / ratio));
      const k = size / 100;
      const DW = digitW * k, CW = colonW * k, TR = TRACK * k;
      const total = DW * 6 + CW * 2 + TR * 7;

      ctx.font = '200 ' + size + 'px ' + stack;
      const tt = t * speed * (reduce ? 0.02 : 0.05);
      const cx = w / 2 + Math.sin(tt) * Math.max(0, w / 2 - total / 2 - 28);
      const cy = h / 2 + Math.sin(tt * 0.61 + 1.3) * Math.max(0, h / 2 - size * 0.75);
      let x = cx - total / 2;
      const y = cy + size * 0.35;

      for (let i = 0; i < txt.length; i++) {
        const ch = txt[i];
        const colon = ch === ':';
        const cell = colon ? CW : DW;
        ctx.fillStyle = colon
          ? 'rgba(' + COL.moon + ',0.30)'
          : 'rgba(' + COL.moon + ',0.86)';
        ctx.fillText(ch, x + (cell - ctx.measureText(ch).width) / 2, y);
        x += cell + TR;
      }
    }
  };
}
