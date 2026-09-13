import {loadQuestData} from './data.js';
import {
  matchesAge,
  matchesRegion,
  questRewardCategories,
  questTaskCategories,
  searchText,
  setInert,
  statusOf,
} from './utils.js';
import {
  closeQuestModal,
  elements,
  finishLoading,
  isQuestModalOpen,
  openQuestModal,
  renderActiveFilters,
  renderFatalError,
  renderQuestGrid,
  renderRegionOptions,
  setLoading,
  trapModalFocus,
  updateCounts,
  updateFilterButtons,
  updateResultsHeader,
} from './view.js';

const state = {
  quests: [],
  regionsMap: Object.create(null),
  filter: 'live',
  reward: 'all',
  task: 'all',
  search: '',
  searchRaw: '',
  region: '',
  age: 'all',
  sort: 'newest',
  sourceMode: 'remote',
  warnings: [],
  lastUpdated: null,
};

let questMeta = new Map();
let loading = false;
let filterTrigger = null;
let searchFrame = 0;

function buildQuestMeta() {
  questMeta = new Map(
    state.quests.map(quest => [quest.id, {
      status: statusOf(quest),
      rewards: questRewardCategories(quest),
      tasks: questTaskCategories(quest),
    }]),
  );
}

function calculateCounts() {
  const counts = {all: 0, live: 0, upcoming: 0, ended: 0};
  const rewardCounts = {all: 0, orbs: 0, avatar: 0, ingame: 0, nitro: 0};
  const taskCounts = {all: 0, play: 0, watch: 0};
  let liveOrbs = 0;

  state.quests.forEach(quest => {
    const meta = questMeta.get(quest.id);
    counts.all += 1;
    counts[meta.status] += 1;
    rewardCounts.all += 1;
    meta.rewards.forEach(category => { rewardCounts[category] += 1; });
    if (meta.status === 'live' && meta.rewards.has('orbs')) liveOrbs += 1;
    taskCounts.all += 1;
    meta.tasks.forEach(category => { taskCounts[category] += 1; });
  });

  return {counts, rewardCounts, taskCounts, liveOrbs};
}

function filteredQuests() {
  const result = state.quests.filter(quest => {
    const meta = questMeta.get(quest.id);
    if (state.filter !== 'all' && meta.status !== state.filter) return false;
    if (state.search && !searchText(quest).includes(state.search)) return false;
    if (!matchesRegion(quest, state.region, state.regionsMap)) return false;
    if (!matchesAge(quest, state.age, state.regionsMap)) return false;
    if (state.reward !== 'all' && !meta.rewards.has(state.reward)) return false;
    if (state.task !== 'all' && !meta.tasks.has(state.task)) return false;
    return true;
  });

  const keys = new Map(result.map(quest => {
    const config = quest.config || {};
    return [quest.id, {
      start: timestamp(config.starts_at, 0),
      end: timestamp(config.expires_at, Number.POSITIVE_INFINITY),
      name: config.messages?.quest_name || '',
      game: config.messages?.game_title || config.application?.name || '',
    }];
  }));

  return result.sort((a, b) => {
    const first = keys.get(a.id);
    const second = keys.get(b.id);
    if (state.sort === 'ending') return first.end - second.end;
    if (state.sort === 'name') return first.name.localeCompare(second.name, 'zh-Hant');
    if (state.sort === 'game') return first.game.localeCompare(second.game, 'zh-Hant');
    return second.start - first.start;
  });
}

function timestamp(value, fallback) {
  if (!value) return fallback;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? fallback : parsed;
}

function render() {
  const focusedChip = elements.activeFilters.contains(document.activeElement)
    ? document.activeElement.closest('[data-clear-filter]')
    : null;
  const chipIndex = focusedChip
    ? [...elements.activeFilters.querySelectorAll('[data-clear-filter]')].indexOf(focusedChip)
    : -1;
  buildQuestMeta();
  const {counts, rewardCounts, taskCounts, liveOrbs} = calculateCounts();
  const quests = filteredQuests();

  updateCounts(counts, rewardCounts, taskCounts, liveOrbs);
  updateFilterButtons(state);
  renderActiveFilters(state);
  updateResultsHeader({
    visibleCount: quests.length,
    totalCount: state.quests.length,
    filter: state.filter,
    lastUpdated: state.lastUpdated,
    sourceMode: state.sourceMode,
    warningCount: state.warnings.length,
  });
  renderQuestGrid(quests, questMeta, state.regionsMap);

  if (focusedChip) {
    const chips = [...elements.activeFilters.querySelectorAll('[data-clear-filter]')];
    const focusTarget = chips.find(chip => chip.dataset.clearFilter === focusedChip.dataset.clearFilter)
      || chips[Math.min(chipIndex, chips.length - 1)]
      || elements.search;
    focusTarget.focus({preventScroll: true});
  }
}

async function load() {
  if (loading) return;
  loading = true;
  setLoading(state.quests.length > 0);

  try {
    const result = await loadQuestData();
    state.quests = result.quests;
    state.regionsMap = result.regionsMap;
    state.sourceMode = result.sourceMode;
    state.warnings = result.warnings;
    state.lastUpdated = new Date();
    if (result.sourceMode === 'mock') state.filter = 'all';

    renderRegionOptions(state.regionsMap, state.region);
    if (state.region && elements.regionSel.value !== state.region) state.region = '';
    render();

    result.warnings.forEach(warning => console.warn(`[Quest Explorer] ${warning}`));
  } catch (error) {
    console.error('[Quest Explorer] 無法初始化頁面：', error);
    renderFatalError(error instanceof Error ? error.message : '未知錯誤');
  } finally {
    loading = false;
    finishLoading();
  }
}

function bindFilterGroup(attribute, stateKey) {
  document.querySelectorAll(`.nav-item[data-${attribute}]`).forEach(button => {
    button.addEventListener('click', () => {
      state[stateKey] = button.dataset[attribute];
      render();
    });
  });
}

function resetFilterState() {
  window.cancelAnimationFrame(searchFrame);
  state.filter = 'all';
  state.reward = 'all';
  state.task = 'all';
  state.search = '';
  state.searchRaw = '';
  state.region = '';
  state.age = 'all';
}

function clearFilters() {
  const restoreFocus = document.activeElement === elements.clearFilters
    || document.activeElement?.matches('[data-reset-filters]');
  resetFilterState();
  render();
  if (restoreFocus) elements.search.focus({preventScroll: true});
}

function clearFilter(key) {
  const defaults = {filter: 'all', reward: 'all', task: 'all', region: '', age: 'all', search: ''};
  if (!Object.hasOwn(defaults, key)) return;
  state[key] = defaults[key];
  if (key === 'search') {
    window.cancelAnimationFrame(searchFrame);
    state.searchRaw = '';
  }
  render();
}

function openFilterPanel() {
  if (document.body.classList.contains('filter-open')) return;
  filterTrigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  setInert(elements.sidebar, false);
  elements.sidebar.removeAttribute('aria-hidden');
  elements.sidebar.setAttribute('role', 'dialog');
  elements.sidebar.setAttribute('aria-modal', 'true');
  setInert(elements.main, true);
  document.body.classList.add('filter-open');
  elements.filterToggle.setAttribute('aria-expanded', 'true');
  window.setTimeout(() => {
    if (document.body.classList.contains('filter-open')) elements.sidebarClose.focus();
  }, 80);
}

function closeFilterPanel({restoreFocus = true} = {}) {
  if (!document.body.classList.contains('filter-open')) return;
  setInert(elements.main, false);
  if (restoreFocus) {
    const target = filterTrigger || elements.filterToggle;
    target.focus({preventScroll: true});
  }
  document.body.classList.remove('filter-open');
  elements.filterToggle.setAttribute('aria-expanded', 'false');
  elements.sidebar.removeAttribute('role');
  elements.sidebar.removeAttribute('aria-modal');
  filterTrigger = null;
  syncSidebarAccessibility();
}

function syncSidebarAccessibility() {
  const mobile = window.matchMedia('(max-width: 880px)').matches;
  const open = document.body.classList.contains('filter-open');
  if (mobile && !open && elements.sidebar.contains(document.activeElement)) {
    elements.filterToggle.focus({preventScroll: true});
  }
  setInert(elements.sidebar, mobile && !open);
  if (mobile && !open) elements.sidebar.setAttribute('aria-hidden', 'true');
  else elements.sidebar.removeAttribute('aria-hidden');
}

function trapFilterFocus(event) {
  if (event.key !== 'Tab' || !document.body.classList.contains('filter-open') || isQuestModalOpen()) return;
  const focusable = [...elements.sidebar.querySelectorAll('button, a[href], select, input, [tabindex]:not([tabindex="-1"])')]
    .filter(element => !element.disabled && element.getClientRects().length > 0 && !element.closest('[hidden], [inert]'));
  const first = focusable[0];
  const last = focusable.at(-1);
  if (!first) return;
  if (!elements.sidebar.contains(document.activeElement)) {
    event.preventDefault();
    (event.shiftKey ? last : first).focus();
  } else if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function bindEvents() {
  bindFilterGroup('filter', 'filter');
  bindFilterGroup('reward', 'reward');
  bindFilterGroup('task', 'task');

  elements.search.addEventListener('input', event => {
    window.cancelAnimationFrame(searchFrame);
    searchFrame = window.requestAnimationFrame(() => {
      state.searchRaw = event.target.value;
      state.search = state.searchRaw.trim().toLowerCase();
      render();
    });
  });
  elements.regionSel.addEventListener('change', event => {
    state.region = event.target.value;
    render();
  });
  elements.ageSel.addEventListener('change', event => {
    state.age = event.target.value;
    render();
  });
  elements.sortSel.addEventListener('change', event => {
    state.sort = event.target.value;
    render();
  });
  elements.clearFilters.addEventListener('click', clearFilters);
  elements.refreshBtn.addEventListener('click', load);
  document.getElementById('searchClear')?.addEventListener('click', () => {
    clearFilter('search');
    elements.search.focus({preventScroll: true});
  });
  elements.activeFilters.addEventListener('click', event => {
    const chip = event.target.closest('[data-clear-filter]');
    if (chip) clearFilter(chip.dataset.clearFilter);
  });
  document.querySelectorAll('[data-quick-filter]').forEach(button => {
    button.addEventListener('click', () => {
      const quickFilter = button.dataset.quickFilter;
      if (!['live', 'upcoming', 'orbs'].includes(quickFilter)) return;
      resetFilterState();
      state.filter = quickFilter === 'orbs' ? 'live' : quickFilter;
      if (quickFilter === 'orbs') state.reward = 'orbs';
      render();
    });
  });
  elements.state.addEventListener('click', event => {
    if (event.target.closest('[data-reset-filters]')) clearFilters();
  });

  elements.grid.addEventListener('click', event => {
    const card = event.target.closest('.card[data-id]');
    if (!card) return;
    const quest = state.quests.find(item => item.id === card.dataset.id);
    openQuestModal(quest, state.regionsMap[card.dataset.id]);
  });

  elements.modalCard.addEventListener('click', event => {
    if (event.target.closest('.modal-close')) closeQuestModal();
  });
  elements.modal.addEventListener('click', event => {
    if (event.target === elements.modal) closeQuestModal();
  });

  elements.filterToggle.addEventListener('click', openFilterPanel);
  elements.sidebarClose.addEventListener('click', () => closeFilterPanel());
  elements.sidebarBackdrop.addEventListener('click', () => closeFilterPanel());
  document.getElementById('applyFilters')?.addEventListener('click', () => closeFilterPanel());

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      if (isQuestModalOpen()) closeQuestModal();
      else closeFilterPanel();
      return;
    }
    trapModalFocus(event);
    trapFilterFocus(event);

    if (event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const target = event.target;
      const isTyping = target instanceof HTMLElement
        && (target.matches('input, textarea, select, button') || target.isContentEditable);
      if (!isTyping && !isQuestModalOpen() && !document.body.classList.contains('filter-open')) {
        event.preventDefault();
        elements.search.focus();
      }
    }
  });

  document.addEventListener('error', event => {
    if (event.target instanceof HTMLImageElement || event.target instanceof HTMLVideoElement) {
      event.target.hidden = true;
    }
  }, true);

  window.matchMedia('(min-width: 881px)').addEventListener('change', event => {
    if (event.matches) closeFilterPanel({restoreFocus: false});
    syncSidebarAccessibility();
  });
}

function init() {
  syncSidebarAccessibility();
  bindEvents();
  load();
  window.setInterval(() => {
    if (!document.hidden && state.quests.length > 0 && !isQuestModalOpen()) render();
  }, 60_000);
}

init();
