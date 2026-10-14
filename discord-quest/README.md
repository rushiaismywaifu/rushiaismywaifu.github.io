# Discord Quest Explorer

這個目錄是一個不需要建置工具的靜態網站，可直接由 GitHub Pages 發佈。

## 檔案分工

- `index.html`：頁面語意結構、篩選控制項與詳細資料容器。
- `styles/tokens.css`：色彩、字級、間距與動畫變數。
- `styles/layout.css`：桌面版面、側欄、內容網格及詳細資料抽屜。
- `styles/components.css`：按鈕、篩選器、卡片、狀態與詳細內容元件。
- `styles/responsive.css`：行動版篩選抽屜、單欄卡片及小螢幕調整。
- `js/config.js`：公開資料來源、中英文國家名稱備援表、排除清單及離線示範資料。
- `js/utils.js`：任務分類、地區判斷、日期、網址與輸出安全工具。
- `js/data.js`：下載、驗證、正規化與合併公開任務資料。
- `js/view.js`：卡片、計數、空狀態及任務詳情的畫面輸出。
- `js/app.js`：應用程式狀態、篩選、排序、事件與初始化流程。
- `js/pwa.js`：在安全連線且瀏覽器支援時註冊 Service Worker。
- `manifest.webmanifest`：PWA 名稱、啟動路徑、作用範圍、色彩與安裝圖示。
- `sw.js`：版本化的應用程式介面快取，僅處理此工具的入口與指定靜態資源。
- `assets/favicon.svg`：沿用品牌遊戲手把的 SVG favicon；同目錄的 192／512px PNG 及 180px Apple touch icon 由此圖轉出，以相容不同平台。

## 本機開發

ES modules 需要透過 HTTP 開啟，不能直接雙擊 `index.html`。請在專案根目錄啟動任一靜態伺服器，再瀏覽 `/discord-quest/`。

網站沒有 API token 或建置步驟；修改檔案後重新整理瀏覽器即可。

## PWA 安裝與離線使用

- 部署至 GitHub Pages（HTTPS）後，支援安裝的瀏覽器可透過網址列或選單的「安裝應用程式」加入桌面；iPhone／iPad 可在 Safari 分享選單選擇「加入主畫面」。是否顯示安裝入口由瀏覽器決定。
- 安裝後以獨立視窗開啟 `/discord-quest/`，manifest 與 Service Worker 的作用範圍均限於此目錄，不接管網站首頁或其他工具。
- 首次需連線開啟並等候 Service Worker 完成快取。之後離線也能載入介面、搜尋與篩選；**不快取公開任務 API 或遠端圖片／影片**。資料來源無法連線時，沿用現有的示範任務，畫面會標示「目前顯示離線示範資料」，不代表真實任務或參與資格。重新連線後可按「重新整理」取得最新資料。
- 使用版本化的 cache-first 介面快取。修改 HTML、CSS、JS、manifest 或圖示時，需同步遞增 `sw.js` 的 `CACHE_NAME` 版本；新增介面資源時也須更新 `ASSETS`。新版完成下載後會等待舊分頁／應用程式視窗全數關閉，再於下一次開啟時啟用，避免混用不同版本。
- 啟用新版時僅刪除 `discord-quest-shell-` 前綴的舊快取，保留其他工具的快取。不支援 Service Worker 的瀏覽器仍可使用一般網頁功能。
- 本機測試 Service Worker 需使用 `http://localhost`、`http://127.0.0.1` 或 HTTPS；一般區域網路 HTTP 位址不屬於安全環境。

## 介面與地區資訊

- Discord 深色介面與 Blurple 重點色，支援桌面及手機版面。
- 摘要按鈕可快速查看進行中、即將開始或可賺取 Orbs 的任務；篩選標籤可逐一移除。
- 按 `/` 聚焦搜尋，按 `Esc` 關閉詳情或手機篩選面板；手機可按「查看篩選結果」收起面板。
- 地區選單、卡片及詳情顯示國旗、繁體中文國名、英文國名與來源代碼，例如 `🇹🇼 台灣 Taiwan · TW`。卡片先顯示部分地區，詳情列出完整清單並區分限定與排除地區。
- 國名優先使用 `Intl.DisplayNames`，瀏覽器不支援時使用內建備援表。`UK` 與 `GB` 共用英國旗幟及篩選邏輯，未知代碼顯示白旗及「未知地區」。

## 瀏覽器驗證

首次使用先安裝 Chromium：

```sh
uv run --with playwright playwright install chromium
```

在此目錄啟動靜態伺服器，並於另一個終端執行測試：

```sh
uv run python -m http.server 8765 --bind 127.0.0.1
uv run --with playwright scripts/test_ui.py --base-url http://127.0.0.1:8765
```

`scripts/test_ui.py` 使用固定的模擬資料驗證篩選、國名、排除條件、鍵盤操作，以及 320–1440px 的響應式版面，並將截圖存至 `/tmp`（可用 `--screenshots` 指定目錄）。測試不依賴公開資料來源，也不代表已驗證即時 API 相容性。


### PWA 驗證

沿用上述在 `discord-quest/` 目錄啟動的伺服器，執行：

```sh
uv run --with playwright scripts/test_pwa.py --base-url http://127.0.0.1:8765/
```

若伺服器從儲存庫根目錄啟動，請改用 `--base-url http://127.0.0.1:8765/discord-quest/`。可用 `--browser-path` 指定本機 Chromium 執行檔。

測試涵蓋 manifest 與 Chromium 安裝條件、SVG favicon、PNG 圖示尺寸、完整介面快取、快取清理隔離，以及離線時的目錄／`index.html`／查詢參數入口與示範資料標示。公開 API 使用模擬資料；離線階段移除模擬並切斷網路。原生安裝介面與 iOS「加入主畫面」仍需在實際裝置上手動驗證。
