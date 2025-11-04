import { enrichTraitsWithSplits } from './wiki-scraper.js';

// Mock New Genes trait from API
const newGenes = {
  id: 2387,
  name: 'New Genes',
  description: 'Morph skills grant boons to allies.',
  facts: [
    { status: 'Alacrity', duration: 6, type: 'Buff' },
    { status: 'Might', duration: 6, type: 'Buff', apply_count: 3 },
    { status: 'Protection', duration: 4, type: 'PrefixedBuff' },
  ]
};

console.log('Testing New Genes enrichment...\n');

const enriched = await enrichTraitsWithSplits([newGenes], {
  delay: 0,
  logProgress: false
});

const result = enriched[0];

console.log('Has PvE override:', !!result.pve);
console.log('Has WvW override:', !!result.wvw);
console.log('Has PvP override:', !!result.pvp);

if (result.wvw) {
  console.log('\nWvW facts:');
  result.wvw.facts.forEach(f => {
    console.log(`  - ${f.status || f.type}`);
  });

  const hasAlacrity = result.wvw.facts.some(f => f.status === 'Alacrity');
  console.log(`\nWvW has Alacrity: ${hasAlacrity}`);
  console.log(hasAlacrity ? '❌ FAIL: Alacrity should not be in WvW' : '✅ PASS: Alacrity correctly excluded from WvW');
}
