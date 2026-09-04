import {
  EXCLUDED_QUEST_IDS,
  FALLBACK_QUEST_SOURCE,
  MOCK_QUESTS,
  QUEST_SOURCES,
  RESTRICTIONS_SOURCE,
} from './config.js';
import {normalizeRegions} from './utils.js';

function warningMessage(label, detail) {
  const suffix = detail ? ` (${detail})` : '';
  return `${label}${suffix}`;
}

function errorDetail(error) {
  return error instanceof Error ? error.message : String(error || '未知錯誤');
}

async function fetchJson(url, label, fetchImpl) {
  const response = await fetchImpl(url, {cache: 'no-store'});
  if (!response.ok) throw new Error(`${label} HTTP ${response.status}`);
  return response.json();
}

export function normalizeQuest(rawQuest) {
  if (!rawQuest || typeof rawQuest !== 'object' || Array.isArray(rawQuest)) {
    return null;
  }

  const wrapped = Boolean(
    rawQuest.config
      && typeof rawQuest.config === 'object'
      && !Array.isArray(rawQuest.config),
  );
  const config = wrapped ? rawQuest.config : rawQuest;
  const id = String(rawQuest.id ?? config.id ?? '').trim();
  if (!id || EXCLUDED_QUEST_IDS.has(id)) return null;

  // Keep every source field. Older lists contain a flat config, while newer
  // lists wrap it in {id, config}; the UI always receives the wrapped shape.
  return wrapped
    ? {...rawQuest, id, config}
    : {id, config: {...config, id}};
}

function restrictionValue(rawRestriction) {
  return {
    show_age_gate: Boolean(rawRestriction.show_age_gate),
    is_global: Boolean(rawRestriction.is_global),
    regions: normalizeRegions(rawRestriction.regions),
  };
}

export function buildRegionsMap(restrictions) {
  const candidates = new Map();

  const addCandidate = (id, restriction, sourcePriority) => {
    const normalizedId = String(id ?? '').trim();
    if (!normalizedId) return;

    const regionCount =
      restriction.regions.include.length + restriction.regions.exclude.length;
    const score = sourcePriority * 100 + (regionCount ? 10 : 0)
      + (restriction.is_global ? 0 : 1);
    const current = candidates.get(normalizedId);
    if (!current || score > current.score) {
      candidates.set(normalizedId, {restriction, score});
    }
  };

  (Array.isArray(restrictions) ? restrictions : []).forEach(rawRestriction => {
    if (!rawRestriction || typeof rawRestriction !== 'object') return;

    const restriction = restrictionValue(rawRestriction);
    // A restriction explicitly keyed by its own id always beats one inherited
    // through replacement_id, regardless of how many regions either contains.
    addCandidate(rawRestriction.id, restriction, 2);
    addCandidate(rawRestriction.replacement_id, restriction, 1);
  });

  const regionsMap = Object.create(null);
  candidates.forEach(({restriction}, id) => {
    regionsMap[id] = restriction;
  });
  return regionsMap;
}

function mockResult(warnings) {
  const quests = MOCK_QUESTS.map(normalizeQuest).filter(Boolean);
  const regionsMap = Object.create(null);
  quests.forEach(quest => {
    regionsMap[quest.id] = {
      show_age_gate: false,
      is_global: true,
      regions: {include: [], exclude: []},
    };
  });

  return {quests, regionsMap, warnings, sourceMode: 'mock'};
}

export async function loadQuestData({fetchImpl = globalThis.fetch} = {}) {
  const warnings = [];
  if (typeof fetchImpl !== 'function') {
    warnings.push('此環境不支援 fetch，已載入示範任務。');
    return mockResult(warnings);
  }

  const questLabels = QUEST_SOURCES.map((_, index) => `任務資料 ${index + 1}`);
  const requests = [
    ...QUEST_SOURCES.map((url, index) => fetchJson(url, questLabels[index], fetchImpl)),
    fetchJson(FALLBACK_QUEST_SOURCE, '備援任務資料', fetchImpl),
    fetchJson(RESTRICTIONS_SOURCE, '任務限制資料', fetchImpl),
  ];
  const results = await Promise.allSettled(requests);

  const dataMap = new Map();
  const mainResults = results.slice(0, QUEST_SOURCES.length);
  mainResults.forEach((result, index) => {
    const label = questLabels[index];
    if (result.status === 'rejected') {
      warnings.push(warningMessage(`${label}無法載入`, errorDetail(result.reason)));
      return;
    }
    if (!Array.isArray(result.value)) {
      warnings.push(`${label}格式不正確，已略過。`);
      return;
    }

    // Later primary shards deliberately replace earlier records with the same
    // id, matching the tracker repository's source precedence.
    result.value.forEach(rawQuest => {
      const quest = normalizeQuest(rawQuest);
      if (quest) dataMap.set(quest.id, quest);
    });
  });

  const fallbackResult = results[QUEST_SOURCES.length];
  if (fallbackResult.status === 'fulfilled' && Array.isArray(fallbackResult.value)) {
    fallbackResult.value.forEach(rawQuest => {
      const quest = normalizeQuest(rawQuest);
      if (quest && !dataMap.has(quest.id)) dataMap.set(quest.id, quest);
    });
  } else if (fallbackResult.status === 'rejected') {
    warnings.push(warningMessage(
      '備援任務資料無法載入',
      errorDetail(fallbackResult.reason),
    ));
  } else {
    warnings.push('備援任務資料格式不正確，已略過。');
  }

  const restrictionsResult = results[QUEST_SOURCES.length + 1];
  let restrictions = [];
  if (restrictionsResult.status === 'fulfilled') {
    if (Array.isArray(restrictionsResult.value?.quests)) {
      restrictions = restrictionsResult.value.quests;
    } else {
      warnings.push('任務限制資料格式不正確，地區與年齡篩選已暫停。');
    }
  } else {
    warnings.push(warningMessage(
      '任務限制資料無法載入，地區與年齡篩選已暫停',
      errorDetail(restrictionsResult.reason),
    ));
  }

  if (dataMap.size === 0) {
    warnings.push('所有公開任務資料來源都無法使用，已載入示範任務。');
    return mockResult(warnings);
  }

  return {
    quests: [...dataMap.values()],
    regionsMap: buildRegionsMap(restrictions),
    warnings,
    sourceMode: 'remote',
  };
}
