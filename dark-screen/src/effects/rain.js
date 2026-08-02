import { clamp, rnd, pick, COL } from '../utils.js';

const CHARS = (
  'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ' +
  '0123456789光影靜夜星塵息無聲'
).split('');

export function createRain(ctx, state) {
  const cols = [];
  let fs = 16, font = '';

  return {
    init(w, h) {
      ctx.clearRect(0, 0, w, h);
      fs = clamp(Math.round(w / 72), 12, 20);
      font = `400 ${fs}px ui-monospace,SFMono-Regular,Menlo,"PingFang TC",monospace`;
      const n = Math.ceil(w / fs);
      cols.length = 0;
      for (let i = 0; i < n; i++) {
        cols.push({
          y: -Math.random() * (h / fs) * 1.5,
          v: rnd(6, 15),
          last: -99,
          cur: pick(CHARS)
        });
      }
    },
    draw(_t, dt, w, h) {
      const { speed } = state;
      ctx.fillStyle = 'rgba(0,0,0,' + (1 - Math.pow(0.93, dt * 60)).toFixed(3) + ')';
      ctx.fillRect(0, 0, w, h);
      ctx.font = font;
      ctx.textBaseline = 'top';
      ctx.textAlign = 'left';

      const rows = h / fs;
      for (let i = 0; i < cols.length; i++) {
        const c = cols[i];
        c.y += c.v * speed * dt;
        const cell = Math.floor(c.y);
        if (cell !== c.last) {
          if (c.last >= 0 && c.last < rows) {
            ctx.fillStyle = 'rgba(' + COL.moss + ',0.55)';
            ctx.fillText(c.cur, i * fs, c.last * fs);
          }
          c.cur = pick(CHARS);
          c.last = cell;
          if (cell >= 0 && cell < rows) {
            ctx.fillStyle = 'rgba(222,238,230,0.92)';
            ctx.fillText(c.cur, i * fs, cell * fs);
          }
        }
        if (c.y > rows + rnd(0, rows * 0.7)) {
          c.y = -rnd(0, rows * 0.4);
          c.v = rnd(6, 15);
          c.last = -99;
        }
      }
    }
  };
}
