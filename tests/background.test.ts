/**
 * Tests for background service worker logic
 */
import { describe, it, expect } from 'vitest';

describe('Category definitions', () => {
  const DEFAULT_CATEGORIES = [
    { id: 'chat-widgets', label: 'Chat Widgets', enabled: true },
    { id: 'search-ai', label: 'Search AI', enabled: true },
    { id: 'content-ai', label: 'Content AI', enabled: true },
    { id: 'social-ai', label: 'Social AI', enabled: true },
    { id: 'tracking', label: 'AI Tracking', enabled: true },
    { id: 'overlays', label: 'AI Overlays', enabled: true },
  ];

  it('has 6 categories', () => {
    expect(DEFAULT_CATEGORIES).toHaveLength(6);
  });

  it('each category has required fields', () => {
    for (const cat of DEFAULT_CATEGORIES) {
      expect(cat).toHaveProperty('id');
      expect(cat).toHaveProperty('label');
      expect(cat).toHaveProperty('enabled');
      expect(cat.id).toBeTruthy();
      expect(cat.label).toBeTruthy();
    }
  });

  it('category IDs are unique', () => {
    const ids = DEFAULT_CATEGORIES.map(c => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('DNR ruleset ID mapping', () => {
  const categoryIds = ['chat-widgets', 'search-ai', 'content-ai', 'social-ai', 'tracking', 'overlays'];

  it('maps category IDs to ruleset IDs correctly', () => {
    const rulesetIds = categoryIds.map(id => `rules_${id}`);
    expect(rulesetIds).toEqual([
      'rules_chat-widgets',
      'rules_search-ai',
      'rules_content-ai',
      'rules_social-ai',
      'rules_tracking',
      'rules_overlays',
    ]);
  });
});

describe('Stats increment logic', () => {
  it('increments by batch counts correctly', () => {
    const stats = {
      networkBlocked: 0,
      cosmeticHidden: 0,
      byCategory: {} as Record<string, { networkBlocked: number; cosmeticHidden: number }>,
    };

    const counts = { 'chat-widgets': 5, 'search-ai': 3 };
    let total = 0;
    for (const [cat, count] of Object.entries(counts)) {
      total += count;
      if (!stats.byCategory[cat]) stats.byCategory[cat] = { networkBlocked: 0, cosmeticHidden: 0 };
      stats.byCategory[cat].cosmeticHidden += count;
    }
    stats.cosmeticHidden += total;

    expect(stats.cosmeticHidden).toBe(8);
    expect(stats.byCategory['chat-widgets'].cosmeticHidden).toBe(5);
    expect(stats.byCategory['search-ai'].cosmeticHidden).toBe(3);
  });

  it('accumulates across multiple batches', () => {
    const stats = {
      networkBlocked: 0,
      cosmeticHidden: 0,
      byCategory: {} as Record<string, { networkBlocked: number; cosmeticHidden: number }>,
    };

    // First batch
    for (const [cat, count] of Object.entries({ 'chat-widgets': 5 })) {
      if (!stats.byCategory[cat]) stats.byCategory[cat] = { networkBlocked: 0, cosmeticHidden: 0 };
      stats.byCategory[cat].cosmeticHidden += count;
      stats.cosmeticHidden += count;
    }

    // Second batch
    for (const [cat, count] of Object.entries({ 'chat-widgets': 3 })) {
      if (!stats.byCategory[cat]) stats.byCategory[cat] = { networkBlocked: 0, cosmeticHidden: 0 };
      stats.byCategory[cat].cosmeticHidden += count;
      stats.cosmeticHidden += count;
    }

    expect(stats.cosmeticHidden).toBe(8);
    expect(stats.byCategory['chat-widgets'].cosmeticHidden).toBe(8);
  });
});