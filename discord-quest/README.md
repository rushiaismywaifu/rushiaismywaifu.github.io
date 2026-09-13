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

## 本機開發

ES modules 需要透過 HTTP 開啟，不能直接雙擊 `index.html`。請在專案根目錄啟動任一靜態伺服器，再瀏覽 `/discord-quest/`。

網站沒有 API token 或建置步驟；修改檔案後重新整理瀏覽器即可。

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
