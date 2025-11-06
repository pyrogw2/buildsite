#!/usr/bin/env node

import pako from 'pako';

// Build encoder/decoder functions (copied from buildEncoder.ts)
const PROFESSIONS = ['Guardian', 'Warrior', 'Engineer', 'Ranger', 'Thief', 'Elementalist', 'Mesmer', 'Necromancer', 'Revenant'];
const GAME_MODES = ['PvE', 'PvP', 'WvW'];
const SLOTS = ['Helm', 'Shoulders', 'Coat', 'Gloves', 'Leggings', 'Boots', 'Amulet', 'Ring1', 'Ring2', 'Accessory1', 'Accessory2', 'Backpack', 'MainHand1', 'OffHand1', 'MainHand2', 'OffHand2'];
const STATS = ['Berserker', 'Assassin', 'Harrier', 'Commander', 'Minstrel', 'Marauder', 'Marshal', 'Viper', 'Sinister', 'Grieving', 'Trailblazer', 'Seraph', 'Celestial', 'Diviner', 'Vigilant', 'Crusader', 'Wanderer', 'Nomad', 'Sentinel', 'Dire', 'Rabid', 'Magi', 'Apothecary', 'Cleric', 'Giver', 'Knight', 'Cavalier', 'Soldier', 'Shaman', 'Settler', 'Zealot', 'Valkyrie', 'Rampager', 'Carrion', 'Sinister', 'Plaguedoctor', 'Ritualist', 'Dragon', 'Spellbreaker', 'Wanderer'];
const WEAPONS = ['Greatsword', 'Hammer', 'Longbow', 'Rifle', 'Short Bow', 'Staff', 'Axe', 'Dagger', 'Mace', 'Pistol', 'Scepter', 'Sword', 'Focus', 'Shield', 'Torch', 'Warhorn', 'Spear', 'Trident', 'Harpoon Gun'];

function writeVarInt(arr, value) {
  if (value === 0 || value === undefined || value === null) {
    arr.push(0);
    return;
  }
  while (value > 0) {
    let byte = value & 0x7F;
    value >>>= 7;
    if (value > 0) byte |= 0x80;
    arr.push(byte);
  }
}

function readVarInt(bytes, offset) {
  let result = 0;
  let shift = 0;
  while (true) {
    const byte = bytes[offset.value++];
    result |= (byte & 0x7F) << shift;
    if ((byte & 0x80) === 0) break;
    shift += 7;
  }
  return result;
}

function writeString(arr, str) {
  if (!str) {
    arr.push(0);
    return;
  }
  const bytes = new TextEncoder().encode(str);
  writeVarInt(arr, bytes.length);
  arr.push(...bytes);
}

function readString(bytes, offset) {
  const len = readVarInt(bytes, offset);
  if (len === 0) return '';
  const str = new TextDecoder().decode(bytes.slice(offset.value, offset.value + len));
  offset.value += len;
  return str;
}

function decodeBuild(encoded) {
  const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);

  const binary = Buffer.from(padded, 'base64');
  let decompressed;
  try {
    decompressed = pako.inflate(binary);
  } catch (e) {
    console.error('❌ Failed to decompress data:', e.message);
    console.log('Raw base64 length:', base64.length);
    console.log('Binary length:', binary.length);
    throw new Error('Decompression failed: ' + e.message);
  }

  console.log('Version:', decompressed[0]);
  console.log('Total bytes:', decompressed.length);
  console.log('');

  if (decompressed[0] !== 5) {
    console.log('❌ Not version 5, expected version 5 for profession mechanics');
    return;
  }

  const offset = { value: 1 };

  // Read profession + game mode
  const packed = decompressed[offset.value++];
  const profIdx = (packed >> 2) & 0x07;
  const modeIdx = packed & 0x03;

  console.log('Profession:', PROFESSIONS[profIdx]);
  console.log('Game Mode:', GAME_MODES[modeIdx]);
  console.log('');

  // Skip equipment
  const eqCount = decompressed[offset.value++];
  console.log(`Skipping ${eqCount} equipment items...`);
  for (let i = 0; i < eqCount; i++) {
    offset.value++; // slot
    const statByte = decompressed[offset.value++];
    if (statByte === 0) readString(decompressed, offset);
    const weaponByte = decompressed[offset.value++];
    if (weaponByte === 0) readString(decompressed, offset);
    readVarInt(decompressed, offset); // sigil1
    readVarInt(decompressed, offset); // sigil2
    readVarInt(decompressed, offset); // infusion1
    readVarInt(decompressed, offset); // infusion2
    readVarInt(decompressed, offset); // infusion3
  }

  // Skip skills
  console.log('Skills:');
  const skillSlots = ['heal', 'utility1', 'utility2', 'utility3', 'elite'];
  for (const slot of skillSlots) {
    const id = readVarInt(decompressed, offset);
    if (id) console.log(`  ${slot}: ${id}`);
  }
  console.log('');

  // Skip traits
  console.log('Traits:');
  const spec1 = readVarInt(decompressed, offset);
  console.log(`  Spec 1: ${spec1}`);
  readVarInt(decompressed, offset); // choice 1
  readVarInt(decompressed, offset); // choice 2
  readVarInt(decompressed, offset); // choice 3

  const spec2 = readVarInt(decompressed, offset);
  console.log(`  Spec 2: ${spec2}`);
  readVarInt(decompressed, offset);
  readVarInt(decompressed, offset);
  readVarInt(decompressed, offset);

  const spec3 = readVarInt(decompressed, offset);
  console.log(`  Spec 3: ${spec3}`);
  readVarInt(decompressed, offset);
  readVarInt(decompressed, offset);
  readVarInt(decompressed, offset);
  console.log('');

  // Rune and relic
  const runeId = readVarInt(decompressed, offset);
  const relicId = readVarInt(decompressed, offset);
  console.log('Rune ID:', runeId || 'none');
  console.log('Relic ID:', relicId || 'none');
  console.log('');

  // Profession Mechanics
  console.log('Profession Mechanics:');
  console.log(`  Offset before mechanics: ${offset.value}`);

  const evokerFamiliar = readVarInt(decompressed, offset);
  console.log(`  Evoker Familiar: ${evokerFamiliar || 'none'} (offset: ${offset.value})`);

  const legend1 = readString(decompressed, offset);
  const legend2 = readString(decompressed, offset);
  console.log(`  Revenant Legend 1: "${legend1 || 'none'}" (offset: ${offset.value})`);
  console.log(`  Revenant Legend 2: "${legend2 || 'none'}" (offset: ${offset.value})`);

  const morphSlot2 = readVarInt(decompressed, offset);
  const morphSlot3 = readVarInt(decompressed, offset);
  const morphSlot4 = readVarInt(decompressed, offset);
  console.log(`  Amalgam Morph F2: ${morphSlot2 || 'none'} (offset: ${offset.value})`);
  console.log(`  Amalgam Morph F3: ${morphSlot3 || 'none'} (offset: ${offset.value})`);
  console.log(`  Amalgam Morph F4: ${morphSlot4 || 'none'} (offset: ${offset.value})`);

  const pet1 = readVarInt(decompressed, offset);
  const pet2 = readVarInt(decompressed, offset);
  console.log(`  Ranger Pet 1: ${pet1 || 'none'} (offset: ${offset.value})`);
  console.log(`  Ranger Pet 2: ${pet2 || 'none'} (offset: ${offset.value})`);

  console.log('');
  console.log(`Final offset: ${offset.value} / ${decompressed.length}`);
  console.log('Bytes remaining:', decompressed.length - offset.value);
}

// Get encoded build from command line
const encoded = process.argv[2];
if (!encoded) {
  console.log('Usage: node debug-build-encoder.js <encoded-build>');
  console.log('Example: node debug-build-encoder.js eNpVxsERQ...');
  process.exit(1);
}

try {
  decodeBuild(encoded);
} catch (error) {
  console.error('❌ Error decoding build:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
}
