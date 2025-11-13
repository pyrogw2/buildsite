#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { enrichSkillsWithSplits, enrichTraitsWithSplits, getSplitStats } from './wiki-scraper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_BASE = 'https://api.guildwars2.com/v2';
const OUTPUT_DIR = path.join(__dirname, '../public/data');

// Parse command line flags
const WITH_WIKI = process.argv.includes('--with-wiki');
const WIKI_ONLY = process.argv.includes('--wiki-only');
const professionArg = process.argv.find(arg => arg.startsWith('--profession='));
const PROFESSION_FILTER = professionArg ? professionArg.split('=')[1].split(',') : null;

const PROFESSIONS = [
  'Guardian',
  'Warrior',
  'Engineer',
  'Ranger',
  'Thief',
  'Elementalist',
  'Mesmer',
  'Necromancer',
  'Revenant',
];

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
  }
  return response.json();
}

function loadExistingData(filename) {
  const filepath = path.join(OUTPUT_DIR, filename);
  if (!fs.existsSync(filepath)) {
    throw new Error(`File not found: ${filepath}. Run without --wiki-only first to fetch from API.`);
  }
  console.log(`  Loading existing ${filename}...`);
  return JSON.parse(fs.readFileSync(filepath, 'utf8'));
}

async function fetchInBatches(ids, batchSize, urlTemplate) {
  const results = [];
  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = ids.slice(i, i + batchSize);
    console.log(`  Fetching batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(ids.length / batchSize)}...`);
    const url = urlTemplate.replace('{ids}', batch.join(','));
    const data = await fetchJson(url);
    results.push(...data);
    // Small delay to be nice to the API
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  return results;
}

async function fetchSkills() {
  console.log('Fetching skills for all professions (parallelized)...');

  // Fetch all skill IDs once
  const allSkillIds = await fetchJson(`${API_BASE}/skills`);

  // Fetch all skills in batches (this is the slow part, so do it once)
  console.log(`  Fetching all ${allSkillIds.length} skills from API...`);
  const allSkills = await fetchInBatches(
    allSkillIds,
    200,
    `${API_BASE}/skills?ids={ids}`
  );

  // Now filter by profession in parallel
  console.log('  Filtering skills by profession...');
  const skillsByProfession = {};

  for (const profession of PROFESSIONS) {
    const professionSkills = allSkills.filter(s =>
      s.professions && s.professions.some(p => p.toLowerCase() === profession.toLowerCase())
    );
    console.log(`    ✓ ${profession}: ${professionSkills.length} skills`);
    skillsByProfession[profession] = professionSkills;
  }

  return skillsByProfession;
}

async function fetchSpecializations() {
  console.log('Fetching specializations...');
  const allSpecIds = await fetchJson(`${API_BASE}/specializations`);
  const allSpecs = await fetchInBatches(
    allSpecIds,
    200,
    `${API_BASE}/specializations?ids={ids}`
  );

  console.log(`  Found ${allSpecs.length} specializations`);
  return allSpecs;
}

async function fetchTraits(specs) {
  console.log('Fetching traits...');
  const allTraitIds = new Set();

  // Collect all trait IDs from specializations
  specs.forEach(spec => {
    [...spec.minor_traits, ...spec.major_traits].forEach(id => allTraitIds.add(id));
  });

  const traitIdsArray = Array.from(allTraitIds);
  const allTraits = await fetchInBatches(
    traitIdsArray,
    200,
    `${API_BASE}/traits?ids={ids}`
  );

  console.log(`  Found ${allTraits.length} traits`);
  return allTraits;
}

async function fetchItems() {
  console.log('Fetching runes, relics, and sigils...');

  // Read the deduplicated IDs file
  const idsFile = path.join(__dirname, '../rune-relic-ids-deduplicated.txt');
  if (!fs.existsSync(idsFile)) {
    console.warn('  Warning: rune-relic-ids-deduplicated.txt not found, skipping items');
    return [];
  }

  const idsContent = fs.readFileSync(idsFile, 'utf-8');
  const itemIds = idsContent
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'))
    .map(id => parseInt(id, 10))
    .filter(id => !isNaN(id));

  console.log(`  Found ${itemIds.length} item IDs to fetch`);

  const items = await fetchInBatches(
    itemIds,
    200,
    `${API_BASE}/items?ids={ids}`
  );

  console.log(`  Fetched ${items.length} items`);
  return items;
}

async function fetchConsumables() {
  console.log('Fetching food and utility consumables...');

  // Fetch all item IDs
  const allItemIds = await fetchJson(`${API_BASE}/items`);
  console.log(`  Total items in game: ${allItemIds.length}`);

  // Fetch items in parallel batches to filter for consumables
  console.log('  Fetching and filtering consumables (parallelized)...');
  const batchSize = 200;
  const parallelBatches = 10; // Fetch 10 batches at once
  const consumables = [];

  // Create all batch tasks
  const batches = [];
  for (let i = 0; i < allItemIds.length; i += batchSize) {
    batches.push(allItemIds.slice(i, i + batchSize));
  }

  // Process batches in parallel chunks
  for (let i = 0; i < batches.length; i += parallelBatches) {
    const batchChunk = batches.slice(i, i + parallelBatches);
    const startIdx = i * batchSize;
    process.stdout.write(`\r  Progress: ${Math.floor((startIdx / allItemIds.length) * 100)}% (${startIdx}/${allItemIds.length})`);

    const results = await Promise.all(
      batchChunk.map(async (batch) => {
        try {
          const url = `${API_BASE}/items?ids=${batch.join(',')}`;
          const items = await fetchJson(url);

          // Filter for food and utility consumables
          return items.filter(item => {
            return item.type === 'Consumable' &&
                   item.details &&
                   (item.details.type === 'Food' || item.details.type === 'Utility');
          });
        } catch (error) {
          console.error(`\n  Error fetching batch:`, error.message);
          return [];
        }
      })
    );

    // Flatten results and add to consumables
    results.forEach(result => consumables.push(...result));

    // Small delay between parallel chunks
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log(`\n  ✓ Found ${consumables.length} food and utility items`);

  // Separate food and utility for logging
  const food = consumables.filter(item => item.details.type === 'Food');
  const utility = consumables.filter(item => item.details.type === 'Utility');
  console.log(`    - Food: ${food.length}`);
  console.log(`    - Utility: ${utility.length}`);

  return consumables;
}

async function fetchLegends() {
  console.log('Fetching Revenant legends...');
  const legendIds = await fetchJson(`${API_BASE}/legends`);
  const legends = await fetchJson(`${API_BASE}/legends?ids=${legendIds.join(',')}`);
  console.log(`  ✓ Fetched ${legends.length} legends`);
  return legends;
}

async function fetchPets() {
  console.log('Fetching Ranger pets...');
  const petIds = await fetchJson(`${API_BASE}/pets`);
  const pets = await fetchJson(`${API_BASE}/pets?ids=${petIds.join(',')}`);
  console.log(`  ✓ Fetched ${pets.length} pets`);
  return pets;
}

async function main() {
  console.log('Starting static data fetch...\n');
  console.log(`Mode: ${WIKI_ONLY ? 'WIKI-ONLY (using existing API data)' : 'FULL (API + wiki)'}`);
  console.log(`Wiki scraping: ${WITH_WIKI || WIKI_ONLY ? 'ENABLED' : 'DISABLED'}`);
  if (PROFESSION_FILTER) {
    console.log(`Profession filter: ${PROFESSION_FILTER.join(', ')}`);
  }
  console.log('');

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  try {
    let skillsByProfession, specializations, items, traits, legends, pets, consumables;

    if (WIKI_ONLY) {
      // Load existing data from files
      console.log('Loading existing data from files...');
      skillsByProfession = loadExistingData('skills.json');
      specializations = loadExistingData('specializations.json');
      traits = loadExistingData('traits.json');
      items = loadExistingData('items.json');
      legends = loadExistingData('legends.json');
      pets = loadExistingData('pets.json');
      consumables = loadExistingData('consumables.json');
      console.log('✓ Existing data loaded\n');

      // Filter professions if specified
      if (PROFESSION_FILTER) {
        const filteredSkills = {};
        for (const prof of PROFESSION_FILTER) {
          const profKey = Object.keys(skillsByProfession).find(
            k => k.toLowerCase() === prof.toLowerCase()
          );
          if (profKey) {
            filteredSkills[profKey] = skillsByProfession[profKey];
          }
        }
        skillsByProfession = filteredSkills;
        console.log(`Filtered to ${Object.keys(skillsByProfession).length} profession(s)\n`);
      }
    } else {
      // Fetch all data from API
      const [fetchedSkills, fetchedSpecs, fetchedItems, fetchedLegends, fetchedPets, fetchedConsumables] = await Promise.all([
        fetchSkills(),
        fetchSpecializations(),
        fetchItems(),
        fetchLegends(),
        fetchPets(),
        fetchConsumables(),
      ]);

      skillsByProfession = fetchedSkills;
      specializations = fetchedSpecs;
      items = fetchedItems;
      legends = fetchedLegends;
      pets = fetchedPets;
      consumables = fetchedConsumables;

      // Fetch traits based on specializations
      traits = await fetchTraits(specializations);

      // Filter professions if specified
      if (PROFESSION_FILTER) {
        const filteredSkills = {};
        for (const prof of PROFESSION_FILTER) {
          const profKey = Object.keys(skillsByProfession).find(
            k => k.toLowerCase() === prof.toLowerCase()
          );
          if (profKey) {
            filteredSkills[profKey] = skillsByProfession[profKey];
          }
        }
        skillsByProfession = filteredSkills;
        console.log(`\nFiltered to ${Object.keys(skillsByProfession).length} profession(s)\n`);
      }
    }

    // Enrich with competitive split data from wiki if enabled
    if (WITH_WIKI || WIKI_ONLY) {
      console.log('\nEnriching skills and traits with competitive split data from wiki (parallelized)...');
      console.log('Running 19 parallel workers: 9 professions × skills + 10 trait batches...');
      console.log('Staggering worker starts to avoid overwhelming the wiki server...\n');

      // Prepare all enrichment tasks with staggered starts
      const enrichmentTasks = [];
      let workerIndex = 0;

      // Create skill enrichment tasks for each profession
      for (const [profession, skills] of Object.entries(skillsByProfession)) {
        const startDelay = workerIndex * 100; // Stagger starts by 100ms
        workerIndex++;

        console.log(`  [Skills/${profession}] Starting enrichment of ${skills.length} skills (delay: ${startDelay}ms)...`);
        const task = (async () => {
          // Stagger the start
          await new Promise(resolve => setTimeout(resolve, startDelay));

          const startTime = Date.now();
          console.log(`  [Skills/${profession}] Worker started at ${new Date().toISOString().split('T')[1]}`);

          const enriched = await enrichSkillsWithSplits(skills, {
            delay: 500,
            logProgress: false, // Disable progress logs to avoid clutter
          });

          const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
          const stats = getSplitStats(enriched);
          console.log(`  ✓ [Skills/${profession}] Completed in ${elapsed}s - ${stats.withAnySplit}/${skills.length} skills have competitive splits (PvE: ${stats.withPve}, PvP: ${stats.withPvp}, WvW: ${stats.withWvw})`);
          return { profession, enriched };
        })();
        enrichmentTasks.push(task);
      }

      // Split traits into batches
      const TRAIT_BATCH_SIZE = 100; // ~97 traits per batch for 972 total
      const traitBatches = [];
      for (let i = 0; i < traits.length; i += TRAIT_BATCH_SIZE) {
        traitBatches.push(traits.slice(i, i + TRAIT_BATCH_SIZE));
      }

      // Create parallel trait enrichment tasks
      for (let batchIndex = 0; batchIndex < traitBatches.length; batchIndex++) {
        const batch = traitBatches[batchIndex];
        const startDelay = workerIndex * 100;
        workerIndex++;

        console.log(`  [Traits/Batch${batchIndex + 1}] Starting enrichment of ${batch.length} traits (delay: ${startDelay}ms)...`);

        const task = (async () => {
          await new Promise(resolve => setTimeout(resolve, startDelay));

          const startTime = Date.now();
          console.log(`  [Traits/Batch${batchIndex + 1}] Worker started at ${new Date().toISOString().split('T')[1]}`);

          const enriched = await enrichTraitsWithSplits(batch, {
            delay: 500,
            logProgress: false,
          });

          const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
          const stats = getSplitStats(enriched);
          console.log(`  ✓ [Traits/Batch${batchIndex + 1}] Completed in ${elapsed}s - ${stats.withAnySplit}/${batch.length} traits have competitive splits (PvE: ${stats.withPve}, PvP: ${stats.withPvp}, WvW: ${stats.withWvw})`);

          return { type: 'traits', batchIndex, enriched };
        })();

        enrichmentTasks.push(task);
      }
      console.log(''); // Empty line after all task starts

      // Wait for all enrichment tasks to complete
      console.log('Waiting for all enrichment tasks to complete...\n');
      const results = await Promise.all(enrichmentTasks);

      // Apply results back to data structures
      const traitResults = [];
      for (const result of results) {
        if (result.type === 'traits') {
          traitResults.push(result);
        } else if (result.profession) {
          skillsByProfession[result.profession] = result.enriched;
        }
      }

      // Merge all trait batches back together in order
      if (traitResults.length > 0) {
        traitResults.sort((a, b) => a.batchIndex - b.batchIndex);
        traits = traitResults.flatMap(r => r.enriched);
      }

      console.log('\n✅ All enrichment tasks completed!');
    }

    // Save data to files
    console.log('\nSaving data to files...');

    const dataToSave = {
      'skills.json': skillsByProfession,
      'specializations.json': specializations,
      'traits.json': traits,
      'items.json': items,
      'legends.json': legends,
      'pets.json': pets,
      'consumables.json': consumables,
    };

    for (const [filename, data] of Object.entries(dataToSave)) {
      const filepath = path.join(OUTPUT_DIR, filename);
      fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
      console.log(`  ✓ Saved ${filepath}`);
    }

    // Create a metadata file with timestamp
    const metadata = {
      generated: new Date().toISOString(),
      version: '1.0.0',
      files: Object.keys(dataToSave),
      withCompetitiveSplits: WITH_WIKI,
    };
    fs.writeFileSync(
      path.join(OUTPUT_DIR, 'metadata.json'),
      JSON.stringify(metadata, null, 2)
    );

    console.log('\n✅ Static data fetch complete!');
    console.log(`📦 Data saved to ${OUTPUT_DIR}`);
    if (WITH_WIKI) {
      console.log('🎮 Competitive split data included from GW2 Wiki');
    }
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
