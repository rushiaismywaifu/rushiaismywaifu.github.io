import {
  PLATFORM_NAMES,
  REWARD_CAT_LABEL,
  REWARD_TYPES,
  TASK_CAT_LABEL,
  assetURL,
  daysLeft,
  escapeHtml,
  fmtDate,
  getRewards,
  getTasks,
  regionInfo,
  regionLabel,
  safeLink,
  setInert,
  statusOf,
} from './utils.js';

export const elements = {
  appShell: document.querySelector('.app-shell'),
  main: document.querySelector('.main'),
  sidebar: document.getElementById('sidebar'),
  sidebarClose: document.getElementById('sidebarClose'),
  sidebarBackdrop: document.getElementById('sidebarBackdrop'),
  filterToggle: document.getElementById('filterToggle'),
  activeFilterCount: document.getElementById('activeFilterCount'),
  grid: document.getElementById('grid'),
  state: document.getElementById('state'),
  search: document.getElementById('searchInput'),
  searchClear: document.getElementById('searchClear'),
  regionSel: document.getElementById('regionSel'),
  ageSel: document.getElementById('ageSel'),
  sortSel: document.getElementById('sortSel'),
  totalPill: document.getElementById('totalPill'),
  refreshBtn: document.getElementById('refreshBtn'),
  resultsTitle: document.getElementById('resultsTitle'),
  resultsMeta: document.getElementById('resultsMeta'),
  activeFilters: document.getElementById('activeFilters'),
  clearFilters: document.getElementById('clearFilters'),
  modal: document.getElementById('modal'),
  modalCard: document.getElementById('modalCard'),
  summaryLive: document.getElementById('summaryLive'),
  summaryUpcoming: document.getElementById('summaryUpcoming'),
  summaryOrbs: document.getElementById('summaryOrbs'),
  cntAll: document.getElementById('cnt-all'),
  cntLive: document.getElementById('cnt-live'),
  cntUpcoming: document.getElementById('cnt-upcoming'),
  cntEnded: document.getElementById('cnt-ended'),
  rcntAll: document.getElementById('rcnt-all'),
  rcntOrbs: document.getElementById('rcnt-orbs'),
  rcntAvatar: document.getElementById('rcnt-avatar'),
  rcntIngame: document.getElementById('rcnt-ingame'),
  rcntNitro: document.getElementById('rcnt-nitro'),
  tcntAll: document.getElementById('tcnt-all'),
  tcntPlay: document.getElementById('tcnt-play'),
  tcntWatch: document.getElementById('tcnt-watch'),
};

const STATUS_LABELS = Object.freeze({
  all: '所有任務',
  live: '進行中的任務',
  upcoming: '即將開始的任務',
  ended: '已結束的任務',
});

const FILTER_LABELS = Object.freeze({
  filter: {live: '進行中', upcoming: '即將開始', ended: '已結束'},
  reward: {orbs: 'Orbs', avatar: '頭像裝飾', ingame: '遊戲內獎勵', nitro: 'Nitro'},
  task: {play: '遊玩', watch: '觀看'},
  age: {age: '需要年齡驗證', noage: '無年齡限制'},
});

const SPARK_ICON = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z"/></svg>';

let lastFocusedElement = null;

export function setLoading(isRefreshing = false) {
  elements.refreshBtn.disabled = true;
  elements.refreshBtn.classList.add('is-loading');
  elements.refreshBtn.setAttribute('aria-busy', 'true');
  elements.state.hidden = false;
  elements.state.innerHTML = `
    <div class="spinner" aria-hidden="true"></div>
    <strong>${isRefreshing ? '正在更新任務資料' : '正在抓取任務資料'}</strong>
    <span>公開資料較大，請稍候幾秒鐘。</span>
  `;
  if (!isRefreshing) elements.grid.hidden = true;
}

export function finishLoading() {
  elements.refreshBtn.disabled = false;
  elements.refreshBtn.classList.remove('is-loading');
  elements.refreshBtn.removeAttribute('aria-busy');
}

export function renderFatalError(message) {
  elements.grid.hidden = true;
  elements.state.hidden = false;
  elements.state.innerHTML = `
    <span class="state-icon error" aria-hidden="true">!</span>
    <strong>任務資料暫時無法載入</strong>
    <span>${escapeHtml(message)}</span>
  `;
  elements.totalPill.textContent = '載入失敗';
}

export function renderRegionOptions(regionsMap, selectedValue = '') {
  const countries = new Set();
  Object.values(regionsMap || {}).forEach(restriction => {
    restriction?.regions?.include?.forEach(code => countries.add(code));
    restriction?.regions?.exclude?.forEach(code => countries.add(code));
  });

  const options = [...countries]
    .sort((a, b) => regionInfo(a).nameZh.localeCompare(regionInfo(b).nameZh, 'zh-Hant'))
    .map(code => `<option value="${escapeHtml(code)}">${escapeHtml(regionLabel(code))}</option>`)
    .join('');

  elements.regionSel.innerHTML = `<option value="">全部地區</option>${options}`;
  elements.regionSel.value = selectedValue;
}

export function updateCounts(counts, rewardCounts, taskCounts, liveOrbs) {
  elements.cntAll.textContent = counts.all;
  elements.cntLive.textContent = counts.live;
  elements.cntUpcoming.textContent = counts.upcoming;
  elements.cntEnded.textContent = counts.ended;
  elements.rcntAll.textContent = rewardCounts.all;
  elements.rcntOrbs.textContent = rewardCounts.orbs;
  elements.rcntAvatar.textContent = rewardCounts.avatar;
  elements.rcntIngame.textContent = rewardCounts.ingame;
  elements.rcntNitro.textContent = rewardCounts.nitro;
  elements.tcntAll.textContent = taskCounts.all;
  elements.tcntPlay.textContent = taskCounts.play;
  elements.tcntWatch.textContent = taskCounts.watch;
  elements.summaryLive.textContent = counts.live;
  elements.summaryUpcoming.textContent = counts.upcoming;
  elements.summaryOrbs.textContent = liveOrbs;
}

export function updateFilterButtons(state) {
  [['filter', state.filter], ['reward', state.reward], ['task', state.task]].forEach(([attribute, value]) => {
    document.querySelectorAll(`.nav-item[data-${attribute}]`).forEach(button => {
      const active = button.dataset[attribute] === value;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  });
  elements.regionSel.value = state.region;
  elements.ageSel.value = state.age;
  elements.sortSel.value = state.sort;
  if (elements.search.value !== state.searchRaw) elements.search.value = state.searchRaw;
  elements.searchClear.hidden = !state.searchRaw;
  document.querySelectorAll('[data-quick-filter]').forEach(button => {
    const quick = button.dataset.quickFilter;
    const otherFiltersClear = state.task === 'all' && !state.region && state.age === 'all' && !state.search;
    const active = otherFiltersClear && (quick === 'orbs'
      ? state.filter === 'live' && state.reward === 'orbs'
      : state.filter === quick && state.reward === 'all');
    button.setAttribute('aria-pressed', String(active));
  });
}

export function renderActiveFilters(state) {
  const filters = [];
  if (state.filter !== 'all') filters.push(['filter', FILTER_LABELS.filter[state.filter]]);
  if (state.reward !== 'all') filters.push(['reward', FILTER_LABELS.reward[state.reward]]);
  if (state.task !== 'all') filters.push(['task', FILTER_LABELS.task[state.task]]);
  if (state.region) filters.push(['region', regionLabel(state.region)]);
  if (state.age !== 'all') filters.push(['age', FILTER_LABELS.age[state.age]]);
  if (state.search) filters.push(['search', `「${state.searchRaw.trim()}」`]);

  elements.activeFilters.innerHTML = filters
    .filter(([, label]) => Boolean(label))
    .map(([key, label]) => `<button class="filter-chip" type="button" data-clear-filter="${key}" aria-label="移除篩選：${escapeHtml(label)}"><span>${escapeHtml(label)}</span><span class="chip-dismiss" aria-hidden="true">×</span></button>`)
    .join('');
  elements.clearFilters.hidden = filters.length === 0;
  elements.activeFilterCount.hidden = filters.length === 0;
  elements.activeFilterCount.textContent = filters.length;
  elements.activeFilters.parentElement.hidden = filters.length === 0;
}

export function updateResultsHeader({visibleCount, totalCount, filter, lastUpdated, sourceMode, warningCount}) {
  elements.resultsTitle.textContent = STATUS_LABELS[filter] || STATUS_LABELS.all;
  elements.totalPill.textContent = `${visibleCount} / ${totalCount}`;

  const updated = lastUpdated
    ? lastUpdated.toLocaleTimeString('zh-TW', {hour: '2-digit', minute: '2-digit'})
    : '—';
  const sourceNote = sourceMode === 'mock' ? ' · 目前顯示離線示範資料' : '';
  const warningNote = warningCount ? ` · ${warningCount} 個來源暫時不可用` : '';
  elements.resultsMeta.textContent = `顯示 ${visibleCount} 筆，共 ${totalCount} 筆 · 更新於 ${updated}${sourceNote}${warningNote}`;
}

export function renderQuestGrid(quests, meta, regionsMap) {
  if (quests.length === 0) {
    elements.grid.hidden = true;
    elements.state.hidden = false;
    elements.state.innerHTML = `
      <span class="state-icon" aria-hidden="true">⌕</span>
      <strong>找不到符合條件的任務</strong>
      <span>調整搜尋文字或清除部分篩選條件再試一次。</span>
      <button class="empty-reset" type="button" data-reset-filters>清除篩選，查看全部任務</button>
    `;
    return;
  }

  elements.state.hidden = true;
  elements.grid.hidden = false;
  elements.grid.innerHTML = quests
    .map(quest => cardTemplate(quest, meta.get(quest.id), regionsMap[quest.id]))
    .join('');
}

function cardTemplate(quest, meta, restriction) {
  const config = quest.config || {};
  const messages = config.messages || {};
  const id = String(quest.id);
  const status = meta.status;
  const hero = heroImageURL(id, config.assets);
  const logotype = assetURL(id, config.assets?.logotype_dark || config.assets?.logotype_light || config.assets?.logotype);
  const tile = assetURL(id, config.assets?.game_tile_dark || config.assets?.game_tile_light || config.assets?.game_tile);
  const rewards = getRewards(config);
  const reward = rewards[0];
  const rewardImage = reward ? assetURL(id, reward.asset) : null;
  const rewardName = reward
    ? reward.messages?.name || reward.name || REWARD_TYPES[reward.type] || 'Reward'
    : '尚未公布';
  const questName = messages.quest_name || '未命名任務';
  const gameName = messages.game_title || config.application?.name || '未知遊戲';
  const publisher = messages.game_publisher || '';
  const statusInfo = statusPresentation(status, config.expires_at);
  const regionSummary = compactRegionTemplate(restriction);

  return `
    <button class="card" type="button" data-id="${escapeHtml(id)}" aria-label="查看 ${escapeHtml(questName)} 詳情">
      <span class="hero">
        <span class="media-placeholder" aria-hidden="true">${SPARK_ICON}<strong>${escapeHtml(gameName)}</strong></span>
        ${hero ? `<img loading="lazy" decoding="async" src="${hero}" alt="">` : ''}
        <span class="gradient" aria-hidden="true"></span>
        ${logotype ? `<img class="logotype" loading="lazy" decoding="async" src="${logotype}" alt="">` : ''}
        <span class="badge ${statusInfo.className}">${statusInfo.label}</span>
        ${restriction?.show_age_gate ? '<span class="age">年齡驗證</span>' : ''}
      </span>
      <span class="card-body">
        <span class="game-row">
          ${tile ? `<img class="tile" loading="lazy" decoding="async" src="${tile}" alt="">` : `<span class="tile tile-placeholder" aria-hidden="true">${SPARK_ICON}</span>`}
          <span class="game">${escapeHtml(gameName)}</span>
        </span>
        <strong class="title">${escapeHtml(questName)}</strong>
        <span class="reward-row">
          ${rewardImage ? `<img loading="lazy" decoding="async" src="${rewardImage}" alt="">` : `<span class="reward-placeholder" aria-hidden="true">${SPARK_ICON}</span>`}
          <span class="reward-meta">
            <small class="reward-label">${[...meta.rewards].map(category => escapeHtml(REWARD_CAT_LABEL[category] || category)).join(' · ') || '獎勵'}</small>
            <strong class="reward-name" title="${escapeHtml(rewardName)}">${escapeHtml(rewardName)}</strong>
          </span>
        </span>
        <span class="task-chips">
          ${[...meta.tasks].map(category => `<span class="chip">${escapeHtml(TASK_CAT_LABEL[category] || category)}</span>`).join('')}
        </span>
        <span class="footer-row">
          <span class="regions">${regionSummary}</span>
        </span>
        <span class="card-bottom"><span class="publisher">${escapeHtml(publisher)}</span><span class="card-cta">查看任務 <span aria-hidden="true">→</span></span></span>
      </span>
    </button>
  `;
}

function heroImageURL(id, assets = {}) {
  const image = [assets?.quest_bar_hero, assets?.hero]
    .find(value => typeof value === 'string' && value.trim() && !/\.(webm|mp4)(?:[?#]|$)/i.test(value));
  return assetURL(id, image);
}

function statusPresentation(status, expiresAt) {
  if (status === 'upcoming') return {className: 'up', label: '即將開始'};
  if (status === 'ended') return {className: 'end', label: '✓ 已結束'};

  const remaining = daysLeft(expiresAt);
  const suffix = remaining === 0 ? ' · 今天結束' : remaining ? ` · 剩 ${remaining} 天` : '';
  return {className: 'live', label: `● 進行中${suffix}`};
}

function compactRegionTemplate(restriction) {
  if (!restriction) return '<span class="region-note">🌐 未提供地區資料</span>';

  const include = restriction.regions?.include || [];
  const exclude = restriction.regions?.exclude || [];
  if (restriction.is_global && include.length === 0 && exclude.length === 0) {
    return '<span class="region-note global-region">🌐 全球適用</span>';
  }
  if (!include.length && !exclude.length) return '<span class="region-note">🌐 未指定地區限制</span>';
  const group = (codes, excluded = false) => {
    if (!codes.length) return '';
    const limit = include.length && exclude.length ? 1 : 2;
    return `<span class="compact-region-group${excluded ? ' excluded' : ''}"><span class="region-caption">${excluded ? '不適用' : '限定地區'}</span>${codes.slice(0, limit).map(code => `<span class="compact-country">${escapeHtml(regionLabel(code))}</span>`).join('')}${codes.length > limit ? `<span class="region-more">另 ${codes.length - limit} 個地區 · 查看詳情</span>` : ''}</span>`;
  };
  return group(include) + group(exclude, true);
}

export function openQuestModal(quest, restriction) {
  if (!quest) return;

  lastFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const config = quest.config || {};
  const messages = config.messages || {};
  const id = String(quest.id);
  const hero = heroImageURL(id, config.assets);
  const heroVideo = assetURL(id, config.assets?.hero_video);
  const questBarVideo = assetURL(
    id,
    config.assets?.quest_bar_hero_video
      || (config.assets?.quest_bar_hero?.endsWith?.('.webm') ? config.assets.quest_bar_hero : null),
  );
  const logo = assetURL(id, config.assets?.logotype_dark || config.assets?.logotype_light || config.assets?.logotype);
  const rewards = getRewards(config);
  const tasks = Object.entries(getTasks(config)).map(([key, value]) => ({
    type: value?.type || value?.event_name || key,
    target: value?.target ?? '—',
  }));
  const joinOperator = String(config.task_config_v2?.join_operator || config.task_config?.join_operator || 'and').toUpperCase();
  const platforms = Array.isArray(config.rewards_config?.platforms) ? config.rewards_config.platforms : [];
  const statusInfo = statusPresentation(statusOf(quest), config.expires_at);
  const includeRegions = restriction?.regions?.include || [];
  const excludeRegions = restriction?.regions?.exclude || [];
  const gameLink = safeLink(config.application?.link);
  const video = heroVideo || questBarVideo;
  const heroMedia = `
    <span class="media-placeholder" aria-hidden="true">${SPARK_ICON}<strong>${escapeHtml(messages.game_title || config.application?.name || 'Discord Quest')}</strong></span>
    ${hero ? `<img src="${hero}" alt="">` : ''}
    ${video ? `<video src="${video}" autoplay muted loop playsinline poster="${hero || ''}"></video>` : ''}
  `;

  elements.modalCard.innerHTML = `
    <button class="modal-close" type="button" aria-label="關閉任務詳情">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path d="M18 6 6 18M6 6l12 12"></path>
      </svg>
    </button>
    <div class="modal-hero">
      ${heroMedia}
      <span class="gradient" aria-hidden="true"></span>
      ${logo ? `<img class="logo" src="${logo}" alt="">` : ''}
      <div class="modal-status">
        <span class="badge ${statusInfo.className}">${statusInfo.label}</span>
        ${restriction?.show_age_gate ? '<span class="age">年齡驗證</span>' : ''}
      </div>
    </div>
    <div class="modal-body">
      <div class="modal-heading">
        <div class="modal-heading-copy">
          <p class="modal-kicker">${escapeHtml(messages.game_title || config.application?.name || 'Discord Quest')}</p>
          <h2 class="modal-title" id="modalTitle">${escapeHtml(messages.quest_name || '未命名任務')}</h2>
          <p class="modal-subtitle">
            ${messages.game_publisher ? `發行：${escapeHtml(messages.game_publisher)} · ` : ''}
            ID <code>${escapeHtml(id)}</code>
          </p>
        </div>
        ${gameLink ? `<div class="modal-actions"><a class="modal-link" href="${gameLink}" target="_blank" rel="noopener noreferrer">前往遊戲官網 ↗</a></div>` : ''}
      </div>

      <div class="kv">
        ${infoItem('開始時間', fmtDate(config.starts_at))}
        ${infoItem('結束時間', fmtDate(config.expires_at))}
        ${infoItem('獎勵領取截止', fmtDate(config.rewards_config?.rewards_expire_at))}
        ${infoItem('支援平台', platforms.length ? platforms.map(platform => PLATFORM_NAMES[platform] || String(platform)).join('、') : '—')}
      </div>

      ${tasks.length ? `
        <section class="section">
          <div class="section-title-row"><h3>如何完成任務</h3><span>${joinOperator === 'OR' ? '完成任一條件' : joinOperator === 'AND' ? '完成所有條件' : '請依 Discord 說明完成'}</span></div>
          <div class="tasks">
            ${tasks.map(task => taskTemplate(task)).join('')}
          </div>
        </section>
      ` : ''}

      ${rewards.length ? `
        <section class="section">
          <div class="section-title-row"><h3>獎勵</h3><span>${rewards.length} 項</span></div>
          <div class="rewards">
            ${rewards.map(reward => rewardTemplate(id, reward)).join('')}
          </div>
        </section>
      ` : ''}

      <section class="section">
        <div class="section-title-row"><h3>適用地區</h3></div>
        <div class="region-details">${regionDetailTemplate(restriction, includeRegions, excludeRegions)}</div>
        <p class="region-disclaimer">參與資格與獎勵以 Discord 內顯示的任務資訊為準。</p>
      </section>
    </div>
  `;

  elements.modal.classList.add('open');
  elements.modal.setAttribute('aria-hidden', 'false');
  setInert(elements.appShell, true);
  document.body.classList.add('modal-open');
  requestAnimationFrame(() => {
    if (isQuestModalOpen()) elements.modalCard.querySelector('.modal-close')?.focus({preventScroll: true});
  });
}

function infoItem(label, value) {
  return `<div class="item"><span class="k">${escapeHtml(label)}</span><strong class="v">${escapeHtml(value)}</strong></div>`;
}

function taskTemplate(task) {
  const type = String(task.type).toUpperCase();
  const [label, instruction] = type.startsWith('WATCH_VIDEO')
    ? ['觀看影片', '在 Discord 任務中觀看指定影片']
    : type.startsWith('WATCH')
      ? ['觀看內容', '依任務要求觀看指定內容']
      : type.startsWith('STREAM')
        ? ['直播遊戲', '透過 Discord 分享指定遊戲的畫面']
        : type.startsWith('PLAY_ACTIVITY')
          ? ['參與活動', '在 Discord 中參與指定活動']
          : type.startsWith('PLAY')
            ? ['遊玩遊戲', '依任務要求遊玩指定遊戲']
            : ['任務條件', '請依 Discord 中的任務說明完成'];
  return `
    <div class="task">
      <span class="ttype">${label}</span>
      <span class="task-copy">${instruction}</span>
      <strong class="ttarget">${escapeHtml(formatTaskTarget(task))}</strong>
    </div>
  `;
}

function formatTaskTarget(task) {
  const value = task.target;
  const type = String(task.type).toUpperCase();
  if (typeof value === 'number' && /WATCH|PLAY|STREAM/.test(type)) {
    const minutes = Math.max(1, Math.ceil(value / 60));
    return `${minutes} 分鐘`;
  }
  return String(value);
}

function rewardTemplate(questId, reward) {
  const image = assetURL(questId, reward.asset);
  const name = reward.messages?.name || reward.name || REWARD_TYPES[reward.type] || 'Reward';
  const link = safeLink(String(reward.redemption_link || '').replace('{reward_code}', 'XXXXX'));
  const quantity = reward.orb_quantity ? ` · ${reward.orb_quantity} Orbs` : '';

  return `
    <article class="reward-card">
      ${image ? `<img src="${image}" alt="">` : `<span class="reward-placeholder" aria-hidden="true">${SPARK_ICON}</span>`}
      <div class="reward-copy">
        <strong class="rn">${escapeHtml(name)}</strong>
        <span class="rs">${escapeHtml(REWARD_TYPES[reward.type] || 'Reward')}${escapeHtml(quantity)}</span>
        ${link ? `<a class="reward-link" href="${link}" target="_blank" rel="noopener noreferrer">查看兌換頁面 ↗</a>` : ''}
      </div>
    </article>
  `;
}

function regionDetailTemplate(restriction, includeRegions, excludeRegions) {
  if (!restriction) return '<p class="region-message">🌐 尚未提供地區限制資料</p>';
  if (restriction.is_global && includeRegions.length === 0 && excludeRegions.length === 0) {
    return '<p class="region-message global-region">🌐 全球適用 · 未列出地區限制</p>';
  }

  const group = (codes, excluded = false) => codes.length ? `
    <div class="region-group${excluded ? ' excluded' : ''}">
      <h4>${excluded ? '無法參與的地區' : '限定參與地區'} <span>${codes.length}</span></h4>
      <div class="region-chips">${codes.map(code => {
        const country = regionInfo(code);
        return `<span class="country-chip"><span class="country-flag" aria-hidden="true">${escapeHtml(country.flag)}</span><span class="country-names"><strong lang="zh-Hant">${escapeHtml(country.nameZh)}</strong><span lang="en">${escapeHtml(country.nameEn)}</span></span><code>${escapeHtml(country.code)}</code></span>`;
      }).join('')}</div>
    </div>` : '';
  const lists = group(includeRegions) + group(excludeRegions, true);
  const priorityNote = includeRegions.length && excludeRegions.length
    ? '<p class="region-disclaimer">若地區同時出現在兩份清單，以「無法參與的地區」為準。</p>'
    : '';
  return lists ? `${priorityNote}${lists}` : '<p class="region-message">🌐 未指定地區限制</p>';
}

export function closeQuestModal() {
  if (!elements.modal.classList.contains('open')) return;
  elements.modal.classList.remove('open');
  elements.modal.setAttribute('aria-hidden', 'true');
  setInert(elements.appShell, false);
  document.body.classList.remove('modal-open');
  const focusTarget = lastFocusedElement;
  lastFocusedElement = null;
  window.setTimeout(() => focusTarget?.focus(), 180);
}

export function isQuestModalOpen() {
  return elements.modal.classList.contains('open');
}

export function trapModalFocus(event) {
  if (event.key !== 'Tab' || !isQuestModalOpen()) return;
  const focusable = [...elements.modalCard.querySelectorAll('button, a[href], select, input, [tabindex]:not([tabindex="-1"])')]
    .filter(element => !element.hidden && !element.hasAttribute('disabled'));
  if (focusable.length === 0) return;

  const first = focusable[0];
  const last = focusable.at(-1);
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}
