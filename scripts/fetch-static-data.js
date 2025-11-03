#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_BASE = 'https://api.guildwars2.com/v2';
const OUTPUT_DIR = path.join(__dirname, '../public/data');

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
  console.log('Fetching skills for all professions...');
  const skillsByProfession = {};

  for (const profession of PROFESSIONS) {
    console.log(`  Fetching ${profession} skills...`);
    // Get all skill IDs
    const allSkillIds = await fetchJson(`${API_BASE}/skills`);

    // Fetch all skills in batches
    const allSkills = await fetchInBatches(
      allSkillIds,
      200,
      `${API_BASE}/skills?ids={ids}`
    );

    // Filter for this profession
    const professionSkills = allSkills.filter(s =>
      s.professions && s.professions.some(p => p.toLowerCase() === profession.toLowerCase())
    );

    console.log(`    Found ${professionSkills.length} skills for ${profession}`);
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

async function main() {
  console.log('Starting static data fetch...\n');

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  try {
    // Fetch all data
    const [skillsByProfession, specializations, items] = await Promise.all([
      fetchSkills(),
      fetchSpecializations(),
      fetchItems(),
    ]);

    // Fetch traits based on specializations
    const traits = await fetchTraits(specializations);

    // Save data to files
    console.log('\nSaving data to files...');

    const dataToSave = {
      'skills.json': skillsByProfession,
      'specializations.json': specializations,
      'traits.json': traits,
      'items.json': items,
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
    };
    fs.writeFileSync(
      path.join(OUTPUT_DIR, 'metadata.json'),
      JSON.stringify(metadata, null, 2)
    );

    console.log('\n✅ Static data fetch complete!');
    console.log(`📦 Data saved to ${OUTPUT_DIR}`);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
