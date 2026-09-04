export const QUEST_SOURCES = Object.freeze([
  'https://raw.githubusercontent.com/xGustavvo/discord-api-tracker/refs/heads/main/data/quests-01.json',
  'https://raw.githubusercontent.com/xGustavvo/discord-api-tracker/refs/heads/main/data/quests-02.json',
]);

export const FALLBACK_QUEST_SOURCE =
  'https://raw.githubusercontent.com/xGustavvo/discord-api-tracker/refs/heads/main/quest.json';

export const RESTRICTIONS_SOURCE =
  'https://gist.githubusercontent.com/xGustavvo/3d08b7369eb34b50834815fd43176cae/raw';

export const QUEST_CDN = 'https://cdn.discordapp.com/quests';

export const EXCLUDED_QUEST_IDS = new Set([
  '1193992107035983872',
  '1417206015245418566',
  '1223393873447878656',
  '1276640451235156082',
  '1483951358322147380',
  '1519474065293967471',
  '1537905653681487924',
]);

export const REGION_NAMES = Object.freeze({
  US: 'United States',
  UK: 'United Kingdom',
  GB: 'United Kingdom',
  CA: 'Canada',
  AU: 'Australia',
  BR: 'Brazil',
  DE: 'Germany',
  FR: 'France',
  IT: 'Italy',
  NL: 'Netherlands',
  PL: 'Poland',
  CH: 'Switzerland',
  JP: 'Japan',
  KR: 'South Korea',
  HK: 'Hong Kong',
  SG: 'Singapore',
  VN: 'Vietnam',
  TW: 'Taiwan',
  MX: 'Mexico',
  ES: 'Spain',
  PT: 'Portugal',
  AR: 'Argentina',
  CL: 'Chile',
  CO: 'Colombia',
  NZ: 'New Zealand',
  SE: 'Sweden',
  NO: 'Norway',
  FI: 'Finland',
  DK: 'Denmark',
  BE: 'Belgium',
  AT: 'Austria',
  IE: 'Ireland',
  IN: 'India',
  TH: 'Thailand',
  MY: 'Malaysia',
  ID: 'Indonesia',
  PH: 'Philippines',
  ZA: 'South Africa',
  TR: 'Turkey',
});

export const PLATFORM_NAMES = Object.freeze({
  0: 'Any platform',
  1: 'Xbox',
  2: 'PlayStation',
  3: 'Nintendo Switch',
  4: 'PC',
});

export const REWARD_TYPES = Object.freeze({
  1: 'Code Reward',
  2: 'In-game Reward',
  3: 'Avatar Decoration',
  4: 'Discord Orbs',
  5: 'Discord Nitro',
});

export const REWARD_CAT_LABEL = Object.freeze({
  orbs: '⭐ Orbs',
  avatar: '🧩 頭像裝飾',
  ingame: '🎮 遊戲內',
  nitro: '💎 Nitro',
});

export const TASK_CAT_LABEL = Object.freeze({
  play: '🎮 遊玩',
  watch: '📺 觀看',
});

// These records keep the page usable when every public quest source is offline.
// Relative image paths intentionally remain relative to index.html; assetURL()
// preserves document-relative paths instead of treating them as CDN asset names.
export const MOCK_QUESTS = Object.freeze([
  {
    id: 'demo-mhw',
    config: {
      application: {name: 'Monster Hunter Wilds'},
      messages: {
        quest_name: '魔物獵人荒野：公會狩獵任務',
        game_title: 'Monster Hunter Wilds',
        game_publisher: 'CAPCOM',
      },
      assets: {hero: '../image.png', logotype: ''},
      rewards: [{name: '限定武器吊飾與頭像裝飾', type: 3}],
      task_config_v2: {
        tasks: {play: {type: 'play', target: '遊玩 15 分鐘'}},
      },
      starts_at: '2026-07-01T00:00:00Z',
      expires_at: '2026-07-31T23:59:59Z',
    },
  },
  {
    id: 'demo-rushia',
    config: {
      application: {name: 'Hololive Fantasy'},
      messages: {
        quest_name: 'Rushia My Beloved：蝶戀彩蛋任務',
        game_title: 'Hololive Alternative',
        game_publisher: 'Cover Corp',
      },
      assets: {hero: '../d.png', logotype: ''},
      rewards: [{name: '專屬蝶與骷髏頭像框', type: 3}],
      task_config_v2: {
        tasks: {watch: {type: 'watch', target: '觀看直播 10 分鐘'}},
      },
      starts_at: '2026-06-01T00:00:00Z',
      expires_at: '2026-08-01T23:59:59Z',
    },
  },
  {
    id: 'demo-valorant',
    config: {
      application: {name: 'VALORANT'},
      messages: {
        quest_name: '特戰英豪：第三幕挑戰賽',
        game_title: 'VALORANT',
        game_publisher: 'Riot Games',
      },
      assets: {
        hero: 'https://raw.githubusercontent.com/rushiaismywaifu/rushiaismywaifu.github.io/main/image.png',
        logotype: '',
      },
      rewards: [{name: 'Discord Orbs x 500', type: 4, orb_quantity: 500}],
      task_config_v2: {
        tasks: {play: {type: 'play', target: '在對戰中取得 1 次勝利'}},
      },
      starts_at: '2026-07-01T00:00:00Z',
      expires_at: '2026-07-20T23:59:59Z',
    },
  },
]);
