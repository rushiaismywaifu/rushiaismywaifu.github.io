// 全域執行時狀態，效果與 UI 皆讀取此物件
export const state = {
  speed: 1,
  bright: 0.8,
  reduce: matchMedia('(prefers-reduced-motion: reduce)').matches,
  currentId: 'black',     // 目前正在畫的（含預覽）
  committedId: 'black'    // 使用者實際選定的
};
