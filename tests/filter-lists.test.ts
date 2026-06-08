/**
 * Tests for filter list validation and parsing
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const FILTER_LISTS_DIR = path.join(__dirname, '..', 'filter-lists');
const RULES_DIR = path.join(__dirname, '..', 'rules');

describe('Filter list files exist', () => {
  const expectedLists = [
    'chat-widgets.txt',
    'search-ai.txt',
    'content-ai.txt',
    'social-ai.txt',
    'tracking.txt',
    'overlays.txt',
    'cosmetic-rules.txt',
  ];

  for (const file of expectedLists) {
    it(`${file} exists`, () => {
      expect(fs.existsSync(path.join(FILTER_LISTS_DIR, file))).toBe(true);
    });
  }
});

describe('DNR rule files exist', () => {
  const expectedRules = [
    'chat-widgets.json',
    'search-ai.json',
    'content-ai.json',
    'social-ai.json',
    'tracking.json',
    'overlays.json',
  ];

  for (const file of expectedRules) {
    it(`${file} exists and is valid JSON`, () => {
      const filePath = path.join(RULES_DIR, file);
      expect(fs.existsSync(filePath)).toBe(true);
      const content = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(content);
      expect(Array.isArray(parsed)).toBe(true);
    });
  }
});

describe('DNR rules have required fields', () => {
  const ruleFiles = fs.readdirSync(RULES_DIR).filter(f => f.endsWith('.json'));

  for (const file of ruleFiles) {
    it(`${file} rules have required DNR fields`, () => {
      const content = fs.readFileSync(path.join(RULES_DIR, file), 'utf-8');
      const rules = JSON.parse(content);
      for (const rule of rules) {
        expect(rule).toHaveProperty('id');
        expect(rule).toHaveProperty('priority');
        expect(rule).toHaveProperty('action');
        expect(rule).toHaveProperty('condition');
        expect(rule.action).toHaveProperty('type');
        expect(rule.condition).toHaveProperty('urlFilter');
        expect(rule.condition).toHaveProperty('resourceTypes');
        expect(rule.action.type).toBe('block');
      }
    });

    it(`${file} rule IDs are unique`, () => {
      const content = fs.readFileSync(path.join(RULES_DIR, file), 'utf-8');
      const rules = JSON.parse(content);
      const ids = rules.map((r: any) => r.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  }
});

describe('Filter list syntax validation', () => {
  it('network filter entries use ||..^ format', () => {
    const networkLists = ['chat-widgets.txt', 'search-ai.txt', 'content-ai.txt', 'social-ai.txt', 'tracking.txt', 'overlays.txt'];
    for (const file of networkLists) {
      const content = fs.readFileSync(path.join(FILTER_LISTS_DIR, file), 'utf-8');
      const lines = content.split('\n').filter(l => l.trim() && !l.trim().startsWith('!'));
      for (const line of lines) {
        expect(line.trim()).toMatch(/^\|\|/); // starts with ||
      }
    }
  });

  it('cosmetic rules use ## separator', () => {
    const content = fs.readFileSync(path.join(FILTER_LISTS_DIR, 'cosmetic-rules.txt'), 'utf-8');
    const lines = content.split('\n').filter(l => l.trim() && !l.trim().startsWith('!'));
    for (const line of lines) {
      expect(line.trim()).toContain('##');
    }
  });
});

describe('Filter list to JSON rule coverage', () => {
  const categories = ['chat-widgets', 'search-ai', 'content-ai', 'social-ai', 'tracking', 'overlays'];

  for (const cat of categories) {
    it(`${cat}: every txt network entry has a corresponding JSON rule`, () => {
      const txtContent = fs.readFileSync(path.join(FILTER_LISTS_DIR, `${cat}.txt`), 'utf-8');
      const jsonContent = fs.readFileSync(path.join(RULES_DIR, `${cat}.json`), 'utf-8');

      const txtEntries = txtContent
        .split('\n')
        .filter(l => l.trim() && !l.trim().startsWith('!'))
        .map(l => l.trim().replace(/\^$/, '')); // remove trailing ^ for comparison

      const jsonRules = JSON.parse(jsonContent);
      const jsonFilters = jsonRules.map((r: any) => r.condition.urlFilter.replace(/\^$/, ''));

      for (const entry of txtEntries) {
        const entryBase = entry.replace(/^\|\|/, ''); // remove || prefix
        const hasMatch = jsonFilters.some((f: string) => {
          const filterBase = f.replace(/^\|\|/, '');
          return entryBase === filterBase || entryBase.startsWith(filterBase) || filterBase.startsWith(entryBase);
        });
        expect(hasMatch, `No JSON rule for txt entry: ${entry}`).toBe(true);
      }
    });
  }
});