import { encodeBuild, decodeBuild } from './dist/assets/index-G7ndVxUJ.js';

// Test cases
const testCases = [
  {
    name: 'Empty build (all defaults)',
    build: {
      profession: 'Guardian',
      gameMode: 'PvE',
      equipment: Array(16).fill(null).map((_, i) => ({
        slot: ['Helm', 'Shoulders', 'Coat', 'Gloves', 'Leggings', 'Boots', 'Amulet', 'Ring1', 'Ring2', 'Accessory1', 'Accessory2', 'Backpack', 'MainHand1', 'OffHand1', 'MainHand2', 'OffHand2'][i],
        stat: 'Berserker',
      })),
      skills: {},
      traits: {},
    },
  },
  {
    name: 'Partial build (some equipment, skills, traits)',
    build: {
      profession: 'Necromancer',
      gameMode: 'PvE',
      equipment: [
        { slot: 'Helm', stat: 'Viper', sigil1Id: 24639 },
        { slot: 'Shoulders', stat: 'Viper' },
        { slot: 'Coat', stat: 'Viper' },
        { slot: 'Gloves', stat: 'Viper' },
        { slot: 'Leggings', stat: 'Viper' },
        { slot: 'Boots', stat: 'Viper' },
        { slot: 'Amulet', stat: 'Berserker' },
        { slot: 'Ring1', stat: 'Berserker' },
        { slot: 'Ring2', stat: 'Berserker' },
        { slot: 'Accessory1', stat: 'Berserker' },
        { slot: 'Accessory2', stat: 'Berserker' },
        { slot: 'Backpack', stat: 'Berserker' },
        { slot: 'MainHand1', stat: 'Viper', weaponType: 'Scepter', sigil1Id: 24639 },
        { slot: 'OffHand1', stat: 'Viper', weaponType: 'Dagger', sigil1Id: 24609 },
        { slot: 'MainHand2', stat: 'Berserker', weaponType: 'Axe' },
        { slot: 'OffHand2', stat: 'Berserker', weaponType: 'Warhorn' },
      ],
      skills: {
        heal: 10527,
        utility1: 10541,
        utility2: 10549,
        utility3: 10685,
        elite: 10646,
      },
      traits: {
        spec1: 50,
        spec1Choices: [2, 1, 2],
        spec2: 39,
        spec2Choices: [0, 1, 2],
        spec3: 34,
        spec3Choices: [1, 0, 2],
      },
      runeId: 24836,
      relicId: 100916,
    },
  },
  {
    name: 'Full build with infusions and profession mechanics (Ranger)',
    build: {
      profession: 'Ranger',
      gameMode: 'PvE',
      equipment: [
        { slot: 'Helm', stat: 'Berserker', infusion1: 49424, infusion2: 49424 },
        { slot: 'Shoulders', stat: 'Berserker', infusion1: 49424 },
        { slot: 'Coat', stat: 'Berserker', infusion1: 49424 },
        { slot: 'Gloves', stat: 'Berserker', infusion1: 49424 },
        { slot: 'Leggings', stat: 'Berserker', infusion1: 49424 },
        { slot: 'Boots', stat: 'Berserker', infusion1: 49424 },
        { slot: 'Amulet', stat: 'Berserker', infusion1: 49424 },
        { slot: 'Ring1', stat: 'Berserker', infusion1: 49424, infusion2: 49424, infusion3: 49424 },
        { slot: 'Ring2', stat: 'Berserker', infusion1: 49424, infusion2: 49424, infusion3: 49424 },
        { slot: 'Accessory1', stat: 'Berserker', infusion1: 49424 },
        { slot: 'Accessory2', stat: 'Berserker', infusion1: 49424 },
        { slot: 'Backpack', stat: 'Berserker', infusion1: 49424, infusion2: 49424 },
        { slot: 'MainHand1', stat: 'Berserker', weaponType: 'Sword', sigil1Id: 24615, infusion1: 49424 },
        { slot: 'OffHand1', stat: 'Berserker', weaponType: 'Axe', sigil1Id: 24868, infusion1: 49424 },
        { slot: 'MainHand2', stat: 'Berserker', weaponType: 'Greatsword', sigil1Id: 24615, sigil2Id: 24868, infusion1: 49424, infusion2: 49424 },
        { slot: 'OffHand2', stat: 'Berserker' },
      ],
      skills: {
        heal: 12489,
        utility1: 12492,
        utility2: 12491,
        utility3: 12633,
        elite: 45717,
      },
      traits: {
        spec1: 8,
        spec1Choices: [0, 1, 0],
        spec2: 32,
        spec2Choices: [1, 2, 1],
        spec3: 55,
        spec3Choices: [0, 1, 2],
      },
      runeId: 24836,
      relicId: 100916,
      professionMechanics: {
        rangerPets: {
          pet1: 44617,
          pet2: 44944,
        },
      },
    },
  },
];

console.log('Testing V6 Encoder/Decoder\n');
console.log('=' .repeat(80));

for (const testCase of testCases) {
  console.log(`\nTest: ${testCase.name}`);
  console.log('-'.repeat(80));

  try {
    // Encode
    const encoded = encodeBuild(testCase.build);
    console.log(`Encoded length: ${encoded.length} characters`);
    console.log(`Encoded: ${encoded.substring(0, 60)}...`);

    // Decode
    const decoded = decodeBuild(encoded);
    console.log(`\nDecoded successfully!`);

    // Verify key fields
    console.log(`Profession: ${decoded.profession} (expected: ${testCase.build.profession})`);
    console.log(`Game Mode: ${decoded.gameMode} (expected: ${testCase.build.gameMode})`);
    console.log(`Equipment count: ${decoded.equipment.length} (expected: ${testCase.build.equipment.length})`);
    console.log(`Skills count: ${Object.keys(decoded.skills).length} (expected: ${Object.keys(testCase.build.skills).length})`);

    // Basic validation
    if (decoded.profession !== testCase.build.profession) {
      console.error('❌ Profession mismatch!');
    } else if (decoded.gameMode !== testCase.build.gameMode) {
      console.error('❌ Game mode mismatch!');
    } else if (decoded.equipment.length !== testCase.build.equipment.length) {
      console.error('❌ Equipment count mismatch!');
    } else {
      console.log('✅ Basic validation passed!');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

console.log('\n' + '='.repeat(80));
console.log('Tests complete!');
