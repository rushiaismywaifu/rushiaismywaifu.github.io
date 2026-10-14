# Rushia My Beloved 🌸 (Personal Web & Utilities Hub)

> **網址**：[https://rushiaismywaifu.github.io](https://rushiaismywaifu.github.io)

這是一座基於 **GitHub Pages** 構建的個人主題網頁與前端實用小工具實驗室。專案整合了多種獨立的前端工具、影音播放器與小遊戲，並以 VTuber 主題風格進行視覺與彩蛋設計。

---

## 📌 功能模組與頁面盤點

### 🏠 1. 主頁面 (`/index.html`)
* **幽蝶庭園主題**：首頁採用露西婭靈感的墨黑、薄荷綠與象牙白，搭配自繪 SVG 蝴蝶、哥德拱框及襯線標題。樣式位於 `home.css`、裝飾位於 `assets/rushia-emblem.svg`，不影響各子專案。支援手機排版、鍵盤導覽與減少動態偏好；不依賴外部字型或圖片服務。
* **主頁面導航區塊**：快速前往各個前端子專案與獨立工具網頁（新分頁開啟）。
* **🧪 表單元件測試**：提供標準 HTML 各類輸入框、核取方塊、單選鈕、下拉選單及文字區域的樣式與互動測試。
* **🎧 Ayame 音訊播放器**：收錄百鬼綾目（Nakiri Ayame）經典可愛語音片段的即時播放器。

---

### 🛠️ 2. 實用工具集
* **🎮 Discord Quests 探索器 (`/discord-quest/`)**
  * 串接第三方 API，即時瀏覽與過濾 Discord 任務（進行中、即將開始、已結束），提供全球區域過濾、任務獎勵（Orbs / Nitro / 虛寶）詳情檢視與兌換資訊。
  * 支援 PWA 安裝、專屬 SVG favicon 與離線介面；離線時顯示明確標示的示範任務（不快取即時任務資料）。
* **🔑 帳號管理工具 (`/credentials/`)**
  * 基於 `CryptoJS` 的本地加密／解密帳密管理工具，資料僅保留於瀏覽器端，兼顧便利與隱私。
* **🔣 Base64 加解密工具 (`/base64/`)**
  * 採用賽博龐克（Cyberpunk）高科技科幻風格介面的 Base64 字串與檔案編解碼工具。
* **📝 極簡筆記本 PWA (`/minimalist-notes/`)**
  * 支援 Progressive Web App (PWA) 規範，內建 `Service Worker` 與 `manifest.json`，支援離線記錄與安裝至桌面。
* **🐦 FxEmbed 推文媒體檢視器 (`/fx-embed/`)**
  * 專為 X / Twitter 推文設計的媒體檢視器，利用 FixTweet/FxTwitter API 輕鬆解析並預覽推文中的高畫質圖片與影片。

---

### 🎮 3. 娛樂與影音
* **🎲 猜數字遊戲 (`/guess/`)**
  * 經典 1~100 / 1~1000 範圍終極密碼猜數字小遊戲，內建智能二分法推薦中點與勝利紙花慶祝特效。
* **🎵 音樂播放器 (`/music-player/`)**
  * 現代 Cyber-VTuber 音樂播放器！具備玻璃擬態 UI，內建 Web Audio API 動態頻譜視覺化特效，並**支援一鍵拖曳上傳與本地音檔極速播放**。
* **🌸 Ayame AI Cover (`/ayame/`)**
  * 結合 ASCII Art 視覺藝術與張韶涵《隱形的翅膀》Ayame AI Cover 語音演唱的彩蛋網頁。

---

### 🔗 4. 同帳號生態系連結
主頁「作者生態專案連結」收錄同帳號下、由其他儲存庫獨立維護的 GitHub Pages。全部使用完整網址，預覽本站時也能正確開啟外部專案。

| 專案 | 網頁 | 簡介 |
| --- | --- | --- |
| Agent AI | [agentai-landing](https://rushiaismywaifu.github.io/agentai-landing/) | 自主智慧體介紹、任務生命週期互動示範與導入 FAQ |
| Byse Studio | [byse-full-suite](https://rushiaismywaifu.github.io/byse-full-suite/) | 影片管理、上傳與播放器產生器；提供示範模式，真實帳號需設定連線 |
| 櫻花演算 | [reaction-diffusion-wasm](https://rushiaismywaifu.github.io/reaction-diffusion-wasm/) | Gray-Scott 反應擴散模擬與 WASM / JS 效能比較 |
| About Me | [aboutme](https://rushiaismywaifu.github.io/aboutme/) | 個人介紹與主題網站 |
| Project-1 | [project-1](https://rushiaismywaifu.github.io/project-1/) | HTML / CSS 練習 |
| PageTest | [PageTest](https://rushiaismywaifu.github.io/PageTest/) | 網頁測試與前端實驗 |
| UI Shigure | [ui_shigure](https://rushiaismywaifu.github.io/ui_shigure/) | 時雨羽衣主題頁面 |
| Time Is | [timeis](https://rushiaismywaifu.github.io/timeis/) | 時鐘、倒數計時與鬧鐘 |

其他程式庫可由 [完整儲存庫清單](https://github.com/rushiaismywaifu?tab=repositories) 瀏覽，不將尚未發布 Pages 的專案當作線上頁面。

維護入口時，先用 GitHub API 確認公開儲存庫的 `has_pages` 與 Pages 設定中的 `html_url`、發布狀態，再同步更新 `index.html` 與本表格；本站不在瀏覽器端動態呼叫 GitHub API。

首頁連結回歸測試（Python 標準函式庫，無需額外安裝）：

```sh
python3 -m unittest discover -s tests
```

主頁瀏覽器測試共用音樂播放器已有的 Playwright 開發依賴（正式網站仍為純靜態）：

```sh
npm ci --prefix music-player
cd music-player && npx playwright install chromium && cd ..
node --test tests/homepage.browser.cjs
```

可用 `CHROMIUM_EXECUTABLE_PATH` 指定已安裝的 Chromium。測試涵蓋 1440 / 768 / 390 / 320px 排版、入口數量、SVG 載入、鍵盤與錨點導覽、減少動態偏好，以及互動實驗室保留的音訊與表單元件、已移除短網址功能的回歸檢查，不呼叫外部音訊服務。

---

## 📂 專案目錄結構

```text
rushiaismywaifu.github.io/
├── index.html                  # 幽蝶庭園首頁（導航、表單、語音）
├── home.css                    # 首頁專屬露西婭主題
├── assets/rushia-emblem.svg     # 自繪哥德蝴蝶裝飾
├── 404.html                    # 自訂 404 頁面（GitHub Pages 自動套用）
├── robots.txt / sitemap.xml    # 搜尋引擎索引設定
├── favicon.ico                 # 網站圖示
├── image.png / d.png           # OG 分享與視覺素材
├── README.md                   # 專案說明文件
├── discord-quest.html          # 🔄 向後相容轉址 (指向 /discord-quest/)
├── ayame.html / base64.html / FxEmbed.html  # 🔄 向後相容轉址
│
├── ayame/                      # 🌸 Ayame AI Cover 頁面
│   └── index.html
├── base64/                     # 🔣 Base64 賽博龐克加解密工具
│   └── index.html
├── credentials/                # 🔑 本地帳號密碼管理工具
│   └── index.html
├── discord-quest/              # 🎮 Discord Quests 探索器
│   └── index.html
├── fx-embed/                   # 🐦 FxEmbed X/Twitter 推文檢視器
│   └── index.html
├── guess/                      # 🎲 猜數字小遊戲
│   └── index.html
├── minimalist-notes/           # 📝 極簡筆記本 (PWA)
│   ├── index.html
│   ├── sw.js
│   ├── manifest.json
│   └── assets/
└── music-player/               # 🎵 Cyber-VTuber 音樂播放器
    ├── index.html
    ├── script.js
    └── styles.css
```

---
*Powered by Rushia My Beloved 🦋*
