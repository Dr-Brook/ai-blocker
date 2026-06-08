/**
 * Tests for cosmetic rule parsing (content script logic)
 */
import { describe, it, expect } from 'vitest';

// Duplicate the parser logic for testing (same as in content.ts)
interface CosmeticRule {
  selector: string;
  category: string;
  domain?: string;
}

function parseCosmeticRules(text: string): CosmeticRule[] {
  const rules: CosmeticRule[] = [];
  let currentCategory = 'uncategorized';

  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();

    if (!line || line.startsWith('!')) {
      const catMatch = line.match(/^!\s*===\s*(.+?)\s*===\s*$/);
      if (catMatch) {
        currentCategory = catMatch[1].toLowerCase().replace(/\s+/g, '-');
      }
      continue;
    }

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

describe('parseCosmeticRules', () => {
  it('parses a simple global rule', () => {
    const rules = parseCosmeticRules('##[class*="ai-chat"]');
    expect(rules).toHaveLength(1);
    expect(rules[0]).toEqual({
      selector: '[class*="ai-chat"]',
      category: 'uncategorized',
      domain: undefined,
    });
  });

  it('parses a domain-specific rule', () => {
    const rules = parseCosmeticRules('google.com##.SGeAIResponse');
    expect(rules).toHaveLength(1);
    expect(rules[0]).toEqual({
      selector: '.SGeAIResponse',
      category: 'uncategorized',
      domain: 'google.com',
    });
  });

  it('skips comments and empty lines', () => {
    const text = `! This is a comment
##[class*="ai-chat"]

! Another comment
##[class*="ai-widget"]`;
    const rules = parseCosmeticRules(text);
    expect(rules).toHaveLength(2);
  });

  it('parses category headers', () => {
    const text = `! === Chat Widgets ===
##[class*="ai-chat"]
! === Search AI ===
google.com##.SGeAIResponse`;
    const rules = parseCosmeticRules(text);
    expect(rules).toHaveLength(2);
    expect(rules[0].category).toBe('chat-widgets');
    expect(rules[1].category).toBe('search-ai');
  });

  it('handles empty input', () => {
    expect(parseCosmeticRules('')).toHaveLength(0);
    expect(parseCosmeticRules('! only comments')).toHaveLength(0);
  });

  it('handles multi-line input with mixed rules', () => {
    const text = `! AI Blocker cosmetic rules
! === Overlays ===
##[class*="ai-popup"]
##[class*="try-ai"]
bing.com##[class*="copilot"]`;
    const rules = parseCosmeticRules(text);
    expect(rules).toHaveLength(3);
    expect(rules[0].category).toBe('overlays');
    expect(rules[1].category).toBe('overlays');
    expect(rules[2].category).toBe('overlays');
    expect(rules[2].domain).toBe('bing.com');
  });
});

describe('filter list file parsing', () => {
  it('parses network filter list format', () => {
    const text = `! AI Blocker — Chat Widgets
! Version: 1.1.0

||chatgpt.com/embed^
||claude.ai^
||anthropic.com^`;

    const entries = text
      .split('\n')
      .filter(l => l.trim() && !l.startsWith('!'))
      .map(l => l.trim());

    expect(entries).toEqual([
      '||chatgpt.com/embed^',
      '||claude.ai^',
      '||anthropic.com^',
    ]);
  });
});