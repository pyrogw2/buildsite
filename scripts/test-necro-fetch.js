#!/usr/bin/env node

import { enrichSkillsWithSplits, getSplitStats } from './wiki-scraper.js';

const API_BASE = 'https://api.guildwars2.com/v2';

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
  }
  return response.json();
}

console.log('Fetching Necromancer skills from GW2 API...\n');

// Get all skill IDs
const allSkillIds = await fetchJson(`${API_BASE}/skills`);

// Fetch first batch of skills (limit to save time)
const batch = allSkillIds.slice(0, 200);
console.log(`Fetching ${batch.length} skills...`);
const allSkills = await fetchJson(`${API_BASE}/skills?ids=${batch.join(',')}`);

// Filter for Necromancer skills
const necroSkills = allSkills.filter(s =>
  s.professions && s.professions.some(p => p.toLowerCase() === 'necromancer')
);

console.log(`Found ${necroSkills.length} Necromancer skills\n`);

// Find Well of Corruption specifically
const wellOfCorruption = necroSkills.find(s => s.name === 'Well of Corruption');
if (wellOfCorruption) {
  console.log('✓ Found Well of Corruption (ID: ' + wellOfCorruption.id + ')\n');
}

// Enrich with wiki data
console.log('Enriching with competitive split data from wiki...');
console.log('(This will take a few minutes due to rate limiting)\n');

const enriched = await enrichSkillsWithSplits(necroSkills, {
  delay: 500,
  logProgress: true,
});

// Show statistics
const stats = getSplitStats(enriched);
console.log(`\n✅ Enrichment complete!`);
console.log(`   ${stats.withAnySplit} skills have competitive splits`);
console.log(`   - PvE: ${stats.withPve}, PvP: ${stats.withPvp}, WvW: ${stats.withWvw}`);

// Check Well of Corruption specifically
const enrichedWell = enriched.find(s => s.name === 'Well of Corruption');
if (enrichedWell) {
  console.log('\n📊 Well of Corruption competitive splits:');

  const baseRecharge = enrichedWell.facts?.find(f => f.type === 'Recharge');
  console.log(`   Base recharge: ${baseRecharge?.value}s`);

  if (enrichedWell.wvw) {
    const wvwRecharge = enrichedWell.wvw.facts?.find(f => f.type === 'Recharge');
    console.log(`   WvW recharge: ${wvwRecharge?.value}s ← Should be 40s!`);
  }

  if (enrichedWell.pvp) {
    const pvpRecharge = enrichedWell.pvp.facts?.find(f => f.type === 'Recharge');
    console.log(`   PvP recharge: ${pvpRecharge?.value}s`);
  }
}
