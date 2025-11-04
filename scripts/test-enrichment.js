#!/usr/bin/env node

import { enrichSkillsWithSplits } from './wiki-scraper.js';

// Mock Well of Corruption skill data from API
const mockSkill = {
  id: 10545,
  name: 'Well of Corruption',
  description: 'Well. Corrupt boons on yourself and nearby foes into conditions.',
  type: 'Utility',
  slot: 'Utility',
  professions: ['Necromancer'],
  facts: [
    {
      type: 'Recharge',
      text: 'Recharge',
      value: 32,
    },
    {
      type: 'Damage',
      text: 'damage',
      hit_count: 6,
      dmg_multiplier: 3.0,
    },
    {
      type: 'Number',
      text: 'Number of Targets',
      value: 5,
    },
    {
      type: 'Range',
      text: 'Range',
      value: 900,
    },
  ],
};

console.log('Testing enrichment with Well of Corruption...\n');
console.log('Original skill facts:');
console.log(JSON.stringify(mockSkill.facts, null, 2));

console.log('\nEnriching with wiki data...');
const enriched = await enrichSkillsWithSplits([mockSkill], {
  delay: 0,
  logProgress: false,
});

const enrichedSkill = enriched[0];

console.log('\n✓ Enrichment complete!\n');

if (enrichedSkill.wvw) {
  console.log('WvW Override:');
  console.log(JSON.stringify(enrichedSkill.wvw, null, 2));
} else {
  console.log('✗ No WvW override found');
}

if (enrichedSkill.pvp) {
  console.log('\nPvP Override:');
  console.log(JSON.stringify(enrichedSkill.pvp, null, 2));
}

if (enrichedSkill.pve) {
  console.log('\nPvE Override:');
  console.log(JSON.stringify(enrichedSkill.pve, null, 2));
}
