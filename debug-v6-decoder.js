import pako from 'pako';

const PROFESSIONS = ['Guardian', 'Warrior', 'Engineer', 'Ranger', 'Thief', 'Elementalist', 'Mesmer', 'Necromancer', 'Revenant'];
const GAME_MODES = ['PvE', 'PvP', 'WvW'];
const SLOTS = ['Helm', 'Shoulders', 'Coat', 'Gloves', 'Leggings', 'Boots', 'Amulet', 'Ring1', 'Ring2', 'Accessory1', 'Accessory2', 'Backpack', 'MainHand1', 'OffHand1', 'MainHand2', 'OffHand2'];
const STATS = ['Berserker', 'Assassin', 'Harrier', 'Commander', 'Minstrel', 'Marauder', 'Marshal', 'Viper', 'Sinister', 'Grieving', 'Trailblazer', 'Seraph', 'Celestial', 'Diviner', 'Vigilant', 'Crusader', 'Wanderer', 'Nomad', 'Sentinel', 'Dire', 'Rabid', 'Magi', 'Apothecary', 'Cleric', 'Giver', 'Knight', 'Cavalier', 'Soldier', 'Shaman', 'Settler', 'Zealot', 'Valkyrie', 'Rampager', 'Carrion', 'Plaguedoctor', 'Ritualist', 'Dragon', 'Spellbreaker'];
const WEAPONS = ['Greatsword', 'Hammer', 'Longbow', 'Rifle', 'Short Bow', 'Staff', 'Axe', 'Dagger', 'Mace', 'Pistol', 'Scepter', 'Sword', 'Focus', 'Shield', 'Torch', 'Warhorn', 'Spear', 'Trident', 'Harpoon Gun'];
const REVENANT_LEGENDS = ['Legend1', 'Legend2', 'Legend3', 'Legend4', 'Legend5', 'Legend6', 'Legend7', 'Legend8'];

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

function readBitflags(bytes, offset, numBits) {
  let value = bytes[offset.value++];
  if (numBits > 8) {
    value |= bytes[offset.value++] << 8;
  }
  const flags = [];
  for (let i = 0; i < numBits; i++) {
    flags.push((value & (1 << i)) !== 0);
  }
  return flags;
}

function unpackSlotAndStat(byte1, byte2) {
  const slotIdx = byte1 & 0x0F;
  const statIdx = ((byte1 >> 6) & 0x03) << 4 | ((byte2 >> 4) & 0x0F);
  return [slotIdx, statIdx];
}

function unpackTraitChoices(value) {
  const choice0 = (value >> 0) & 0x03;
  const choice1 = (value >> 2) & 0x03;
  const choice2 = (value >> 4) & 0x03;
  return [choice0, choice1, choice2];
}

function decodeV6(encoded) {
  console.log('='.repeat(80));
  console.log('DECODING V6 BUILD');
  console.log('='.repeat(80));
  console.log(`Input: ${encoded}`);
  console.log(`Length: ${encoded.length} characters\n`);

  // Restore standard base64
  const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);

  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  const decompressed = pako.inflate(bytes);
  console.log(`Decompressed size: ${decompressed.length} bytes`);
  console.log(`Decompressed bytes (hex): ${Array.from(decompressed).map(b => b.toString(16).padStart(2, '0')).join(' ')}\n`);

  const version = decompressed[0];
  console.log(`Version: ${version}`);

  if (version !== 6) {
    console.log(`ERROR: Not a V6 build (version=${version})`);
    return;
  }

  const offset = { value: 1 };

  // Profession + Mode
  const packed = decompressed[offset.value++];
  const profIdx = (packed >> 2) & 0x07;
  const modeIdx = packed & 0x03;
  console.log(`Profession: ${PROFESSIONS[profIdx]} (index ${profIdx})`);
  console.log(`Game Mode: ${GAME_MODES[modeIdx]} (index ${modeIdx})\n`);

  // Equipment
  const eqCount = decompressed[offset.value++];
  console.log(`Equipment count: ${eqCount}`);
  for (let i = 0; i < eqCount; i++) {
    const byte1 = decompressed[offset.value++];
    let slotIdx, stat;

    if (decompressed[offset.value] === 0xFF) {
      offset.value++;
      slotIdx = byte1;
      console.log(`  Equipment ${i}: slot=${SLOTS[slotIdx]}, stat=<string fallback>`);
    } else {
      const byte2 = decompressed[offset.value++];
      let statIdx;
      [slotIdx, statIdx] = unpackSlotAndStat(byte1, byte2);
      stat = STATS[statIdx];
      console.log(`  Equipment ${i}: slot=${SLOTS[slotIdx]}, stat=${stat}`);
    }

    const weaponByte = decompressed[offset.value++];
    const weaponType = weaponByte > 0 ? WEAPONS[weaponByte - 1] : undefined;
    if (weaponType) console.log(`    weapon=${weaponType}`);

    const upgradeFlags = readBitflags(decompressed, offset, 5);
    console.log(`    upgrade flags: sigil1=${upgradeFlags[0]}, sigil2=${upgradeFlags[1]}, inf1=${upgradeFlags[2]}, inf2=${upgradeFlags[3]}, inf3=${upgradeFlags[4]}`);

    if (upgradeFlags[0]) console.log(`    sigil1=${readVarInt(decompressed, offset)}`);
    if (upgradeFlags[1]) console.log(`    sigil2=${readVarInt(decompressed, offset)}`);
    if (upgradeFlags[2]) console.log(`    inf1=${readVarInt(decompressed, offset)}`);
    if (upgradeFlags[3]) console.log(`    inf2=${readVarInt(decompressed, offset)}`);
    if (upgradeFlags[4]) console.log(`    inf3=${readVarInt(decompressed, offset)}`);
  }

  // Skills
  console.log(`\nSkills (offset=${offset.value}):`);
  const skillFlags = readBitflags(decompressed, offset, 5);
  console.log(`  Skill flags: heal=${skillFlags[0]}, util1=${skillFlags[1]}, util2=${skillFlags[2]}, util3=${skillFlags[3]}, elite=${skillFlags[4]}`);
  const skillSlots = ['heal', 'utility1', 'utility2', 'utility3', 'elite'];
  for (let i = 0; i < skillSlots.length; i++) {
    if (skillFlags[i]) {
      const id = readVarInt(decompressed, offset);
      console.log(`  ${skillSlots[i]}=${id}`);
    }
  }

  // Traits
  console.log(`\nTraits (offset=${offset.value}):`);
  const specFlags = readBitflags(decompressed, offset, 3);
  console.log(`  Spec flags: spec1=${specFlags[0]}, spec2=${specFlags[1]}, spec3=${specFlags[2]}`);

  if (specFlags[0]) {
    const spec1 = readVarInt(decompressed, offset);
    const packed = decompressed[offset.value++];
    const choices = unpackTraitChoices(packed);
    console.log(`  Spec 1: id=${spec1}, choices=[${choices.join(', ')}], packed byte=0x${packed.toString(16)}`);
  }

  if (specFlags[1]) {
    const spec2 = readVarInt(decompressed, offset);
    const packed = decompressed[offset.value++];
    const choices = unpackTraitChoices(packed);
    console.log(`  Spec 2: id=${spec2}, choices=[${choices.join(', ')}], packed byte=0x${packed.toString(16)}`);
  }

  if (specFlags[2]) {
    const spec3 = readVarInt(decompressed, offset);
    const packed = decompressed[offset.value++];
    const choices = unpackTraitChoices(packed);
    console.log(`  Spec 3: id=${spec3}, choices=[${choices.join(', ')}], packed byte=0x${packed.toString(16)}`);
  }

  // Rune/Relic
  console.log(`\nRune/Relic (offset=${offset.value}):`);
  const upgradeFlags = readBitflags(decompressed, offset, 2);
  console.log(`  Upgrade flags: rune=${upgradeFlags[0]}, relic=${upgradeFlags[1]}`);
  if (upgradeFlags[0]) console.log(`  Rune: ${readVarInt(decompressed, offset)}`);
  if (upgradeFlags[1]) console.log(`  Relic: ${readVarInt(decompressed, offset)}`);

  // Profession Mechanics
  console.log(`\nProfession Mechanics (offset=${offset.value}):`);
  const profession = PROFESSIONS[profIdx];

  switch (profession) {
    case 'Elementalist':
      const hasFamiliar = decompressed[offset.value++];
      console.log(`  Has Familiar: ${hasFamiliar}`);
      if (hasFamiliar) {
        console.log(`  Familiar ID: ${readVarInt(decompressed, offset)}`);
      }
      break;

    case 'Revenant':
      const legend1Idx = decompressed[offset.value++];
      const legend2Idx = decompressed[offset.value++];
      console.log(`  Legend 1 index: ${legend1Idx} (${legend1Idx > 0 ? REVENANT_LEGENDS[legend1Idx - 1] : 'none'})`);
      console.log(`  Legend 2 index: ${legend2Idx} (${legend2Idx > 0 ? REVENANT_LEGENDS[legend2Idx - 1] : 'none'})`);
      break;

    case 'Engineer':
      const morphFlags = readBitflags(decompressed, offset, 3);
      console.log(`  Morph flags: slot2=${morphFlags[0]}, slot3=${morphFlags[1]}, slot4=${morphFlags[2]}`);
      if (morphFlags[0]) console.log(`  Slot 2: ${readVarInt(decompressed, offset)}`);
      if (morphFlags[1]) console.log(`  Slot 3: ${readVarInt(decompressed, offset)}`);
      if (morphFlags[2]) console.log(`  Slot 4: ${readVarInt(decompressed, offset)}`);
      break;

    case 'Ranger':
      const petFlags = readBitflags(decompressed, offset, 2);
      console.log(`  Pet flags: pet1=${petFlags[0]}, pet2=${petFlags[1]}`);
      if (petFlags[0]) console.log(`  Pet 1: ${readVarInt(decompressed, offset)}`);
      if (petFlags[1]) console.log(`  Pet 2: ${readVarInt(decompressed, offset)}`);
      break;

    default:
      console.log(`  (No profession mechanics for ${profession})`);
      break;
  }

  console.log(`\nFinal offset: ${offset.value} (of ${decompressed.length} bytes)`);
  console.log('='.repeat(80));
}

// Test with the provided URL
const buildParam = "eNpj4-JlYGBg-XaRiRFCMUEoZgjFAqFYIRQ3AwMPkAIiTogAF4RiZ2CQgYgDEQcyh4eBiX_OZhYggvD5GFhA_Ef7GSF8-Ye6u3TP6W7RPXiThV2WQZTBm4G5-x_ThQls7PNvsrTdYOm_wQIA8TU3qQ";
decodeV6(buildParam);
