# Rushia My Beloved 🌸 (Personal Web & Utilities Hub)

> **網址**：[https://rushiaismywaifu.github.io](https://rushiaismywaifu.github.io)

這是一座基於 **GitHub Pages** 構建的個人主題網頁與前端實用小工具實驗室。專案整合了多種獨立的前端工具、影音播放器、小遊戲以及 Twitter/X 媒體提取元件，並以 VTuber 主題風格進行視覺與彩蛋設計。

---

## 📌 功能模組與頁面盤點

### 🏠 1. 主頁面 (`/index.html`)
* **主頁面導航區塊**：快速前往各個前端子專案與獨立工具網頁（新分頁開啟）。
* **🧪 表單元件測試**：提供標準 HTML 各類輸入框、核取方塊、單選鈕、下拉選單及文字區域的樣式與互動測試。
* **🎧 Ayame 音訊播放器**：收錄百鬼綾目（Nakiri Ayame）經典可愛語音片段的即時播放器。
* **🔗 Bilibili 短網址產生器**：能自動過濾與清理 Bilibili 網址追蹤參數，或轉換生成 `b23.tv` 短網址。

---

### 🛠️ 2. 實用工具集
* **🔑 帳號管理工具 (`/credentials/`)**
  * 基於 `CryptoJS` 的本地加密／解密帳密管理工具，資料僅保留於瀏覽器端，兼顧便利與隱私。
* **🔣 Base64 加解密工具 (`/base64/`)**
  * 採用賽博龐克（Cyberpunk）高科技科幻風格介面的 Base64 字串與檔案編解碼工具。
* **📝 極簡筆記本 PWA (`/minimalist-notes/`)**
  * 支援 Progressive Web App (PWA) 規範，內建 `Service Worker` 與 `manifest.json`，支援離線記錄與安裝至桌面。

---

### 🐦 3. X (Twitter) 媒體工具
* **🐦 FxEmbed 推文媒體檢視器 (`/fx-embed/`)**
  * 專為 X / Twitter 推文設計的媒體檢視器，利用 FixTweet/FxTwitter API 輕鬆解析並預覽推文中的高畫質圖片與影片。
* **📥 X 媒體提取器 (`/twitter-extractor/`)**
  * 簡潔高效的推文圖片、影片連結提取器，方便存取與保存社群媒體素材。

---

### 🎮 4. 娛樂與小遊戲
* **🎲 猜數字遊戲 (`/guess/`)**
  * 經典 1~100 範圍終極密碼猜數字小遊戲，帶有即時提示與次數統計。
* **🎵 音樂播放器 (`/music-player/`)**
  * 輕量級網頁音樂播放器介面，具備自訂播放清單與進度控制。
* **🌸 Ayame AI Cover (`/ayame/`)**
  * 結合 ASCII Art 視覺藝術與張韶涵《隱形的翅膀》Ayame AI Cover 語音演唱的彩蛋網頁。
* **📮 Sus 迷因播放器 (`/Sus/`)**
  * 全螢幕自動播放的迷因短影音展示頁面。

---

### 🔗 5. 同帳號生態系連結
主導航中含有部分導向作者帳號下其他 GitHub Pages 專案的快捷連結：
* `About Me` (`/aboutme`)
* `Project-1` (`/project-1`)
* `PageTest` (`/PageTest`)
* `UI Shigure` (`/ui_shigure`)
* `Time Is` (`/timeis`)

---

## 📂 專案目錄結構

```text
rushiaismywaifu.github.io/
├── index.html                  # 網站首頁（整合導航、表單測試、語音、B站短網址）
├── favicon.ico                 # 網站圖示
├── image.png / d.png           # OG 分享與視覺素材
├── README.md                   # 專案說明文件
│
├── ayame/                      # 🌸 Ayame AI Cover 頁面
│   └── index.html
├── base64/                     # 🔣 Base64 賽博龐克加解密工具
│   └── index.html
├── credentials/                # 🔑 本地帳號密碼管理工具
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
├── music-player/               # 🎵 網頁音樂播放器
│   ├── index.html
│   ├── script.js
│   └── styles.css
├── Sus/                        # 📮 迷因影片展示
│   └── index.html
└── twitter-extractor/          # 📥 X/Twitter 媒體提取器
    └── index.html
```

---

## ⚡ 本次專案整理與結構優化紀錄

1. **目錄結構標準化 (Directory Refactoring)**：
   * 將原先散落在根目錄的獨立 HTML 檔案（如 `ayame.html`、`base64.html`、`FxEmbed.html`）統一遷移至對應的獨立模組資料夾（`ayame/index.html`、`base64/index.html`、`fx-embed/index.html`），以符合 GitHub Pages 乾淨路由（Clean URLs）最佳實踐。
   * 將編號臨時檔 `gemini-3.1-pro-preview.index.html` 重構並命名為 `twitter-extractor/index.html`。
2. **向後相容轉址處理 (Backward Compatibility)**：
   * 於根目錄保留輕量級轉址頁面 `ayame.html`、`base64.html`、`FxEmbed.html`，確保舊有書籤或分享網址不會產生 404 錯誤。
3. **首頁導航升級**：
   * 於首頁 `index.html` 的「📌 頁面導航」區塊中，補上了 **FxEmbed** (`/fx-embed`) 與 **X Extractor** (`/twitter-extractor`) 兩個工具入口。
4. **HTML 規範修復**：
   * 為部分缺少 `<head>` 資訊及 `<title>` 的網頁補齊標準 HTML5 聲明與語系字元集設定（如 `ayame/index.html`）。

---
*Powered by Rushia My Beloved 🦋*
