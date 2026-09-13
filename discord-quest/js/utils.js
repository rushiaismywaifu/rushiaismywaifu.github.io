import {
  QUEST_CDN,
  REGION_NAMES,
  REGION_NAMES_ZH,
  PLATFORM_NAMES,
  REWARD_TYPES,
  REWARD_CAT_LABEL,
  TASK_CAT_LABEL,
} from './config.js';

export {
  PLATFORM_NAMES,
  REWARD_TYPES,
  REWARD_CAT_LABEL,
  TASK_CAT_LABEL,
};

const ESCAPE_MAP = Object.freeze({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
});

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ESCAPE_MAP[character]);
}

export function setInert(element, value) {
  element.inert = value;
  element.toggleAttribute('inert', value);
}

export function normalizeRegionCode(value) {
  return typeof value === 'string' ? value.trim().toUpperCase() : '';
}

export function canonicalRegionCode(value) {
  const code = normalizeRegionCode(value);
  return code === 'UK' ? 'GB' : code;
}

export function normalizeRegions(regions) {
  const normalizeList = values => {
    const seen = new Set();
    return (Array.isArray(values) ? values : [])
      .map(normalizeRegionCode)
      .filter(code => {
        const canonical = canonicalRegionCode(code);
        if (!canonical || seen.has(canonical)) return false;
        seen.add(canonical);
        return true;
      });
  };

  if (Array.isArray(regions)) {
    return {include: normalizeList(regions), exclude: []};
  }

  if (regions && typeof regions === 'object') {
    return {
      include: normalizeList(regions.include),
      exclude: normalizeList(regions.exclude),
    };
  }

  return {include: [], exclude: []};
}

function createRegionNames(locale) {
  try {
    if (Intl.DisplayNames.supportedLocalesOf([locale]).length === 0) return null;
    return new Intl.DisplayNames([locale], {type: 'region', fallback: 'none'});
  } catch {
    return null;
  }
}

const regionNamesZh = createRegionNames('zh-Hant');
const regionNamesEn = createRegionNames('en');
const regionInfoCache = new Map();

function localizedRegionName(displayNames, code, fallback) {
  try {
    const name = displayNames?.of(code);
    return typeof name === 'string' && name && name !== code ? name : fallback;
  } catch {
    return fallback;
  }
}

// Return plain text only; callers that build HTML must escape these fields.
// Preserve the source code for display while using ISO GB for the UK alias.
export function regionInfo(countryCode) {
  const code = normalizeRegionCode(countryCode);
  if (regionInfoCache.has(code)) return regionInfoCache.get(code);

  const canonicalCode = canonicalRegionCode(code);
  const known = /^[A-Z]{2}$/.test(canonicalCode)
    && Object.prototype.hasOwnProperty.call(REGION_NAMES, canonicalCode);
  const info = Object.freeze({
    code,
    canonicalCode,
    known,
    flag: known
      ? String.fromCodePoint(...[...canonicalCode].map(character => 127397 + character.charCodeAt(0)))
      : code ? '🏳️' : '🌐',
    nameZh: known
      ? localizedRegionName(regionNamesZh, canonicalCode, REGION_NAMES_ZH[canonicalCode])
      : code ? '未知地區' : '全部地區',
    nameEn: known
      ? localizedRegionName(regionNamesEn, canonicalCode, REGION_NAMES[canonicalCode])
      : code ? 'Unknown region' : 'All regions',
  });

  // The finite country registry bounds the cache even for malformed input.
  if (known || !code) regionInfoCache.set(code, info);
  return info;
}

export function regionLabel(countryCode) {
  const info = regionInfo(countryCode);
  return `${info.flag} ${info.nameZh} ${info.nameEn}${info.code ? ` · ${info.code}` : ''}`;
}

export function flag(countryCode) {
  return regionInfo(countryCode).flag;
}

export function regName(countryCode) {
  const info = regionInfo(countryCode);
  return info.known ? info.nameEn : info.code;
}

export function statusOf(quest, now = Date.now()) {
  const config = quest?.config || {};
  const start = config.starts_at ? new Date(config.starts_at).getTime() : 0;
  const end = config.expires_at ? new Date(config.expires_at).getTime() : Infinity;

  if (now < start) return 'upcoming';
  if (now > end) return 'ended';
  return 'live';
}

// Short alias for callers that prefer the noun used by the UI.
export const status = statusOf;

export function getRewards(config = {}) {
  const rewards = config.rewards_config?.rewards ?? config.rewards ?? [];
  return Array.isArray(rewards) ? rewards : [];
}

export function rewardCategory(reward) {
  if (!reward) return null;

  const type = reward.type;
  const name = String(reward.messages?.name || reward.name || '').toLowerCase();
  if (type === 4 || reward.orb_quantity || /\borbs?\b/.test(name)) return 'orbs';
  if (type === 3 || /avatar decoration|profile effect|collectible/.test(name)) return 'avatar';
  if (type === 5 || /\bnitro\b/.test(name)) return 'nitro';
  return 'ingame';
}

export function questRewardCategories(quest) {
  const categories = new Set();
  getRewards(quest?.config || {}).forEach(reward => {
    const category = rewardCategory(reward);
    if (category) categories.add(category);
  });
  return categories;
}

export function taskCategory(type) {
  const value = String(type || '').toUpperCase();
  if (value.startsWith('WATCH')) return 'watch';
  return 'play';
}

export function getTasks(config = {}) {
  const taskConfig = config.task_config_v2 || config.task_config || {};
  const tasks = taskConfig.tasks;
  return tasks && typeof tasks === 'object' && !Array.isArray(tasks) ? tasks : {};
}

export function questTaskCategories(quest) {
  const categories = new Set();
  Object.entries(getTasks(quest?.config || {})).forEach(([key, task]) => {
    const value = task && typeof task === 'object' ? task : {};
    categories.add(taskCategory(value.type || value.event_name || key));
  });
  return categories;
}

export function assetURL(questId, asset) {
  if (!asset) return null;

  const value = String(asset).trim();
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return escapeHtml(value);
  if (value.startsWith('quests/')) {
    return escapeHtml(`https://cdn.discordapp.com/${value.replace(/^\/+/, '')}`);
  }

  // Local demo assets are document-relative. Keeping these paths intact makes
  // them resolve against index.html even though this helper lives in /js/.
  if (/^(?:\.\.?\/|\/)/.test(value)) return escapeHtml(value);

  const cleanAsset = value.replace(/^\/+/, '');
  return escapeHtml(`${QUEST_CDN}/${encodeURIComponent(String(questId))}/${cleanAsset}`);
}

export function safeLink(value) {
  const link = String(value || '').trim();
  return /^https?:\/\//i.test(link) ? escapeHtml(link) : '';
}

export function fmtDate(value) {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return escapeHtml(value);
  return date.toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function daysLeft(value, now = Date.now()) {
  if (!value) return null;

  const expiresAt = new Date(value).getTime();
  if (Number.isNaN(expiresAt)) return null;
  const remaining = expiresAt - now;
  if (remaining <= 0) return 0;
  return Math.ceil(remaining / 86_400_000);
}

function restrictionFor(quest, regionsMap) {
  const id = typeof quest === 'object' ? quest?.id : quest;
  if (!id || !regionsMap) return null;
  return regionsMap[String(id)] || null;
}

export function matchesRegion(quest, countryCode, regionsMap) {
  const selectedCode = canonicalRegionCode(countryCode);
  if (!selectedCode) return true;

  const restriction = restrictionFor(quest, regionsMap);
  if (!restriction) return true;

  const {include, exclude} = normalizeRegions(restriction.regions);
  // Exclusions remain authoritative even when a record is marked global.
  if (exclude.some(code => canonicalRegionCode(code) === selectedCode)) return false;
  if (include.length === 0) return true;
  return include.some(code => canonicalRegionCode(code) === selectedCode);
}

export function matchesAge(quest, ageFilter, regionsMap) {
  if (!ageFilter || ageFilter === 'all') return true;

  const gated = Boolean(restrictionFor(quest, regionsMap)?.show_age_gate);
  return ageFilter === 'age' ? gated : !gated;
}

export function searchText(quest) {
  const config = quest?.config || {};
  const messages = config.messages || {};
  const application = config.application || {};
  return [
    messages.quest_name,
    messages.game_title,
    messages.game_publisher,
    application.name,
    quest?.id,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}
