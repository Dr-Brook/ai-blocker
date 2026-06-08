#!/usr/bin/env node
/**
 * AI Blocker — Filter List Validation Script
 * Checks filter list syntax and domain reachability.
 * Run: node scripts/validate-filter-lists.mjs
 */

import fs from 'fs';
import path from 'path';
import dns from 'dns/promises';

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const FILTER_LISTS_DIR = path.join(__dirname, '..', 'filter-lists');
const RULES_DIR = path.join(__dirname, '..', 'rules');

let errors = 0;
let warnings = 0;

function error(msg) {
  console.error(`❌ ERROR: ${msg}`);
  errors++;
}

function warn(msg) {
  console.warn(`⚠️  WARN: ${msg}`);
  warnings++;
}

function ok(msg) {
  console.log(`✅ ${msg}`);
}

// Validate network filter list syntax
function validateNetworkList(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const name = path.basename(filePath);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith('!')) continue;

    // Network rules should start with ||
    if (!line.startsWith('||')) {
      error(`${name}:${i + 1}: Network entry doesn't start with || — "${line}"`);
    }

    // Extract domain for verification
    const domainMatch = line.match(/^\|\|([^/^]+)/);
    if (domainMatch) {
      const domain = domainMatch[1];
      // Basic domain format check
      if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i.test(domain)) {
        warn(`${name}:${i + 1}: Domain looks suspicious — "${domain}"`);
      }
    }
  }
  ok(`${name}: syntax validated`);
}

// Validate cosmetic rules syntax
function validateCosmeticRules(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const name = path.basename(filePath);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith('!')) continue;

    // Cosmetic rules should contain ##
    if (!line.includes('##')) {
      error(`${name}:${i + 1}: Cosmetic rule missing ## separator — "${line}"`);
      continue;
    }

    const parts = line.split('##');
    if (parts.length !== 2) {
      error(`${name}:${i + 1}: Invalid ## format — "${line}"`);
      continue;
    }

    const selector = parts[1].trim();
    if (!selector) {
      error(`${name}:${i + 1}: Empty selector — "${line}"`);
    }

    // Basic CSS selector validation
    if (selector.includes(' ')) {
      warn(`${name}:${i + 1}: Complex descendant selector — may be too broad: "${selector}"`);
    }
  }
  ok(`${name}: syntax validated`);
}

// Validate DNR JSON rules
function validateDnrRules(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const name = path.basename(filePath);

  let rules;
  try {
    rules = JSON.parse(content);
  } catch (e) {
    error(`${name}: Invalid JSON — ${e.message}`);
    return;
  }

  if (!Array.isArray(rules)) {
    error(`${name}: Root must be an array`);
    return;
  }

  const ids = new Set();
  for (const rule of rules) {
    if (!rule.id) error(`${name}: Rule missing id`);
    if (ids.has(rule.id)) error(`${name}: Duplicate rule id ${rule.id}`);
    ids.add(rule.id);

    if (!rule.priority) warn(`${name}: Rule ${rule.id} missing priority`);
    if (!rule.action?.type) error(`${name}: Rule ${rule.id} missing action.type`);
    if (rule.action?.type !== 'block') warn(`${name}: Rule ${rule.id} action is not "block"`);
    if (!rule.condition?.urlFilter) error(`${name}: Rule ${rule.id} missing condition.urlFilter`);
    if (!rule.condition?.resourceTypes) warn(`${name}: Rule ${rule.id} missing condition.resourceTypes`);
  }
  ok(`${name}: ${rules.length} rules validated`);
}

// Check domain reachability (DNS lookup)
async function checkDomainReachability(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const name = path.basename(filePath);
  const domains = new Set();

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('!')) continue;

    const domainMatch = trimmed.match(/^\|\|([^/^]+)/);
    if (domainMatch) {
      domains.add(domainMatch[1]);
    }
  }

  if (domains.size === 0) return;

  let reachable = 0;
  let unreachable = 0;

  for (const domain of domains) {
    try {
      await dns.resolve(domain);
      reachable++;
    } catch {
      // DNS resolution failed — domain might be down or fake
      warn(`${name}: Domain doesn't resolve — "${domain}"`);
      unreachable++;
    }
  }

  ok(`${name}: ${reachable}/${domains.size} domains resolve (${unreachable} unreachable)`);
}

// Main
async function main() {
  console.log('🔍 AI Blocker — Filter List Validation\n');

  // Validate network filter lists
  const networkLists = ['chat-widgets.txt', 'search-ai.txt', 'content-ai.txt', 'social-ai.txt', 'tracking.txt', 'overlays.txt'];
  for (const file of networkLists) {
    const filePath = path.join(FILTER_LISTS_DIR, file);
    if (fs.existsSync(filePath)) {
      validateNetworkList(filePath);
      await checkDomainReachability(filePath);
    } else {
      error(`Missing filter list: ${file}`);
    }
  }

  // Validate cosmetic rules
  const cosmeticPath = path.join(FILTER_LISTS_DIR, 'cosmetic-rules.txt');
  if (fs.existsSync(cosmeticPath)) {
    validateCosmeticRules(cosmeticPath);
  } else {
    error('Missing cosmetic-rules.txt');
  }

  // Validate DNR JSON rules
  const ruleFiles = fs.readdirSync(RULES_DIR).filter(f => f.endsWith('.json'));
  for (const file of ruleFiles) {
    validateDnrRules(path.join(RULES_DIR, file));
  }

  // Check that every network txt category has a corresponding JSON file
  for (const file of networkLists) {
    const jsonFile = file.replace('.txt', '.json');
    if (!fs.existsSync(path.join(RULES_DIR, jsonFile))) {
      error(`Missing DNR rules for ${file} — expected ${jsonFile}`);
    }
  }

  console.log('\n' + '='.repeat(50));
  if (errors === 0 && warnings === 0) {
    console.log('✅ All validations passed!');
  } else {
    console.log(`⚠️  ${errors} errors, ${warnings} warnings`);
    if (errors > 0) process.exit(1);
  }
}

main();