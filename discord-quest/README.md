# Discord Quest Explorer

這個目錄是一個不需要建置工具的靜態網站，可直接由 GitHub Pages 發佈。

## 檔案分工

- `index.html`：頁面語意結構、篩選控制項與詳細資料容器。
- `styles/tokens.css`：色彩、字級、間距與動畫變數。
- `styles/layout.css`：桌面版面、側欄、內容網格及詳細資料抽屜。
- `styles/components.css`：按鈕、篩選器、卡片、狀態與詳細內容元件。
- `styles/responsive.css`：行動版篩選抽屜、單欄卡片及小螢幕調整。
- `js/config.js`：公開資料來源、顯示名稱、排除清單及離線示範資料。
- `js/utils.js`：任務分類、地區判斷、日期、網址與輸出安全工具。
- `js/data.js`：下載、驗證、正規化與合併公開任務資料。
- `js/view.js`：卡片、計數、空狀態及任務詳情的畫面輸出。
- `js/app.js`：應用程式狀態、篩選、排序、事件與初始化流程。

## 本機開發

ES modules 需要透過 HTTP 開啟，不能直接雙擊 `index.html`。請在專案根目錄啟動任一靜態伺服器，再瀏覽 `/discord-quest/`。

網站沒有 API token 或建置步驟；修改檔案後重新整理瀏覽器即可。
