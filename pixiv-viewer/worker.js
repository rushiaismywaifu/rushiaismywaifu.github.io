/**
 * ============================================================================
 * 🌸 Pixiv 預覽器 Cloudflare Worker（v2 — 雙來源解析 + 媒體下載代理 + 邊緣快取）
 * ============================================================================
 *
 * 💡 相較於 v1 的重大改進：
 *
 * 1.【雙來源解析】
 *    ├ 主要來源：直接呼叫 Pixiv 官方公開 AJAX API（phixiv 官方文件即建議此做法）
 *    │   https://www.pixiv.net/ajax/illust/{id}          → 標題、說明、標籤翻譯、
 *    │                                                      確切頁數、原圖網址、日期、
 *    │                                                      瀏覽/收藏數、AI 標記、R-18 標記
 *    │   https://www.pixiv.net/ajax/illust/{id}/pages    → 每一頁正確的網址與副檔名
 *    │   https://www.pixiv.net/ajax/illust/{id}/ugoira_meta → 動圖「真正的」原始 ZIP
 *    └ 備援來源：v1 的 phixiv HTML OpenGraph 解析（已修正多處問題，見下）
 *        當 Pixiv API 被擋（資料中心 IP 風控）或作品為 R-18（無登入時 API 拿不到）
 *        時自動切換 — phixiv 伺服器端有登入 Session，因此 R-18 仍可解析。
 *
 * 2.【媒體下載代理 ?media=...】
 *    phixiv 的 /i/ 圖片代理「沒有」CORS 標頭（已核對其原始碼 proxy.rs），
 *    i.pximg.net 則要求 Referer 必須來自 pixiv.net。因此前端無法用 fetch 下載、
 *    <a download> 也因跨域而失效。本代理端點：
 *    ├ 自動補上 Referer: https://www.pixiv.net/（可直接下載 img-original 原圖！）
 *    ├ 回應加上 CORS 與 Content-Disposition（&dl=檔名 → 瀏覽器直接存檔）
 *    ├ 僅允許 i.pximg.net / s.pximg.net / phixiv.net 網域（防止被當開放代理濫用）
 *    └ 原圖 404 時自動嘗試 .jpg ↔ .png 互換（Pixiv 混合副檔名作品的經典地雷）
 *
 * 3.【邊緣快取】使用 Cloudflare Cache API：
 *    同一作品的重複查詢/下載直接由最近的邊緣節點回應，
 *    大幅節省免費額度（每日 100,000 次請求）並加速回應。
 *
 * 4.【v1 錯誤修正】
 *    ├ /artworks/{id}/100 → /9999：phixiv 原始碼為 min(index, 總頁數)，
 *    │   固定 100 會漏掉超過 100 頁的作品，9999 永遠取到最後一頁。
 *    ├ HTML 實體解碼：phixiv 模板（askama）會將 & " < > 轉義為 &amp; 等，
 *    │   v1 未解碼導致標題/說明顯示錯誤。
 *    ├ og:description 尾端其實附帶了整串標籤（已核對模板原始碼），現已自動剝除。
 *    ├ 「[AI Generated] 」前綴改為解析成 is_ai_generated 欄位。
 *    └ v1 憑空拼出的 /i/ugoira/{id}.zip 多半 404（真實 ZIP 位於
 *        i.pximg.net/img-zip-ugoira/…），現改用 ugoira_meta 取得真實網址，
 *        備援路徑則先以 HEAD 探測、確認存在才回傳。
 *
 * 📎 API 介面（回傳皆為 JSON、含 CORS）：
 *    GET /?id=124748386                → 作品完整資訊
 *    GET /?url=https://www.pixiv.net/artworks/124748386 → 同上（自動抽出 ID）
 *    GET /?media=<encodeURIComponent(圖片網址)>          → 代理串流該媒體
 *        &dl=檔名.png                  → 以附件方式下載（觸發另存檔案）
 */

/* ═══════════════════════════ ⚙️ 可調整設定區 ═══════════════════════════ */

/**
 * 允許呼叫本 API 的前端網域（CORS 白名單）。
 * ├ 保留 "*"           → 任何網站都能呼叫（部署測試最方便）
 * └ 想鎖定自己的網站時 → 改成：
 *     const ALLOWED_ORIGINS = [
 *       "https://chikenscrach.github.io",
 *       "http://localhost:8000",          // 本機開發預覽
 *     ];
 *   注意：CORS 只能阻止「其他網站的前端」偷用你的 Worker 額度，
 *   無法阻止 curl 等直接請求 —— 但對免費靜態站的防護已相當足夠。
 */
const ALLOWED_ORIGINS = ["*"];

/** Pixiv 標籤翻譯語言（zh_tw / zh / en / ja / ko） */
const PIXIV_LANG = "zh_tw";

/** 作品資訊 JSON 的邊緣快取秒數（10 分鐘） */
const API_CACHE_SECONDS = 600;

/** 媒體檔案的邊緣快取秒數（7 天 — 已發佈的作品圖檔幾乎不會變動） */
const MEDIA_CACHE_SECONDS = 604800;

/** 媒體代理允許的來源網域（結尾比對） */
const MEDIA_ALLOWED_HOSTS = ["i.pximg.net", "s.pximg.net", "phixiv.net", "www.phixiv.net", "i.phixiv.net"];

/** 上游請求逾時（毫秒） */
const UPSTREAM_TIMEOUT_MS = 15000;

const PHIXIV_HOST = "https://www.phixiv.net";

/** 模擬瀏覽器的 UA（呼叫 Pixiv AJAX 用） */
const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

/** 模擬 Bot 的 UA（讓 phixiv 回傳 OpenGraph 模板而非 302 轉址） */
const BOT_UA = "TelegramBot (like TwitterBot)";

/* ═══════════════════════════ 🚪 入口路由 ═══════════════════════════ */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin");

    // CORS 預檢
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }
    if (request.method !== "GET" && request.method !== "HEAD") {
      return jsonResponse({ status: "error", message: "僅支援 GET 請求" }, 405, origin);
    }

    try {
      // 路由 1：媒體下載代理
      if (url.searchParams.has("media")) {
        return await handleMediaProxy(request, url, ctx, origin);
      }
      // 路由 2：作品資訊
      const input = url.searchParams.get("id") || url.searchParams.get("url") || "";
      if (input) {
        return await handleArtwork(request, url, input, ctx, origin);
      }
      // 路由 3：使用說明
      return jsonResponse(
        {
          status: "ready",
          message: "🌸 Pixiv 預覽器 API 運作中",
          usage: {
            artwork: `${url.origin}/?id=124748386`,
            by_url: `${url.origin}/?url=https://www.pixiv.net/artworks/124748386`,
            media_proxy: `${url.origin}/?media=<encodeURIComponent(圖片網址)>&dl=檔名.png`,
          },
        },
        200,
        origin
      );
    } catch (err) {
      console.error("Unhandled:", err);
      return jsonResponse({ status: "error", message: `伺服器例外：${err.message}` }, 500, origin);
    }
  },
};

/* ═══════════════════════════ 🎨 作品資訊 ═══════════════════════════ */

async function handleArtwork(request, url, input, ctx, origin) {
  const idMatch = String(input).trim().match(/(?:artworks\/|illust_id=|^)(\d+)/);
  const id = idMatch ? idMatch[1] : null;
  if (!id) {
    return jsonResponse({ status: "error", message: "⚠️ 無法從輸入內容中識別 Pixiv 作品 ID（需為數字）" }, 400, origin);
  }

  // ── 邊緣快取查詢（以正規化網址為 key，?id= 與 ?url= 共用同一份快取）──
  const cache = caches.default;
  const cacheKey = new Request(`${url.origin}/__cache/artwork/${id}?lang=${PIXIV_LANG}`);
  const hit = await cache.match(cacheKey);
  if (hit) {
    const cached = new Response(hit.body, hit);
    applyCors(cached.headers, origin);
    cached.headers.set("X-Cache", "HIT");
    return cached;
  }

  // ── 依序嘗試兩個來源 ──
  let payload = null;
  let ajaxError = null;
  try {
    payload = await fetchFromPixivAjax(id, url.origin);
  } catch (err) {
    ajaxError = err.message;
  }
  if (!payload) {
    try {
      payload = await fetchFromPhixivHtml(id, url.origin);
    } catch (err) {
      return jsonResponse(
        {
          status: "error",
          message: "❌ 兩個來源皆解析失敗：作品可能已被刪除、設為私人，或暫時無法連線",
          detail: { pixiv_ajax: ajaxError, phixiv_html: err.message },
        },
        502,
        origin
      );
    }
  }

  if (!payload.media || payload.media.length === 0) {
    return jsonResponse({ status: "error", message: "❌ 此作品不含可公開存取的多媒體內容" }, 404, origin);
  }

  const resp = jsonResponse(payload, 200, origin, `public, max-age=300, s-maxage=${API_CACHE_SECONDS}`);
  ctx.waitUntil(cache.put(cacheKey, resp.clone()));
  resp.headers.set("X-Cache", "MISS");
  return resp;
}

/* ─────────────── 來源 A：Pixiv 官方 AJAX API（主要）─────────────── */

async function fetchFromPixivAjax(id, workerOrigin) {
  const body = await pixivAjax(`https://www.pixiv.net/ajax/illust/${id}?lang=${PIXIV_LANG}`);

  // R-18 作品在無登入狀態下 urls 會是 null → 丟給 phixiv 備援（其伺服器有 Session）
  if (!body || !body.urls || !body.urls.original) {
    throw new Error("Pixiv API 未回傳圖片網址（可能為 R-18 或受限內容）");
  }

  const isUgoira = body.illustType === 2;
  const pageCount = body.pageCount || 1;
  const tags = (body.tags?.tags || []).map((t) => ({
    name: t.tag,
    // Pixiv API 的已知怪癖：無論 lang 請求哪種語言，翻譯一律放在 translation.en
    translated: t.translation?.en || null,
  }));

  let media = [];
  if (isUgoira) {
    media = [await buildUgoiraMedia(id, body, workerOrigin)];
  } else {
    media = await buildPageMedia(id, body, pageCount, workerOrigin);
  }

  return {
    status: "success",
    source: "pixiv_ajax",
    id,
    title: body.illustTitle || body.title || `Pixiv Artwork #${id}`,
    description: htmlToText(body.description || body.illustComment || ""),
    is_ai_generated: body.aiType === 2,
    x_restrict: body.xRestrict || 0, // 0=全年齡 1=R-18 2=R-18G
    illust_type: body.illustType,    // 0=插畫 1=漫畫 2=動圖
    create_date: body.createDate || null,
    counts: {
      views: body.viewCount ?? null,
      bookmarks: body.bookmarkCount ?? null,
      likes: body.likeCount ?? null,
    },
    author: {
      name: body.userName || "未知繪師",
      id: body.userId || "",
      url: body.userId ? `https://www.pixiv.net/users/${body.userId}` : null,
    },
    tags,
    original_url: body.extraData?.meta?.canonical || `https://www.pixiv.net/artworks/${id}`,
    phixiv_url: `${PHIXIV_HOST}/artworks/${id}`,
    media_type: isUgoira ? "video" : "photo",
    is_ugoira: isUgoira,
    media_count: media.length,
    media,
  };
}

/** 呼叫 Pixiv AJAX 端點並回傳 body */
async function pixivAjax(endpoint) {
  const resp = await fetchWithTimeout(endpoint, {
    headers: {
      "User-Agent": BROWSER_UA,
      "Referer": "https://www.pixiv.net/",
      "Accept": "application/json",
      "Accept-Language": "zh-TW,zh;q=0.9,ja;q=0.8",
    },
    cf: { cacheTtl: API_CACHE_SECONDS, cacheEverything: true },
  });
  if (!resp.ok) throw new Error(`Pixiv API HTTP ${resp.status}`);
  const ct = resp.headers.get("Content-Type") || "";
  if (!ct.includes("json")) throw new Error("Pixiv API 回傳非 JSON（可能被風控攔截）");
  const data = await resp.json();
  if (data.error) throw new Error(`Pixiv API：${data.message || "回傳錯誤"}`);
  return data.body;
}

/** 建立多頁/單頁圖片的 media 陣列 */
async function buildPageMedia(id, body, pageCount, workerOrigin) {
  // 每頁的四種尺寸網址。多頁作品優先呼叫 /pages 端點：
  // 它會回傳每一頁「正確的副檔名」（Pixiv 允許同作品混用 jpg/png）。
  let pages = null;
  if (pageCount > 1) {
    try {
      pages = await pixivAjax(`https://www.pixiv.net/ajax/illust/${id}/pages?lang=${PIXIV_LANG}`);
    } catch (_) {
      pages = null; // 失敗時退回 _p0 置換法
    }
  }

  const makeItem = (urls, i) => {
    const original = urls.original;
    const ext = (original.match(/\.(\w+)(?:\?|$)/) || [, "jpg"])[1];
    const filename = `pixiv_${id}_p${i}.${ext}`;
    return {
      index: i,
      type: "photo",
      label: pageCount > 1 ? `第 ${i + 1} 頁` : "作品圖片",
      display_url: toPhixivProxy(urls.regular || original), // <img> 顯示用（免 Referer、有快取）
      thumb_url: toPhixivProxy(urls.small || urls.regular || original),
      original_url: original,                                // 真實 img-original 原圖
      download_url: mediaProxyUrl(workerOrigin, original, filename),
      filename,
    };
  };

  if (Array.isArray(pages) && pages.length > 0) {
    return pages.map((p, i) => makeItem(p.urls, i));
  }

  // 備援：以第 0 頁網址置換 _p0 → _pN（副檔名混用的作品極少，且下載代理會自動重試另一種副檔名）
  const replacePage = (u, i) => (u ? u.replace(/_p0(?=[._])/, `_p${i}`) : u);
  return Array.from({ length: pageCount }, (_, i) =>
    makeItem(
      {
        original: replacePage(body.urls.original, i),
        regular: replacePage(body.urls.regular, i),
        small: replacePage(body.urls.small, i),
      },
      i
    )
  );
}

/** 建立 Ugoira 動圖的 media 項目（MP4 由 phixiv 轉檔、ZIP 取自 Pixiv 真實原始檔） */
async function buildUgoiraMedia(id, body, workerOrigin) {
  const mp4Url = `${PHIXIV_HOST}/i/ugoira/${id}.mp4`;
  const item = {
    index: 0,
    type: "video",
    format: "mp4",
    label: "Ugoira 動態插畫（MP4）",
    display_url: mp4Url,
    poster_url: body.urls?.regular ? toPhixivProxy(body.urls.regular) : null,
    mp4_url: mp4Url,
    download_url: mediaProxyUrl(workerOrigin, mp4Url, `pixiv_${id}_ugoira.mp4`),
    filename: `pixiv_${id}_ugoira.mp4`,
  };
  // 真實的原始 ZIP 影格封包
  try {
    const meta = await pixivAjax(`https://www.pixiv.net/ajax/illust/${id}/ugoira_meta`);
    const zip = meta?.originalSrc || meta?.src;
    if (zip) {
      item.zip_url = zip;
      item.zip_download_url = mediaProxyUrl(workerOrigin, zip, `pixiv_${id}_ugoira.zip`);
      item.frame_count = Array.isArray(meta?.frames) ? meta.frames.length : null;
    }
  } catch (_) {
    /* 拿不到 ZIP 就只提供 MP4 */
  }
  return item;
}

/* ─────────────── 來源 B：phixiv HTML OpenGraph（備援）─────────────── */

async function fetchFromPhixivHtml(id, workerOrigin) {
  // /9999：phixiv 原始碼會 min(索引, 總頁數) 後取用 → 永遠命中「最後一頁」，
  // 藉由回傳的 og:image 檔名 _pN_ 即可得知總頁數（v1 的 /100 會漏掉百頁以上作品）。
  const resp = await fetchWithTimeout(`${PHIXIV_HOST}/artworks/${id}/9999`, {
    headers: { "User-Agent": BOT_UA, "Accept": "text/html,application/xhtml+xml" },
    cf: { cacheTtl: API_CACHE_SECONDS, cacheEverything: true },
  });
  if (!resp.ok) throw new Error(`phixiv HTTP ${resp.status}`);
  const html = await resp.text();

  const getMeta = (prop) => {
    const m =
      html.match(new RegExp(`<meta(?:\\s+property="${prop}"|\\s+name="${prop}")\\s+content="([^"]*)"`, "i")) ||
      html.match(new RegExp(`<meta\\s+content="([^"]*)"(?:\\s+property="${prop}"|\\s+name="${prop}")`, "i"));
    return m ? decodeEntities(m[1]) : null;
  };

  const ogTitle = getMeta("og:title") || "";
  let ogDesc = getMeta("og:description") || "";
  const ogImage = getMeta("og:image") || "";
  const ogVideo = getMeta("og:video") || "";
  const ogAlt = getMeta("og:image:alt") || "";
  let ogUrl = (getMeta("og:url") || `https://www.pixiv.net/artworks/${id}`).replace(/#\d+$/, "");

  // 作者：oembed 連結 <link ... href="https://host/e?i={authorId}&n={名稱urlencode}">
  let authorName = "未知繪師";
  let authorId = "";
  const oembed = html.match(/href="[^"]*\/e\?i=([^&"]+)&(?:amp;)?n=([^"&]+)"/i);
  if (oembed) {
    authorId = decodeEntities(oembed[1]);
    try { authorName = decodeURIComponent(oembed[2]); } catch (_) { authorName = oembed[2]; }
  }

  // 標題格式（已核對 phixiv 模板）："{title} by (@{author})"
  let title = ogTitle;
  const tm = ogTitle.match(/^(.*?)\s+by\s+\(@(.*)\)$/s);
  if (tm) {
    title = tm[1];
    if (authorName === "未知繪師") authorName = tm[2];
  }

  // 標籤：og:image:alt 即為以「, 」相接的標籤字串（已核對模板）
  const tagNames = ogAlt ? ogAlt.split(",").map((t) => t.trim()).filter(Boolean) : [];
  const tags = tagNames.map((name) => ({ name, translated: null }));

  // og:description = "[AI Generated] " + 說明 + "\n" + 標籤字串（已核對模板）→ 還原成乾淨說明
  let isAi = false;
  if (ogDesc.startsWith("[AI Generated] ")) {
    isAi = true;
    ogDesc = ogDesc.slice("[AI Generated] ".length);
  }
  const tagLine = tagNames.join(", ");
  if (tagLine) {
    if (ogDesc.endsWith("\n" + tagLine)) ogDesc = ogDesc.slice(0, -(tagLine.length + 1));
    else if (ogDesc === tagLine) ogDesc = "";
  }

  // R-18 只能從標籤推斷（HTML 中沒有明確欄位）
  const xRestrict = tagNames.some((t) => /^R-18G/i.test(t)) ? 2 : tagNames.some((t) => /^R-18/i.test(t)) ? 1 : 0;

  // 組媒體
  let media = [];
  let isUgoira = false;
  if (ogVideo || html.includes("/i/ugoira/")) {
    isUgoira = true;
    const mp4Url = ogVideo || `${PHIXIV_HOST}/i/ugoira/${id}.mp4`;
    const item = {
      index: 0,
      type: "video",
      format: "mp4",
      label: "Ugoira 動態插畫（MP4）",
      display_url: mp4Url,
      poster_url: null,
      mp4_url: mp4Url,
      download_url: mediaProxyUrl(workerOrigin, mp4Url, `pixiv_${id}_ugoira.mp4`),
      filename: `pixiv_${id}_ugoira.mp4`,
    };
    // v1 憑空拼出的 ZIP 網址常 404 → 改為 HEAD 探測，確定存在才提供
    const zipUrl = `${PHIXIV_HOST}/i/ugoira/${id}.zip`;
    try {
      const probe = await fetchWithTimeout(zipUrl, { method: "HEAD", headers: { "User-Agent": BOT_UA } }, 8000);
      if (probe.ok) {
        item.zip_url = zipUrl;
        item.zip_download_url = mediaProxyUrl(workerOrigin, zipUrl, `pixiv_${id}_ugoira.zip`);
      }
    } catch (_) { /* 探測失敗即略過 ZIP */ }
    media.push(item);
  } else if (ogImage && ogImage !== "0") {
    // og:image 形如 https://www.phixiv.net/i/img-master/img/.../{id}_p{N}_master1200.jpg
    const pageMatch = ogImage.match(/^(.*_p)(\d+)([._].*)$/);
    const makePhoto = (displayUrl, i, total) => {
      const original = phixivMasterToOriginal(displayUrl);
      const ext = (original.match(/\.(\w+)(?:\?|$)/) || [, "jpg"])[1];
      const filename = `pixiv_${id}_p${i}.${ext}`;
      return {
        index: i,
        type: "photo",
        label: total > 1 ? `第 ${i + 1} 頁` : "作品圖片",
        display_url: displayUrl,
        thumb_url: displayUrl,
        original_url: original,
        download_url: mediaProxyUrl(workerOrigin, original, filename),
        filename,
      };
    };
    if (pageMatch) {
      const total = parseInt(pageMatch[2], 10) + 1;
      for (let i = 0; i < total; i++) media.push(makePhoto(`${pageMatch[1]}${i}${pageMatch[3]}`, i, total));
    } else {
      media.push(makePhoto(ogImage, 0, 1));
    }
  }

  return {
    status: "success",
    source: "phixiv_html",
    id,
    title: title || `Pixiv Artwork #${id}`,
    description: ogDesc,
    is_ai_generated: isAi,
    x_restrict: xRestrict,
    illust_type: isUgoira ? 2 : null,
    create_date: null,
    counts: null,
    author: {
      name: authorName,
      id: authorId,
      url: authorId ? `https://www.pixiv.net/users/${authorId}` : null,
    },
    tags,
    original_url: ogUrl,
    phixiv_url: `${PHIXIV_HOST}/artworks/${id}`,
    media_type: isUgoira ? "video" : "photo",
    is_ugoira: isUgoira,
    media_count: media.length,
    media,
  };
}

/* ═══════════════════════════ 📦 媒體下載代理 ═══════════════════════════ */

async function handleMediaProxy(request, url, ctx, origin) {
  let target;
  try {
    target = new URL(url.searchParams.get("media"));
  } catch (_) {
    return jsonResponse({ status: "error", message: "media 參數不是合法網址" }, 400, origin);
  }
  const hostOk =
    target.protocol === "https:" &&
    MEDIA_ALLOWED_HOSTS.some((h) => target.hostname === h || target.hostname.endsWith("." + h));
  if (!hostOk) {
    return jsonResponse({ status: "error", message: "僅允許代理 Pixiv / phixiv 網域的媒體" }, 403, origin);
  }

  const dl = url.searchParams.get("dl") || "";
  const rangeHeader = request.headers.get("Range");

  // 邊緣快取（帶 Range 的請求不進快取，直接透傳）
  const cache = caches.default;
  const cacheKey = new Request(`${url.origin}/__cache/media?u=${encodeURIComponent(target.href)}&dl=${encodeURIComponent(dl)}`);
  if (!rangeHeader) {
    const hit = await cache.match(cacheKey);
    if (hit) {
      const cached = new Response(hit.body, hit);
      applyCors(cached.headers, origin, true);
      cached.headers.set("X-Cache", "HIT");
      return cached;
    }
  }

  const upstreamHeaders = {
    "User-Agent": BROWSER_UA,
    "Referer": "https://www.pixiv.net/", // 🔑 通過 i.pximg.net 防盜連的關鍵
    "Accept": "*/*",
  };
  if (rangeHeader) upstreamHeaders["Range"] = rangeHeader;

  const doFetch = (u) =>
    fetchWithTimeout(u, { headers: upstreamHeaders, cf: { cacheTtl: MEDIA_CACHE_SECONDS, cacheEverything: true } }, 30000);

  let upstream = await doFetch(target.href);

  // Pixiv 原圖副檔名不確定（jpg/png 混用）→ 404 時自動互換重試
  if (upstream.status === 404 && /img-original/.test(target.pathname)) {
    const alt = target.href.endsWith(".jpg")
      ? target.href.replace(/\.jpg$/, ".png")
      : target.href.endsWith(".png")
      ? target.href.replace(/\.png$/, ".jpg")
      : null;
    if (alt) {
      const retry = await doFetch(alt);
      if (retry.ok) upstream = retry;
    }
  }

  if (!upstream.ok && upstream.status !== 206) {
    return jsonResponse({ status: "error", message: `上游媒體回應 HTTP ${upstream.status}` }, upstream.status, origin);
  }

  const headers = new Headers();
  const ct = upstream.headers.get("Content-Type");
  const cl = upstream.headers.get("Content-Length");
  const cr = upstream.headers.get("Content-Range");
  if (ct) headers.set("Content-Type", ct);
  if (cl) headers.set("Content-Length", cl);
  if (cr) headers.set("Content-Range", cr);
  headers.set("Accept-Ranges", "bytes");
  headers.set("Cache-Control", `public, max-age=${MEDIA_CACHE_SECONDS}, immutable`);
  if (dl) headers.set("Content-Disposition", contentDisposition(dl));
  applyCors(headers, origin, true);

  const resp = new Response(upstream.body, { status: upstream.status, headers });
  if (!rangeHeader && upstream.status === 200) {
    ctx.waitUntil(cache.put(cacheKey, resp.clone()));
    resp.headers.set("X-Cache", "MISS");
  }
  return resp;
}

/* ═══════════════════════════ 🧰 工具函式 ═══════════════════════════ */

/** i.pximg.net 的網址改走 phixiv 的 /i/ 代理（<img> 顯示用：免 Referer 限制、含 24h 快取） */
function toPhixivProxy(pximgUrl) {
  try {
    const u = new URL(pximgUrl);
    if (u.hostname === "i.pximg.net" || u.hostname === "s.pximg.net") {
      return `${PHIXIV_HOST}/i${u.pathname}`;
    }
    return pximgUrl;
  } catch (_) {
    return pximgUrl;
  }
}

/** 由 phixiv 代理的 master 縮圖網址還原出 i.pximg.net 的 img-original 原圖網址 */
function phixivMasterToOriginal(displayUrl) {
  try {
    const u = new URL(displayUrl);
    let path = u.pathname.replace(/^\/i(?=\/)/, ""); // 去掉 phixiv 的 /i 前綴
    path = path
      .replace(/\/c\/[^/]+\//, "/")                 // 去掉縮圖尺寸段（/c/540x540_70/）
      .replace("/img-master/", "/img-original/")
      .replace(/_(?:master|square)1200(\.\w+)$/, "$1");
    // img-original 副檔名未知：先猜 .jpg；下載代理 404 時會自動改試 .png
    if (/img-original/.test(path)) path = path.replace(/\.\w+$/, ".jpg");
    return `https://i.pximg.net${path}`;
  } catch (_) {
    return displayUrl;
  }
}

/** 組出本 Worker 的媒體下載代理網址 */
function mediaProxyUrl(workerOrigin, mediaUrl, filename) {
  return `${workerOrigin}/?media=${encodeURIComponent(mediaUrl)}&dl=${encodeURIComponent(filename)}`;
}

/** 帶逾時控制的 fetch */
function fetchWithTimeout(resource, options = {}, ms = UPSTREAM_TIMEOUT_MS) {
  return fetch(resource, { ...options, signal: AbortSignal.timeout(ms) });
}

/** HTML 實體解碼（phixiv/askama 模板會轉義 & " ' < >，以及少數具名/數字實體） */
function decodeEntities(str) {
  if (!str) return str;
  const named = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", "#39": "'", "#x27": "'" };
  return str.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+|#\d+);/g, (m, ent) => {
    if (named[ent] !== undefined) return named[ent];
    if (ent[0] === "#") {
      const code = ent[1] === "x" || ent[1] === "X" ? parseInt(ent.slice(2), 16) : parseInt(ent.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return m;
  });
}

/** 將 Pixiv API 回傳的 HTML 說明轉為純文字（<br> → 換行、去標籤、解實體） */
function htmlToText(html) {
  if (!html) return "";
  return decodeEntities(
    html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>\s*<p[^>]*>/gi, "\n\n")
      .replace(/<[^>]+>/g, "")
  ).trim();
}

/** RFC 5987 相容的 Content-Disposition（正確處理中日文檔名） */
function contentDisposition(filename) {
  const clean = filename.replace(/[\\/:*?"<>|\r\n]+/g, "_").slice(0, 150);
  const ascii = clean.replace(/[^\x20-\x7E]/g, "_");
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(clean)}`;
}

/* ─────────────── CORS ─────────────── */

function resolveOrigin(origin) {
  if (ALLOWED_ORIGINS.includes("*")) return "*";
  if (origin && ALLOWED_ORIGINS.includes(origin)) return origin;
  return null; // 不在白名單：不送出 ACAO，瀏覽器端跨域呼叫將被擋下
}

function applyCors(headers, origin, isMedia = false) {
  const allowed = resolveOrigin(origin);
  if (allowed) headers.set("Access-Control-Allow-Origin", allowed);
  if (allowed && allowed !== "*") headers.append("Vary", "Origin");
  headers.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Range");
  if (isMedia) headers.set("Access-Control-Expose-Headers", "Content-Disposition, Content-Length, Content-Range");
  headers.set("Access-Control-Max-Age", "86400");
}

function corsHeaders(origin) {
  const h = new Headers();
  applyCors(h, origin);
  return h;
}

function jsonResponse(data, status = 200, origin = null, cacheControl = "no-store") {
  const h = new Headers({ "Content-Type": "application/json; charset=utf-8", "Cache-Control": cacheControl });
  applyCors(h, origin);
  return new Response(JSON.stringify(data, null, 2), { status, headers: h });
}
