import { encodeBuild } from './src/lib/buildEncoder.ts';

const minstrelBuild = {
  profession: 'Engineer',
  gameMode: 'PvE',
  equipment: [
    { slot: 'Helm', stat: 'Minstrel' },
    { slot: 'Shoulders', stat: 'Minstrel' },
    { slot: 'Coat', stat: 'Dragon' },
    { slot: 'Gloves', stat: 'Minstrel' },
    { slot: 'Leggings', stat: 'Minstrel' },
    { slot: 'Boots', stat: 'Minstrel' },
    { slot: 'Amulet', stat: 'Minstrel' },
    { slot: 'Ring1', stat: 'Minstrel', infusion1: 37125, infusion2: 37125, infusion3: 37125 },
    { slot: 'Ring2', stat: 'Minstrel', infusion1: 37125, infusion2: 37125, infusion3: 37125 },
    { slot: 'Accessory1', stat: 'Minstrel', infusion1: 37125 },
    { slot: 'Accessory2', stat: 'Minstrel', infusion1: 37125 },
    { slot: 'Backpack', stat: 'Viper', infusion1: 37125, infusion2: 37125 },
    { slot: 'MainHand1', stat: 'Minstrel', weaponType: 'Hammer', sigil1Id: 24618, sigil2Id: 24612, infusion1: 37125, infusion2: 37125 },
    { slot: 'OffHand1', stat: 'Minstrel' },
    { slot: 'MainHand2', stat: 'Minstrel', weaponType: 'Rifle', sigil1Id: 24612, sigil2Id: 72092, infusion1: 37125, infusion2: 37125 },
    { slot: 'OffHand2', stat: 'Minstrel' },
  ],
  skills: {
    heal: 5857,
    utility1: 5805,
    utility2: 5802,
    utility3: 6161,
    elite: 30815,
  },
  traits: {
    spec1: 6,  // Explosives
    spec1Choices: [514, 482, 1541],  // Top of each tier
    spec2: 38,  // Firearms
    spec2Choices: [1914, 1984, 510],  // Mix of positions
    spec3: 57,  // Holosmith
    spec3Choices: [2114, 2103, 2066],  // Different positions
  },
  runeId: 24836,
  relicId: 100916,
  professionMechanics: {
    amalgamMorphs: {
      slot2: 5818,
      slot3: 6161,
      slot4: 5818,
    },
  },
};

const encoded = encodeBuild(minstrelBuild);
console.log('='.repeat(80));
console.log('V6 ENCODED BUILD');
console.log('='.repeat(80));
console.log(`URL: ${encoded}`);
console.log(`Length: ${encoded.length} characters`);
console.log(`Previous length: 131 characters`);
console.log(`Savings: ${131 - encoded.length} characters`);
console.log('='.repeat(80));
