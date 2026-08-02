export const $ = (id) => document.getElementById(id);
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const rnd = (a, b) => a + Math.random() * (b - a);
export const pick = (arr) => arr[Math.random() * arr.length | 0];
export const TAU = Math.PI * 2;

export const COL = Object.freeze({
  moon: '230,233,239',
  gold: '201,162,39',
  moss: '111,168,140'
});
