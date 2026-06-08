/**
 * AI Blocker — Content Script
 * Applies cosmetic hiding rules (CSS selector-based) to hide AI elements on pages.
 */

interface CosmeticRule {
  selector: string;
  category: string;
}

interface WhitelistEntry {
  domain: string;
}

// Cosmetic rules organized by category
const COSMETIC_RULES: Record<string, CosmeticRule[]> = {
  'chat-widgets': [
    { selector: '[class*="chatgpt"]', category: 'chat-widgets' },
    { selector: '[id*="chatgpt-widget"]', category: 'chat-widgets' },
    { selector: '[class*="ai-chat"]', category: 'chat-widgets' },
    { selector: '[class*="intercom-ai"]', category: 'chat-widgets' },
    { selector: '[class*="drift-ai"]', category: 'chat-widgets' },
    { selector: '.crisp-chat', category: 'chat-widgets' },
    { selector: '[data-ai-assistant]', category: 'chat-widgets' },
    { selector: '[class*="ai-widget"]', category: 'chat-widgets' },
    { selector: '[id*="ai-widget"]', category: 'chat-widgets' },
    { selector: '[class*="openai-embed"]', category: 'chat-widgets' },
    { selector: '#openai-chatbot', category: 'chat-widgets' },
    { selector: '[class*="chatbot-container"]', category: 'chat-widgets' },
  ],
  'search-ai': [
    { selector: '.SGeAIResponse', category: 'search-ai' },
    { selector: '[class*="ai-overview"]', category: 'search-ai' },
    { selector: '[data-attrid*="SGE"]', category: 'search-ai' },
    { selector: '#copilot-sidebar', category: 'search-ai' },
    { selector: '[class*="b_algoAI"]', category: 'search-ai' },
    { selector: '[class*="copilot"]', category: 'search-ai' },
    { selector: '.cib-serp-ai', category: 'search-ai' },
    { selector: '[class*="ai-answer"]', category: 'search-ai' },
    { selector: '[class*="ai-snippet"]', category: 'search-ai' },
    { selector: '[class*="duckduckgo-ai"]', category: 'search-ai' },
  ],
  'content-ai': [
    { selector: '[class*="grammarly"]', category: 'content-ai' },
    { selector: '[class*="notion-ai"]', category: 'content-ai' },
    { selector: '[class*="wp-ai"]', category: 'content-ai' },
    { selector: '[class*="ai-assistant"]', category: 'content-ai' },
    { selector: '[class*="ai-writing"]', category: 'content-ai' },
    { selector: '[data-ai-suggestion]', category: 'content-ai' },
    { selector: '[class*="ai-complete"]', category: 'content-ai' },
    { selector: '[class*="ai-generate"]', category: 'content-ai' },
    { selector: '.ai-toolbar', category: 'content-ai' },
    { selector: '[class*="copilot-sidebar"]', category: 'content-ai' },
  ],
  'social-ai': [
    { selector: '[class*="grok"]', category: 'social-ai' },
    { selector: '[data-testid*="grok"]', category: 'social-ai' },
    { selector: '[class*="meta-ai"]', category: 'social-ai' },
    { selector: '[class*="linkedin-ai"]', category: 'social-ai' },
    { selector: '[class*="ai-feed"]', category: 'social-ai' },
    { selector: '[class*="ai-summary-social"]', category: 'social-ai' },
    { selector: '[data-ai-recommendation]', category: 'social-ai' },
  ],
  'overlays': [
    { selector: '[class*="ai-onboarding"]', category: 'overlays' },
    { selector: '[class*="ai-popup"]', category: 'overlays' },
    { selector: '[class*="try-ai"]', category: 'overlays' },
    { selector: '[class*="ai-modal"]', category: 'overlays' },
    { selector: '[class*="ai-banner"]', category: 'overlays' },
    { selector: '[class*="ai-overlay"]', category: 'overlays' },
    { selector: '[class*="ai-upsell"]', category: 'overlays' },
    { selector: '[class*="ai-prompt-banner"]', category: 'overlays' },
  ],
};

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_start',

  main() {
    async function applyCosmeticRules() {
      const { enabled, categories, whitelist } = await browser.storage.local.get([
        'enabled',
        'categories',
        'whitelist',
      ]);

      if (!enabled) return;

      // Check whitelist
      const currentDomain = window.location.hostname;
      if ((whitelist || []).includes(currentDomain)) return;

      const enabledCategories = new Set(
        (categories || []).filter((c: any) => c.enabled).map((c: any) => c.id),
      );

      // Collect all selectors for enabled categories
      const selectors: string[] = [];
      for (const [catId, rules] of Object.entries(COSMETIC_RULES)) {
        if (enabledCategories.has(catId)) {
          for (const rule of rules) {
            selectors.push(rule.selector);
          }
        }
      }

      if (selectors.length === 0) return;

      // Inject CSS to hide matching elements
      const styleId = 'ai-blocker-cosmetic';
      let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = styleId;
        styleEl.textContent = `${selectors.join(',\n')} { display: none !important; visibility: hidden !important; height: 0 !important; overflow: hidden !important; }`;
        (document.head || document.documentElement).appendChild(styleEl);
      }

      // Count hidden elements and report stats
      let totalHidden = 0;
      const byCategory: Record<string, number> = {};

      for (const [catId, rules] of Object.entries(COSMETIC_RULES)) {
        if (!enabledCategories.has(catId)) continue;
        for (const rule of rules) {
          const matches = document.querySelectorAll(rule.selector);
          if (matches.length > 0) {
            totalHidden += matches.length;
            byCategory[catId] = (byCategory[catId] || 0) + matches.length;
          }
        }
      }

      if (totalHidden > 0) {
        for (const [cat, count] of Object.entries(byCategory)) {
          for (let i = 0; i < count; i++) {
            browser.runtime.sendMessage({ type: 'INCREMENT_COSMETIC', category: cat });
          }
        }
      }
    }

    // Apply on DOM ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', applyCosmeticRules);
    } else {
      applyCosmeticRules();
    }

    // Re-apply on dynamic content (MutationObserver)
    const observer = new MutationObserver(() => {
      // Debounce — don't run too often
      clearTimeout((observer as any)._debounce);
      (observer as any)._debounce = setTimeout(applyCosmeticRules, 500);
    });

    // Start observing after DOM is ready
    const startObserving = () => {
      observer.observe(document.body || document.documentElement, {
        childList: true,
        subtree: true,
      });
    };

    if (document.body) {
      startObserving();
    } else {
      document.addEventListener('DOMContentLoaded', startObserving);
    }
  },
});