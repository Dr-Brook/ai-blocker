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

// Initialize storage on install
browser.runtime.onInstalled.addListener(async () => {
  const stored = await browser.storage.local.get(['categories', 'stats', 'enabled', 'whitelist']);
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

  // Apply DNR rules based on enabled categories
  await applyDnrRules();
});

// Apply declarativeNetRequest rules
async function applyDnrRules() {
  const { categories, enabled } = await browser.storage.local.get(['categories', 'enabled']);
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
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_STATS') {
    browser.storage.local.get('stats').then(({ stats }) => {
      sendResponse(stats || DEFAULT_STATS);
    });
    return true; // async
  }

  if (message.type === 'GET_CATEGORIES') {
    browser.storage.local.get('categories').then(({ categories }) => {
      sendResponse(categories || DEFAULT_CATEGORIES);
    });
    return true;
  }

  if (message.type === 'TOGGLE_CATEGORY') {
    browser.storage.local.get('categories').then(async ({ categories }) => {
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
    browser.storage.local.get('enabled').then(async ({ enabled }) => {
      const newState = !enabled;
      await browser.storage.local.set({ enabled: newState });
      await applyDnrRules();
      sendResponse({ success: true, enabled: newState });
    });
    return true;
  }

  if (message.type === 'GET_ENABLED') {
    browser.storage.local.get('enabled').then(({ enabled }) => {
      sendResponse(enabled !== false);
    });
    return true;
  }

  if (message.type === 'INCREMENT_NETWORK') {
    browser.storage.local.get('stats').then(async ({ stats }) => {
      const s: BlockStats = stats || DEFAULT_STATS;
      s.networkBlocked++;
      const cat = message.category || 'unknown';
      if (!s.byCategory[cat]) s.byCategory[cat] = { networkBlocked: 0, cosmeticHidden: 0 };
      s.byCategory[cat].networkBlocked++;
      await browser.storage.local.set({ stats: s });
      sendResponse({ success: true });
    });
    return true;
  }

  if (message.type === 'INCREMENT_COSMETIC') {
    browser.storage.local.get('stats').then(async ({ stats }) => {
      const s: BlockStats = stats || DEFAULT_STATS;
      s.cosmeticHidden++;
      const cat = message.category || 'unknown';
      if (!s.byCategory[cat]) s.byCategory[cat] = { networkBlocked: 0, cosmeticHidden: 0 };
      s.byCategory[cat].cosmeticHidden++;
      await browser.storage.local.set({ stats: s });
      sendResponse({ success: true });
    });
    return true;
  }

  if (message.type === 'INCREMENT_COSMETIC_BATCH') {
    browser.storage.local.get('stats').then(async ({ stats }) => {
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
    browser.storage.local.get('whitelist').then(({ whitelist }) => {
      sendResponse(whitelist || []);
    });
    return true;
  }

  if (message.type === 'ADD_WHITELIST') {
    browser.storage.local.get('whitelist').then(async ({ whitelist }) => {
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
    browser.storage.local.get('whitelist').then(async ({ whitelist }) => {
      const list: string[] = (whitelist || []).filter((d: string) => d !== message.domain);
      await browser.storage.local.set({ whitelist: list });
      sendResponse({ success: true, whitelist: list });
    });
    return true;
  }
});

export default defineBackground(() => {
  console.log('AI Blocker background service worker loaded');
});