#!/usr/bin/env node

import { enrichSkillsWithSplits } from './wiki-scraper.js';

const API_BASE = 'https://api.guildwars2.com/v2';

console.log('Fetching Well of Corruption (ID: 10545) from GW2 API...\n');

const response = await fetch(`${API_BASE}/skills?ids=10545`);
const skills = await response.json();
const wellOfCorruption = skills[0];

console.log('✓ Fetched Well of Corruption');
console.log(`   Name: ${wellOfCorruption.name}`);

const baseRecharge = wellOfCorruption.facts?.find(f => f.type === 'Recharge');
console.log(`   Base recharge: ${baseRecharge?.value}s\n`);

console.log('Enriching with wiki data...\n');

const enriched = await enrichSkillsWithSplits([wellOfCorruption], {
  delay: 0,
  logProgress: false,
});

const enrichedWell = enriched[0];

console.log('✅ Enrichment complete!\n');

console.log('📊 Competitive Splits:\n');

// Base facts
console.log('   Base (API):');
console.log(`     Recharge: ${baseRecharge?.value}s`);

// PvE
if (enrichedWell.pve) {
  const pveRecharge = enrichedWell.pve.facts?.find(f => f.type === 'Recharge');
  const pveDamage = enrichedWell.pve.facts?.find(f => f.type === 'Damage');
  console.log(`\n   PvE Override:`);
  console.log(`     Recharge: ${pveRecharge?.value}s`);
  console.log(`     Damage: ${pveDamage?.dmg_multiplier}x (${pveDamage?.hit_count} hits)`);
}

// PvP
if (enrichedWell.pvp) {
  const pvpRecharge = enrichedWell.pvp.facts?.find(f => f.type === 'Recharge');
  const pvpDamage = enrichedWell.pvp.facts?.find(f => f.type === 'Damage');
  console.log(`\n   PvP Override:`);
  console.log(`     Recharge: ${pvpRecharge?.value}s`);
  console.log(`     Damage: ${pvpDamage?.dmg_multiplier}x (${pvpDamage?.hit_count} hits)`);
}

// WvW
if (enrichedWell.wvw) {
  const wvwRecharge = enrichedWell.wvw.facts?.find(f => f.type === 'Recharge');
  const wvwDamage = enrichedWell.wvw.facts?.find(f => f.type === 'Damage');
  console.log(`\n   WvW Override:`);
  console.log(`     Recharge: ${wvwRecharge?.value}s ← Should be 40s!`);
  console.log(`     Damage: ${wvwDamage?.dmg_multiplier}x (${wvwDamage?.hit_count} hits)`);
} else {
  console.log(`\n   ✗ WvW: No override found`);
}

console.log('\n---\n');

if (enrichedWell.wvw) {
  const wvwRecharge = enrichedWell.wvw.facts?.find(f => f.type === 'Recharge');
  if (wvwRecharge?.value === 40) {
    console.log('✅ SUCCESS! WvW recharge is correctly 40s');
  } else {
    console.log(`❌ FAILED! WvW recharge is ${wvwRecharge?.value}s, expected 40s`);
  }
} else {
  console.log('❌ FAILED! No WvW override found');
}
