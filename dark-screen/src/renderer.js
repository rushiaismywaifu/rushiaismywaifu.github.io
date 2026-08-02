// 負責畫布尺寸、RAF 迴圈、切換效果。不知道任何 UI 事件。
export function createRenderer(canvas, state) {
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, DPR = 1;
  let current = null;
  let raf = 0, last = 0;

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    current?.init?.(W, H);
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    current?.draw(now / 1000, dt, W, H);
  }

  function start() {
    if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
  }
  function stop() {
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
  }

  function setEffect(factory) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    current = factory ? factory(ctx, state) : null;
    current?.init?.(W, H);
    if (current) start(); else stop();
    canvas.style.opacity = current ? state.bright : 0;
  }

  function setOpacity(o) {
    if (current) canvas.style.opacity = o;
  }

  return {
    resize, start, stop, setEffect, setOpacity,
    get hasEffect() { return !!current; }
  };
}
