#!/usr/bin/env node

import { scrapeSkillSplits } from './wiki-scraper.js';

// Test with Well of Corruption
const testSkill = {
  id: 10545,
  name: 'Well of Corruption',
  description: 'Well. Corrupt boons on yourself and nearby foes into conditions.',
};

console.log('Testing wiki scraper with Well of Corruption...\n');
console.log('Fetching wiki data...');

const splits = await scrapeSkillSplits(testSkill);

if (splits) {
  console.log('\n✓ Found competitive splits!');
  console.log('\nSplit modes:', splits.split || 'not specified');
  console.log('\nOverrides:');
  console.log(JSON.stringify(splits.overrides, null, 2));
} else {
  console.log('\n✗ No competitive splits found');
}
