import { rnd, clamp, TAU, COL } from '../utils.js';

export function createStars(ctx, state) {
  const stars = [];
  let shoot = null, nextShoot = 0;

  return {
    init(w, h) {
      const n = Math.min(520, Math.round(w * h / 6200));
      stars.length = 0;
      for (let i = 0; i < n; i++) {
        stars.push({
          x: Math.random() * w,
          y: Math.random() * h,
          z: Math.random(),
          p: Math.random() * TAU,
          c: i % 7 === 0 ? '200,215,255'
            : i % 11 === 0 ? '255,232,205'
            : COL.moon
        });
      }
      shoot = null;
      nextShoot = rnd(8, 26);
    },
    draw(t, dt, w, h) {
      const { speed, reduce } = state;
      ctx.clearRect(0, 0, w, h);

      for (let i = 0; i < stars.length; i++) {
        const st = stars[i];
        st.x -= (1.5 + st.z * 7) * speed * dt;
        if (st.x < -2) { st.x = w + 2; st.y = Math.random() * h; }
        const a = (0.18 + st.z * 0.55) * (0.72 + 0.28 * Math.sin(t * (0.5 + st.z * 0.9) + st.p));
        ctx.fillStyle = 'rgba(' + st.c + ',' + a.toFixed(3) + ')';
        ctx.beginPath();
        ctx.arc(st.x, st.y, 0.35 + st.z * 1.15, 0, TAU);
        ctx.fill();
      }

      if (reduce) return;

      nextShoot -= dt;
      if (!shoot && nextShoot <= 0) {
        shoot = { x: rnd(w * 0.15, w * 0.95), y: rnd(0, h * 0.5), a: rnd(2.5, 3.0), life: 1 };
        nextShoot = rnd(14, 40);
      }
      if (shoot) {
        shoot.life -= dt * 0.9;
        const v = 620 * speed * dt;
        shoot.x += Math.cos(shoot.a) * v;
        shoot.y += Math.sin(shoot.a) * v;
        const tx = shoot.x - Math.cos(shoot.a) * 110;
        const ty = shoot.y - Math.sin(shoot.a) * 110;
        const la = clamp(shoot.life, 0, 1);
        const g = ctx.createLinearGradient(shoot.x, shoot.y, tx, ty);
        g.addColorStop(0, 'rgba(' + COL.moon + ',' + (0.85 * la).toFixed(3) + ')');
        g.addColorStop(1, 'rgba(' + COL.moon + ',0)');
        ctx.strokeStyle = g;
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(shoot.x, shoot.y);
        ctx.lineTo(tx, ty);
        ctx.stroke();
        if (shoot.life <= 0 || shoot.x > w + 150 || shoot.y > h + 150) shoot = null;
      }
    }
  };
}
