/**
 * AI Blocker — Background Service Worker
 * Handles declarativeNetRequest rule management and message passing.
 */

// Category definitions
export interface Category {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
  networkRules: number;
  cosmeticRules: number;
}

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'chat-widgets', label: 'Chat Widgets', description: 'ChatGPT embeds, Intercom AI, Drift AI, etc.', enabled: true, networkRules: 0, cosmeticRules: 0 },
  { id: 'search-ai', label: 'Search AI', description: 'Google SGE, Bing Copilot, DDG AI', enabled: true, networkRules: 0, cosmeticRules: 0 },
  { id: 'content-ai', label: 'Content AI', description: 'Grammarly, Notion AI, WordPress AI assistant', enabled: true, networkRules: 0, cosmeticRules: 0 },
  { id: 'social-ai', label: 'Social AI', description: 'Twitter Grok, Meta AI, LinkedIn AI', enabled: true, networkRules: 0, cosmeticRules: 0 },
  { id: 'tracking', label: 'AI Tracking', description: 'AI analytics endpoints, personalization scripts', enabled: true, networkRules: 0, cosmeticRules: 0 },
  { id: 'overlays', label: 'AI Overlays', description: '"Try AI" popups, AI onboarding modals', enabled: true, networkRules: 0, cosmeticRules: 0 },
];

export interface BlockStats {
  networkBlocked: number;
  cosmeticHidden: number;
  byCategory: Record<string, { networkBlocked: number; cosmeticHidden: number }>;
}

const DEFAULT_STATS: BlockStats = {
  networkBlocked: 0,
  cosmeticHidden: 0,
  byCategory: {},
};

interface StorageData {
  categories?: Category[];
  stats?: BlockStats;
  enabled?: boolean;
  whitelist?: string[];
  lastFilterUpdate?: number;
  filterListUpdates?: Record<string, string>;
}

// Initialize storage on install
browser.runtime.onInstalled.addListener(async () => {
  const stored: StorageData = await browser.storage.local.get(['categories', 'stats', 'enabled', 'whitelist', 'lastFilterUpdate']);
  if (!stored.categories) {
    await browser.storage.local.set({ categories: DEFAULT_CATEGORIES });
  }
  if (!stored.stats) {
    await browser.storage.local.set({ stats: DEFAULT_STATS });
  }
  if (stored.enabled === undefined) {
    await browser.storage.local.set({ enabled: true });
  }
  if (!stored.whitelist) {
    await browser.storage.local.set({ whitelist: [] });
  }
  if (!stored.lastFilterUpdate) {
    await browser.storage.local.set({ lastFilterUpdate: 0 });
  }

  // Apply DNR rules based on enabled categories
  await applyDnrRules();

  // Check for filter list updates on install
  await checkFilterListUpdates();
});

// Apply declarativeNetRequest rules
async function applyDnrRules() {
  const { categories, enabled }: StorageData = await browser.storage.local.get(['categories', 'enabled']);
  if (!enabled) {
    await browser.declarativeNetRequest.updateEnabledRulesets({
      disableRulesetIds: getAllRulesetIds(),
    }).catch(() => {});
    return;
  }

  const cats: Category[] = categories || DEFAULT_CATEGORIES;
  const enabledRulesets = cats.filter(c => c.enabled).map(c => `rules_${c.id}`);
  const disabledRulesets = cats.filter(c => !c.enabled).map(c => `rules_${c.id}`);

  try {
    await browser.declarativeNetRequest.updateEnabledRulesets({
      enableRulesetIds: enabledRulesets,
      disableRulesetIds: disabledRulesets,
    });
  } catch {
    // Ruleset may not exist yet in dev
  }
}

function getAllRulesetIds(): string[] {
  return DEFAULT_CATEGORIES.map(c => `rules_${c.id}`);
}

// Listen for messages from popup/content scripts
browser.runtime.onMessage.addListener((message: any, _sender: any, sendResponse: (response?: any) => void) => {
  if (message.type === 'GET_STATS') {
    browser.storage.local.get('stats').then(({ stats }: StorageData) => {
      sendResponse(stats || DEFAULT_STATS);
    });
    return true; // async
  }

  if (message.type === 'GET_CATEGORIES') {
    browser.storage.local.get('categories').then(({ categories }: StorageData) => {
      sendResponse(categories || DEFAULT_CATEGORIES);
    });
    return true;
  }

  if (message.type === 'TOGGLE_CATEGORY') {
    browser.storage.local.get('categories').then(async ({ categories }: StorageData) => {
      const cats: Category[] = categories || DEFAULT_CATEGORIES;
      const cat = cats.find(c => c.id === message.categoryId);
      if (cat) {
        cat.enabled = !cat.enabled;
        await browser.storage.local.set({ categories: cats });
        await applyDnrRules();
        sendResponse({ success: true, categories: cats });
      } else {
        sendResponse({ success: false });
      }
    });
    return true;
  }

  if (message.type === 'TOGGLE_ENABLED') {
    browser.storage.local.get('enabled').then(async ({ enabled }: StorageData) => {
      const newState = !enabled;
      await browser.storage.local.set({ enabled: newState });
      await applyDnrRules();
      sendResponse({ success: true, enabled: newState });
    });
    return true;
  }

  if (message.type === 'GET_ENABLED') {
    browser.storage.local.get('enabled').then(({ enabled }: StorageData) => {
      sendResponse(enabled !== false);
    });
    return true;
  }

  if (message.type === 'INCREMENT_NETWORK') {
    browser.storage.local.get('stats').then(async ({ stats }: StorageData) => {
      const s: BlockStats = stats || DEFAULT_STATS;
      s.networkBlocked++;
      const cat: string = message.category || 'unknown';
      if (!s.byCategory[cat]) s.byCategory[cat] = { networkBlocked: 0, cosmeticHidden: 0 };
      s.byCategory[cat].networkBlocked++;
      await browser.storage.local.set({ stats: s });
      sendResponse({ success: true });
    });
    return true;
  }

  if (message.type === 'INCREMENT_COSMETIC') {
    browser.storage.local.get('stats').then(async ({ stats }: StorageData) => {
      const s: BlockStats = stats || DEFAULT_STATS;
      s.cosmeticHidden++;
      const cat: string = message.category || 'unknown';
      if (!s.byCategory[cat]) s.byCategory[cat] = { networkBlocked: 0, cosmeticHidden: 0 };
      s.byCategory[cat].cosmeticHidden++;
      await browser.storage.local.set({ stats: s });
      sendResponse({ success: true });
    });
    return true;
  }

  if (message.type === 'INCREMENT_COSMETIC_BATCH') {
    browser.storage.local.get('stats').then(async ({ stats }: StorageData) => {
      const s: BlockStats = stats || DEFAULT_STATS;
      const counts: Record<string, number> = message.counts || {};
      let total = 0;
      for (const [cat, count] of Object.entries(counts)) {
        total += count;
        if (!s.byCategory[cat]) s.byCategory[cat] = { networkBlocked: 0, cosmeticHidden: 0 };
        s.byCategory[cat].cosmeticHidden += count;
      }
      s.cosmeticHidden += total;
      await browser.storage.local.set({ stats: s });
      sendResponse({ success: true });
    });
    return true;
  }

  if (message.type === 'RESET_STATS') {
    browser.storage.local.set({ stats: DEFAULT_STATS }).then(() => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (message.type === 'GET_WHITELIST') {
    browser.storage.local.get('whitelist').then(({ whitelist }: StorageData) => {
      sendResponse(whitelist || []);
    });
    return true;
  }

  if (message.type === 'ADD_WHITELIST') {
    browser.storage.local.get('whitelist').then(async ({ whitelist }: StorageData) => {
      const list: string[] = whitelist || [];
      if (!list.includes(message.domain)) {
        list.push(message.domain);
        await browser.storage.local.set({ whitelist: list });
      }
      sendResponse({ success: true, whitelist: list });
    });
    return true;
  }

  if (message.type === 'REMOVE_WHITELIST') {
    browser.storage.local.get('whitelist').then(async ({ whitelist }: StorageData) => {
      const list: string[] = (whitelist || []).filter((d: string) => d !== message.domain);
      await browser.storage.local.set({ whitelist: list });
      sendResponse({ success: true, whitelist: list });
    });
    return true;
  }
});

// Filter list auto-update
const FILTER_LIST_UPDATE_INTERVAL = 7 * 24 * 60 * 60 * 1000; // 7 days in ms
const FILTER_LIST_BASE_URL = 'https://raw.githubusercontent.com/Dr-Brook/ai-blocker/main/filter-lists';
const FILTER_LIST_FILES = [
  'chat-widgets.txt',
  'search-ai.txt',
  'content-ai.txt',
  'social-ai.txt',
  'tracking.txt',
  'overlays.txt',
  'cosmetic-rules.txt',
];

async function checkFilterListUpdates() {
  const { lastFilterUpdate }: StorageData = await browser.storage.local.get('lastFilterUpdate');
  const now = Date.now();

  if (lastFilterUpdate && now - lastFilterUpdate < FILTER_LIST_UPDATE_INTERVAL) {
    return; // Not time yet
  }

  try {
    const updates: Record<string, string> = {};
    for (const file of FILTER_LIST_FILES) {
      const url = `${FILTER_LIST_BASE_URL}/${file}`;
      const response = await fetch(url);
      if (response.ok) {
        updates[file] = await response.text();
      }
    }

    if (Object.keys(updates).length > 0) {
      await browser.storage.local.set({ filterListUpdates: updates, lastFilterUpdate: now });
      console.log(`AI Blocker: Updated ${Object.keys(updates).length} filter lists`);
    }
  } catch (e) {
    console.warn('AI Blocker: Filter list update check failed:', e);
  }
}

// Periodic alarm for filter list updates
browser.alarms?.create?.('filterListUpdate', { periodInMinutes: 7 * 24 * 60 }); // weekly
browser.alarms?.onAlarm?.addListener?.((alarm: any) => {
  if (alarm.name === 'filterListUpdate') {
    checkFilterListUpdates();
  }
});

export default defineBackground(() => {
  console.log('AI Blocker background service worker loaded');
});