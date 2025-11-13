#!/usr/bin/env node

/**
 * Scrapes ascended feast buff data from GW2 Wiki
 *
 * Usage: node scripts/scrape-feast-buffs.js
 *
 * Generates: public/data/feast-buffs.json
 */

import { JSDOM } from 'jsdom';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Herb effect mapping
const HERB_EFFECTS = {
  'Cilantro': '66% Chance to Steal Life on Critical Hit',
  'Salsa': '66% Chance to Steal Life on Critical Hit',
  'Clove': '-20% Incoming Condition Duration',
  'Orange-Clove': '-20% Incoming Condition Duration',
  'Mint': '+10% Outgoing Healing',
  'Peppercorn': '-10% Incoming Damage',
  'Pepper': '-10% Incoming Damage',
  'Peppered': '-10% Incoming Damage',
  'Spiced': '-10% Incoming Damage',
  'Sesame': 'Gain Health Every Second',
};

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWikiPage(title) {
  const url = `https://wiki.guildwars2.com/wiki/${encodeURIComponent(title)}`;
  console.log(`Fetching: ${url}`);

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const html = await response.text();
    return new JSDOM(html);
  } catch (error) {
    console.error(`Failed to fetch ${url}:`, error.message);
    return null;
  }
}

function getHerbEffect(feastName) {
  // Check feast name against herb keywords
  for (const [herb, effect] of Object.entries(HERB_EFFECTS)) {
    if (feastName.includes(herb)) {
      return effect;
    }
  }

  // End of Dragons feasts have fishing power
  const eodFeasts = [
    'Echovald Hotpot',
    'Jade Sea Bounty',
    'Flight of Sushi',
    'Crispy Fish Pancakes',
    'Imperial Palace Special'
  ];

  if (eodFeasts.some(eod => feastName.includes(eod))) {
    return '+150 Fishing Power';
  }

  return null;
}

async function scrapeFeastTable() {
  const dom = await fetchWikiPage('Ascended_feast');
  if (!dom) {
    throw new Error('Failed to fetch Ascended feast wiki page');
  }

  const document = dom.window.document;
  const feastData = {};

  // Find all tables with feast data
  const tables = document.querySelectorAll('table.table');

  for (const table of tables) {
    const rows = table.querySelectorAll('tr');

    for (const row of rows) {
      const cells = row.querySelectorAll('td');
      if (cells.length < 2) continue;

      // First cell typically contains item link and icon
      const itemLink = cells[0]?.querySelector('a[href*="wiki/"]');
      if (!itemLink) continue;

      const itemName = itemLink.textContent.trim();

      // Look for item ID in data attributes or href
      const itemIdMatch = itemLink.href.match(/id=(\d+)/) ||
                         itemLink.getAttribute('data-item-id')?.match(/(\d+)/);

      if (!itemIdMatch) {
        // Try to find chat link which contains item ID
        const chatLink = row.querySelector('[data-armory-embed]');
        if (chatLink) {
          const embedId = chatLink.getAttribute('data-armory-embed');
          const idMatch = embedId.match(/(\d+)/);
          if (idMatch) {
            const itemId = idMatch[1];

            // Parse stats from the row text
            const rowText = row.textContent;
            const stats = parseStats(rowText);
            const herbEffect = getHerbEffect(itemName);

            if (stats.length > 0) {
              let description = stats.join('\n');
              if (herbEffect) {
                description += '\n' + herbEffect;
              }

              feastData[itemId] = {
                name: itemName,
                description: description
              };

              console.log(`✓ ${itemName} (${itemId})`);
            }
          }
        }
        continue;
      }

      const itemId = itemIdMatch[1];

      // Parse stats from the row
      const rowText = row.textContent;
      const stats = parseStats(rowText);
      const herbEffect = getHerbEffect(itemName);

      if (stats.length > 0) {
        let description = stats.join('\n');
        if (herbEffect) {
          description += '\n' + herbEffect;
        }

        feastData[itemId] = {
          name: itemName,
          description: description
        };

        console.log(`✓ ${itemName} (${itemId})`);
      }
    }
  }

  return feastData;
}

function parseStats(text) {
  const stats = [];

  // Common stat patterns
  const patterns = [
    /\+(\d+)\s+(Power|Precision|Toughness|Vitality|Ferocity|Condition Damage|Healing Power|Expertise|Concentration)/gi,
    /\+(\d+)\s+Fishing Power/gi,
    /\+45\s+All Attributes/gi
  ];

  for (const pattern of patterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      if (match[0].includes('All Attributes')) {
        // Handle celestial-type feasts
        const celestialStats = [
          'Power', 'Precision', 'Toughness', 'Vitality',
          'Ferocity', 'Condition Damage', 'Healing Power',
          'Expertise', 'Concentration'
        ];
        stats.push(...celestialStats.map(stat => `+45 ${stat}`));
      } else {
        stats.push(match[0]);
      }
    }
  }

  // Deduplicate while preserving order
  return [...new Set(stats)];
}

async function main() {
  console.log('🍖 Scraping ascended feast data from GW2 Wiki...\n');

  try {
    const feastData = await scrapeFeastTable();

    const outputPath = path.join(__dirname, '..', 'public', 'data', 'feast-buffs.json');
    await fs.writeFile(
      outputPath,
      JSON.stringify(feastData, null, 2),
      'utf-8'
    );

    const count = Object.keys(feastData).length;
    console.log(`\n✅ Successfully scraped ${count} ascended feasts`);
    console.log(`📝 Saved to: ${outputPath}`);

  } catch (error) {
    console.error('\n❌ Failed to scrape feast data:', error);
    process.exit(1);
  }
}

main();
