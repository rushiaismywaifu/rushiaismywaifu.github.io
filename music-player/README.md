# Music Player

純靜態播放器，部署不需要 npm 或建置步驟。可播放預設線上歌曲，也可選取或拖曳本地音檔。

專屬分頁圖示為 `favicon.svg`：深色圓角底、霓虹青耳機與粉紅音符，採用播放器既有配色，不依賴外部圖片或字型。

## 播放與跨域注意事項

- 音訊會透過 Web Audio API 提供頻譜；必須在設定 `src` **之前**設定 `audio.crossOrigin = "anonymous"`，否則跨域音訊可能在進度正常前進時仍被瀏覽器強制靜音。
- 線上音檔的伺服器也必須回傳允許本站的 `Access-Control-Allow-Origin` 標頭。無法連線、CORS 被拒或音檔無法解碼時，播放器會顯示提示；可改播本地檔案。
- 不支援 Web Audio 或頻譜初始化失敗時，保留一般音訊播放。瀏覽器限制播放時，依畫面提示再按一次播放。
- 本地檔案使用 Blob URL，不會上傳至伺服器；重新整理後須重新選取。

## 回歸測試

需要 Node.js 20 以上版本：

```sh
cd music-player
npm ci
npx playwright install chromium
npm test
```

Linux 若缺少瀏覽器系統套件，可改用 `npx playwright install --with-deps chromium`。
已有 Chromium 時可指定 `CHROMIUM_EXECUTABLE_PATH=/path/to/chromium npm test`。

測試伺服器只監聽本機的 4173、4174 連接埠，請確保未被占用。測試以兩個不同 origin 和即時產生的 PCM WAV 重現跨域載入，不會存入大型音檔或請求外部歌曲。除了驗證 UI，也直接讀取真實 Chromium 的 `AnalyserNode`，確認音訊訊號非零，防止「顯示播放但無聲」再次發生。

涵蓋跨域播放、暫停與恢復、音量／靜音、本地音檔、清單移除、載入中取消與切歌、網路／解碼失敗後恢復、Web Audio 降級、AudioContext 恢復失敗與單曲循環。
