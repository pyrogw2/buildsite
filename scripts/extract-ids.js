// Script to look up rune and relic IDs from wiki names
const API_BASE = 'https://api.guildwars2.com/v2';

const RUNE_NAMES = [
  "Superior Rune of Fireworks",
  "Superior Rune of Surging",
  "Superior Rune of the Pack",
  "Superior Rune of the Citadel",
  "Superior Rune of Strength",
  "Superior Rune of the Privateer",
  "Superior Rune of Hoelbrak",
  "Superior Rune of the Fire",
  "Superior Rune of the Centaur",
  "Superior Rune of the Mad King",
  "Superior Rune of the Flame Legion",
  "Superior Rune of the Baelfire",
  "Superior Rune of the Elementalist",
  "Superior Rune of the Scholar",
  "Superior Rune of the Deadeye",
  "Superior Rune of the Ogre",
  "Superior Rune of Infiltration",
  "Superior Rune of the Spellbreaker",
  "Superior Rune of the Mesmer",
  "Superior Rune of the Chronomancer",
  "Superior Rune of the Reaper",
  "Superior Rune of the Daredevil",
  "Superior Rune of the Scrapper",
  "Superior Rune of the Brawler",
  "Superior Rune of the Cavalier",
  "Superior Rune of Vampirism",
  "Superior Rune of the Holosmith",
  "Superior Rune of Lyssa",
  "Superior Rune of Rata Sum",
  "Superior Rune of the Thief",
  "Superior Rune of the Eagle",
  "Superior Rune of the Ranger",
  "Superior Rune of the Herald",
  "Superior Rune of Durability",
  "Superior Rune of the Earth",
  "Superior Rune of Svanir",
  "Superior Rune of the Forgeman",
  "Superior Rune of the Engineer",
  "Superior Rune of Melandru",
  "Superior Rune of the Dolyak",
  "Superior Rune of Mercy",
  "Superior Rune of the Defender",
  "Superior Rune of the Guardian",
  "Superior Rune of Resistance",
  "Superior Rune of Snowfall",
  "Superior Rune of Sanctuary",
  "Superior Rune of Radiance",
  "Superior Rune of Speed",
  "Superior Rune of the Lich",
  "Superior Rune of the Ice",
  "Superior Rune of the Wurm",
  "Superior Rune of the Warrior",
  "Superior Rune of the Trooper",
  "Superior Rune of Exuberance",
  "Superior Rune of the Aristocracy",
  "Superior Rune of the Firebrand",
  "Superior Rune of the Trapper",
  "Superior Rune of the Nightmare",
  "Superior Rune of the Krait",
  "Superior Rune of Balthazar",
  "Superior Rune of Grenth",
  "Superior Rune of Perplexity",
  "Superior Rune of Thorns",
  "Superior Rune of the Afflicted",
  "Superior Rune of Tormenting",
  "Superior Rune of the Renegade",
  "Superior Rune of the Berserker",
  "Superior Rune of the Soulbeast"
];

const RELIC_NAMES = [
  "Relic of Agony",
  "Relic of Akeem",
  "Relic of Altruism",
  "Relic of Antitoxin",
  "Relic of Atrocity",
  "Relic of Bava Nisos",
  "Relic of Bloodstone",
  "Relic of Castora",
  "Relic of Cerus",
  "Relic of Dagda",
  "Relic of Durability",
  "Relic of Dwayna",
  "Relic of Evasion",
  "Relic of Febe",
  "Relic of Fire",
  "Relic of Fireworks",
  "Relic of Geysers",
  "Relic of Isgarren",
  "Relic of Karakosa",
  "Relic of Leadership",
  "Relic of Lyhr",
  "Relic of Mabon",
  "Relic of Mercy",
  "Relic of Mistburn",
  "Relic of Mosyn",
  "Relic of Mount Balrior",
  "Relic of Nayos",
  "Relic of Nourys",
  "Relic of Peitha",
  "Relic of Resistance",
  "Relic of Reunification",
  "Relic of Rivers",
  "Relic of Sorrow",
  "Relic of Speed",
  "Relic of Surging",
  "Relic of the Adventurer",
  "Relic of the Afflicted",
  "Relic of the Aristocracy",
  "Relic of the Astral Ward",
  "Relic of the Beehive",
  "Relic of the Biomancer",
  "Relic of the Blightbringer",
  "Relic of the Brawler",
  "Relic of the Cavalier",
  "Relic of the Centaur",
  "Relic of the Chronomancer",
  "Relic of the Citadel",
  "Relic of the Claw",
  "Relic of the Daredevil",
  "Relic of the Deadeye",
  "Relic of the Defender",
  "Relic of the Demon Queen",
  "Relic of the Dragonhunter",
  "Relic of the Eagle",
  "Relic of the Earth",
  "Relic of the Firebrand",
  "Relic of the First Revenant",
  "Relic of the Flock",
  "Relic of the Founding",
  "Relic of the Fractal",
  "Relic of the Golemancer",
  "Relic of the Herald",
  "Relic of the Holosmith",
  "Relic of the Ice",
  "Relic of the Krait",
  "Relic of the Lich",
  "Relic of the Living City",
  "Relic of the Midnight King",
  "Relic of the Mirage",
  "Relic of the Mist Stranger",
  "Relic of the Mists Tide",
  "Relic of the Monk",
  "Relic of the Necromancer",
  "Relic of the Nightmare",
  "Relic of the Ogre",
  "Relic of the Pack",
  "Relic of the Phenom",
  "Relic of the Pirate Queen",
  "Relic of the Privateer",
  "Relic of the Reaper",
  "Relic of the Scoundrel",
  "Relic of the Scourge",
  "Relic of the Sorcerer",
  "Relic of the Steamshrieker",
  "Relic of the Stormsinger",
  "Relic of the Sunless",
  "Relic of the Thief",
  "Relic of the Trooper",
  "Relic of the Twin Generals",
  "Relic of the Unseen Invasion",
  "Relic of the Warrior",
  "Relic of the Water",
  "Relic of the Wayfinder",
  "Relic of the Weaver",
  "Relic of the Wizard's Tower",
  "Relic of the Zephyrite",
  "Relic of Thorns",
  "Relic of Vampirism",
  "Relic of Vass",
  "Relic of Zakiros"
];

async function lookupIds() {
  try {
    console.log('Fetching all item IDs...');
    const response = await fetch(`${API_BASE}/items`);
    const allIds = await response.json();
    console.log(`Total items: ${allIds.length}`);

    // Fetch items in batches of 200
    const batchSize = 200;
    const batches = [];

    for (let i = 0; i < allIds.length; i += batchSize) {
      const batch = allIds.slice(i, i + batchSize);
      batches.push(batch);
    }

    console.log(`Searching through ${batches.length} batches for matching names...`);

    const foundRunes = [];
    const foundRelics = [];
    const runeNameSet = new Set(RUNE_NAMES);
    const relicNameSet = new Set(RELIC_NAMES);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const response = await fetch(`${API_BASE}/items?ids=${batch.join(',')}`);
      const items = await response.json();

      items.forEach(item => {
        if (runeNameSet.has(item.name)) {
          foundRunes.push(item);
        } else if (relicNameSet.has(item.name)) {
          foundRelics.push(item);
        }
      });

      if ((i + 1) % 10 === 0) {
        console.log(`Processed ${i + 1}/${batches.length} batches... (${foundRunes.length}/${RUNE_NAMES.length} runes, ${foundRelics.length}/${RELIC_NAMES.length} relics found)`);
      }

      // Early exit if we found everything
      if (foundRunes.length === RUNE_NAMES.length && foundRelics.length === RELIC_NAMES.length) {
        console.log('Found all items!');
        break;
      }
    }

    // Sort by name
    foundRunes.sort((a, b) => a.name.localeCompare(b.name));
    foundRelics.sort((a, b) => a.name.localeCompare(b.name));

    console.log(`\n\nFound ${foundRunes.length}/${RUNE_NAMES.length} Superior Runes:`);
    console.log('export const RUNE_IDS = [');
    foundRunes.forEach(rune => {
      console.log(`  ${rune.id}, // ${rune.name.replace('Superior Rune of the ', '').replace('Superior Rune of ', '')}`);
    });
    console.log('] as const;\n');

    console.log(`\nFound ${foundRelics.length}/${RELIC_NAMES.length} Relics:`);
    console.log('export const RELIC_IDS = [');
    foundRelics.forEach(relic => {
      console.log(`  ${relic.id}, // ${relic.name.replace('Relic of the ', '').replace('Relic of ', '')}`);
    });
    console.log('] as const;');

    // Report any missing items
    if (foundRunes.length < RUNE_NAMES.length) {
      const foundNames = new Set(foundRunes.map(r => r.name));
      const missing = RUNE_NAMES.filter(name => !foundNames.has(name));
      console.log('\n\nMissing runes:');
      missing.forEach(name => console.log(`  - ${name}`));
    }

    if (foundRelics.length < RELIC_NAMES.length) {
      const foundNames = new Set(foundRelics.map(r => r.name));
      const missing = RELIC_NAMES.filter(name => !foundNames.has(name));
      console.log('\n\nMissing relics:');
      missing.forEach(name => console.log(`  - ${name}`));
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

lookupIds();
