// Keep PWA setup independent of remote quest loading and unsupported browsers.
if ('serviceWorker' in navigator && window.isSecureContext) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(new URL('../sw.js', import.meta.url), {
      scope: new URL('../', import.meta.url).href,
      updateViaCache: 'none',
    }).catch(error => {
      console.warn('[Quest Explorer] 無法啟用離線功能：', error);
    });
  });
}
