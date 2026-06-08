/**
 * AI Blocker — Content Script
 * Applies cosmetic hiding rules (CSS selector-based) to hide AI elements on pages.
 * Rules are loaded dynamically from the cosmetic-rules.txt filter list file.
 */

interface CosmeticRule {
  selector: string;
  category: string;
  domain?: string; // optional domain restriction
}

interface WhitelistEntry {
  domain: string;
}

/**
 * Parse cosmetic-rules.txt format into structured rules.
 * Format: [domain]##selector
 * Lines starting with ! are comments.
 * Empty lines are skipped.
 * Categories are inferred from section headers like: ! === Category Name ===
 */
function parseCosmeticRules(text: string): CosmeticRule[] {
  const rules: CosmeticRule[] = [];
  let currentCategory = 'uncategorized';

  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();

    // Skip empty lines and comments
    if (!line || line.startsWith('!')) {
      // Check for category header: ! === Category Name ===
      const catMatch = line.match(/^!\s*===\s*(.+?)\s*===\s*$/);
      if (catMatch) {
        currentCategory = catMatch[1].toLowerCase().replace(/\s+/g, '-');
      }
      continue;
    }

    // Parse rule: [domain]##selector
    const ruleMatch = line.match(/^(.*?)##(.+)$/);
    if (ruleMatch) {
      const domainPart = ruleMatch[1].trim();
      const selector = ruleMatch[2].trim();
      if (selector) {
        rules.push({
          selector,
          category: currentCategory,
          domain: domainPart || undefined,
        });
      }
    }
  }

  return rules;
}

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_start',

  async main() {
    // Load cosmetic rules from the filter list file
    let cosmeticRules: CosmeticRule[] = [];
    try {
      const url = browser.runtime.getURL('filter-lists/cosmetic-rules.txt');
      const response = await fetch(url);
      if (response.ok) {
        const text = await response.text();
        cosmeticRules = parseCosmeticRules(text);
      } else {
        console.warn('AI Blocker: Failed to load cosmetic-rules.txt, using fallback rules');
        // Fallback: minimal hardcoded rules
        cosmeticRules = [
          { selector: '[class*="ai-chat"]', category: 'chat-widgets' },
          { selector: '[data-ai-assistant]', category: 'overlays' },
        ];
      }
    } catch (e) {
      console.warn('AI Blocker: Error loading cosmetic rules:', e);
      // Fallback rules if fetch fails
      cosmeticRules = [
        { selector: '[class*="ai-chat"]', category: 'chat-widgets' },
        { selector: '[data-ai-assistant]', category: 'overlays' },
      ];
    }

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

      // Collect all selectors for enabled categories, respecting domain restrictions
      const selectors: string[] = [];
      for (const rule of cosmeticRules) {
        if (!enabledCategories.has(rule.category)) continue;

        // If rule has a domain restriction, check it
        if (rule.domain) {
          if (!currentDomain.endsWith(rule.domain) && currentDomain !== rule.domain) {
            // Also check subdomain matches
            if (!currentDomain.endsWith('.' + rule.domain)) {
              continue;
            }
          }
        }

        selectors.push(rule.selector);
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
      } else {
        // Update existing style with current selectors
        styleEl.textContent = `${selectors.join(',\n')} { display: none !important; visibility: hidden !important; height: 0 !important; overflow: hidden !important; }`;
      }

      // Count hidden elements and batch-report stats to background
      let totalHidden = 0;
      const byCategory: Record<string, number> = {};

      for (const rule of cosmeticRules) {
        if (!enabledCategories.has(rule.category)) continue;
        if (rule.domain && !currentDomain.endsWith(rule.domain) && currentDomain !== rule.domain && !currentDomain.endsWith('.' + rule.domain)) continue;

        const matches = document.querySelectorAll(rule.selector);
        if (matches.length > 0) {
          totalHidden += matches.length;
          byCategory[rule.category] = (byCategory[rule.category] || 0) + matches.length;
        }
      }

      if (totalHidden > 0) {
        // Batched stats reporting — send one message with counts per category
        browser.runtime.sendMessage({
          type: 'INCREMENT_COSMETIC_BATCH',
          counts: byCategory,
        });
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