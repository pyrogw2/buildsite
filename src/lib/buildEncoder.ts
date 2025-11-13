import pako from 'pako';
import type { BuildData, Profession, GameMode, Equipment, StatCombo, WeaponType, ArmorSlot, WeaponSlot, TrinketSlot, GW2Specialization } from '../types/gw2';
import specializationsData from '../../public/data/specializations.json' with { type: 'json' };

// Type for imported specializations data
type SpecializationsData = GW2Specialization[];

// Type for equipment slot names
type EquipmentSlot = ArmorSlot | WeaponSlot | TrinketSlot;

// Type for equipment with optional infusion properties
type EquipmentWithInfusions = Equipment & {
  infusion1?: number;
  infusion2?: number;
  infusion3?: number;
};

// Type for equipment filtering function
type EquipmentFilter = (eq: Equipment) => boolean;

// Type for skill slot names
type SkillSlot = 'heal' | 'utility1' | 'utility2' | 'utility3' | 'elite';

// Type for trait choices array
type TraitChoices = [number | null, number | null, number | null];

// Type for specification data with choices
type SpecData = {
  id?: number;
  choices?: TraitChoices;
};

// Type for stat names (more permissive for encoding/decoding)
type StatName = string;

// Type for legend names (more permissive for encoding/decoding)
type LegendName = string;

// Profession enum (3 bits, 0-8)
const PROFESSIONS = ['Guardian', 'Warrior', 'Engineer', 'Ranger', 'Thief', 'Elementalist', 'Mesmer', 'Necromancer', 'Revenant'] as const;
// Game mode enum (2 bits, 0-2)
const GAME_MODES = ['PvE', 'PvP', 'WvW'] as const;
// Equipment slots (4 bits, 0-15)
const SLOTS = ['Helm', 'Shoulders', 'Coat', 'Gloves', 'Leggings', 'Boots', 'Amulet', 'Ring1', 'Ring2', 'Accessory1', 'Accessory2', 'Backpack', 'MainHand1', 'OffHand1', 'MainHand2', 'OffHand2'] as const;
// Stat combinations (6 bits, 0-63) - deduplicated for v6
const STATS = ['Berserker', 'Assassin', 'Harrier', 'Commander', 'Minstrel', 'Marauder', 'Marshal', 'Viper', 'Sinister', 'Grieving', 'Trailblazer', 'Seraph', 'Celestial', 'Diviner', 'Vigilant', 'Crusader', 'Wanderer', 'Nomad', 'Sentinel', 'Dire', 'Rabid', 'Magi', 'Apothecary', 'Cleric', 'Giver', 'Knight', 'Cavalier', 'Soldier', 'Shaman', 'Settler', 'Zealot', 'Valkyrie', 'Rampager', 'Carrion', 'Plaguedoctor', 'Ritualist', 'Dragon', 'Spellbreaker', 'Demolisher'] as const;
// Weapon types (5 bits, 0-31)
const WEAPONS = ['Greatsword', 'Hammer', 'Longbow', 'Rifle', 'Short Bow', 'Staff', 'Axe', 'Dagger', 'Mace', 'Pistol', 'Scepter', 'Sword', 'Focus', 'Shield', 'Torch', 'Warhorn', 'Spear', 'Trident', 'Harpoon Gun'] as const;
// Revenant legends (3 bits, 0-7) - for v6 encoding
const REVENANT_LEGENDS = ['Legend1', 'Legend2', 'Legend3', 'Legend4', 'Legend5', 'Legend6', 'Legend7', 'Legend8'] as const;

/**
 * Convert Uint8Array to base64 string efficiently
 */
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  const chunkSize = 8192;
  for (let i = 0; i < len; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  return btoa(binary);
}

/**
 * Write variable-length integer (uses fewer bytes for smaller numbers)
 */
function writeVarInt(arr: number[], value: number) {
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

/**
 * Read variable-length integer
 */
function readVarInt(bytes: Uint8Array, offset: { value: number }): number {
  let result = 0;
  let shift = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const byte = bytes[offset.value++];
    result |= (byte & 0x7F) << shift;
    if ((byte & 0x80) === 0) break;
    shift += 7;
  }
  return result;
}

/**
 * Write string as length-prefixed UTF-8
 */
function writeString(arr: number[], str: string) {
  if (!str) {
    arr.push(0);
    return;
  }
  const bytes = new TextEncoder().encode(str);
  writeVarInt(arr, bytes.length);
  arr.push(...bytes);
}

/**
 * Read length-prefixed UTF-8 string
 */
function readString(bytes: Uint8Array, offset: { value: number }): string {
  const len = readVarInt(bytes, offset);
  if (len === 0) return '';
  const str = new TextDecoder().decode(bytes.slice(offset.value, offset.value + len));
  offset.value += len;
  return str;
}

/**
 * V6 Helper: Write bitflags (up to 16 bits)
 */
function writeBitflags(arr: number[], flags: boolean[], numBits: number) {
  let value = 0;
  for (let i = 0; i < numBits && i < flags.length; i++) {
    if (flags[i]) value |= (1 << i);
  }
  if (numBits <= 8) {
    arr.push(value);
  } else {
    arr.push(value & 0xFF);
    arr.push((value >> 8) & 0xFF);
  }
}

/**
 * V6 Helper: Read bitflags (up to 16 bits)
 */
function readBitflags(bytes: Uint8Array, offset: { value: number }, numBits: number): boolean[] {
  let value = bytes[offset.value++];
  if (numBits > 8) {
    value |= bytes[offset.value++] << 8;
  }
  const flags: boolean[] = [];
  for (let i = 0; i < numBits; i++) {
    flags.push((value & (1 << i)) !== 0);
  }
  return flags;
}

/**
 * V6 Helper: Pack slot index (4 bits) + stat index (6 bits) into 2 bytes
 * Returns [byte1, byte2] where byte1 has slot in lower 4 bits and stat's upper 2 bits in upper 4 bits
 */
function packSlotAndStat(slotIdx: number, statIdx: number): [number, number] {
  // byte1: [stat[5:4], slot[3:0]]
  // byte2: [stat[3:0], 0000]
  const byte1 = (slotIdx & 0x0F) | ((statIdx & 0x30) << 2);
  const byte2 = (statIdx & 0x0F) << 4;
  return [byte1, byte2];
}

/**
 * V6 Helper: Unpack slot index and stat index from 2 bytes
 */
function unpackSlotAndStat(byte1: number, byte2: number): [number, number] {
  const slotIdx = byte1 & 0x0F;
  const statIdx = ((byte1 >> 6) & 0x03) << 4 | ((byte2 >> 4) & 0x0F);
  return [slotIdx, statIdx];
}

/**
 * V6 Helper: Find trait position (0-2) within its tier given spec ID and trait ID
 * Returns [tier (0-2), position (0-2)] or [-1, -1] if not found
 */
function getTraitPosition(specId: number, traitId: number): [number, number] {
  const spec = (specializationsData as SpecializationsData).find(s => s.id === specId);
  if (!spec || !spec.major_traits) return [-1, -1];

  const majorTraits = spec.major_traits;
  const index = majorTraits.indexOf(traitId);
  if (index === -1) return [-1, -1];

  const tier = Math.floor(index / 3); // 0-2 (Adept/Master/Grandmaster)
  const position = index % 3; // 0-2 (top/mid/bot)
  return [tier, position];
}

/**
 * V6 Helper: Get trait ID from spec ID and position
 */
function getTraitIdFromPosition(specId: number, tier: number, position: number): number {
  const spec = (specializationsData as SpecializationsData).find(s => s.id === specId);
  if (!spec || !spec.major_traits) return 0;

  const index = tier * 3 + position;
  return spec.major_traits[index] || 0;
}

/**
 * V6 Helper: Pack 3 trait positions (0-2) for one spec into a single byte
 * Format: 2 bits per position = 6 bits total, upper 2 bits unused
 */
function packTraitPositions(positions: number[]): number {
  return (positions[0] & 0x03) | ((positions[1] & 0x03) << 2) | ((positions[2] & 0x03) << 4);
}

/**
 * V6 Helper: Unpack 3 trait positions from a byte
 */
function unpackTraitPositions(byte: number): [number, number, number] {
  return [
    byte & 0x03,
    (byte >> 2) & 0x03,
    (byte >> 4) & 0x03,
  ];
}


/**
 * Encode build data to a compact binary format (Version 6)
 * Optimizations:
 * - Sparse equipment (only non-default slots)
 * - Bitflags for optional fields
 * - Profession-specific mechanics
 * - Bit-packing for small values
 */
export function encodeBuild(build: BuildData): string {
  try {
    const bytes: number[] = [];

    // Version byte for future compatibility
    bytes.push(6);

    // Profession (3 bits) + GameMode (2 bits) = 1 byte
    const profIdx = PROFESSIONS.indexOf(build.profession);
    const modeIdx = GAME_MODES.indexOf(build.gameMode);
    bytes.push((profIdx << 2) | modeIdx);

    // Find most common stat for armor/trinkets (not weapons)
    const armorTrinketSlots: EquipmentSlot[] = ['Helm', 'Shoulders', 'Coat', 'Gloves', 'Leggings', 'Boots',
                                'Amulet', 'Ring1', 'Ring2', 'Accessory1', 'Accessory2', 'Backpack'];
    const statCounts = new Map<StatName, number>();
    for (const eq of build.equipment) {
      if (armorTrinketSlots.includes(eq.slot)) {
        statCounts.set(eq.stat, (statCounts.get(eq.stat) || 0) + 1);
      }
    }

    let defaultStat: StatName = 'Berserker'; // fallback
    let maxStatCount = 0;
    for (const [stat, count] of statCounts) {
      if (count > maxStatCount) {
        maxStatCount = count;
        defaultStat = stat;
      }
    }

    // Only use dynamic default if it appears 8+ times (saves space)
    const useDefaultStat = maxStatCount >= 8;
    if (!useDefaultStat) defaultStat = 'Berserker';

    // Write default stat (index or 0 for Berserker)
    const defaultStatIdx = STATS.indexOf(defaultStat as typeof STATS[number]);
    bytes.push(defaultStatIdx >= 0 ? defaultStatIdx + 1 : 0);

    // Collect ALL infusions across equipment (order doesn't matter)
    const allInfusions: number[] = [];
    for (const eq of build.equipment) {
      for (const key of ['infusion1', 'infusion2', 'infusion3'] as const) {
        if (eq[key]) allInfusions.push(eq[key]!);
      }
    }

    // Count unique infusions
    const infusionCounts = new Map<number, number>();
    for (const id of allInfusions) {
      infusionCounts.set(id, (infusionCounts.get(id) || 0) + 1);
    }

    // Write infusion types count
    bytes.push(infusionCounts.size);

    // Write each infusion type: count + id
    for (const [id, count] of infusionCounts) {
      writeVarInt(bytes, count);
      writeVarInt(bytes, id);
    }

    // Filter equipment: always encode weapons (need weapon type), skip armor/trinkets if default stat + no sigils
    const isEquipmentRedundant: EquipmentFilter = (eq: Equipment) => {
      // Always encode weapons (they have weapon type and might differ)
      if (eq.weaponType) return false;

      // Skip armor/trinkets if they match default stat with no sigils (infusions handled separately)
      if (eq.stat !== defaultStat) return false;
      if (eq.sigil1Id || eq.sigil2Id) return false;
      return true;
    };

    const nonDefaultEquipment = build.equipment.filter(eq => !isEquipmentRedundant(eq));

    // Equipment count (only non-default)
    bytes.push(nonDefaultEquipment.length);

    for (const eq of nonDefaultEquipment) {
      const slotIdx = SLOTS.indexOf(eq.slot);
      const statIdx = STATS.indexOf(eq.stat as typeof STATS[number]);

      if (statIdx >= 0) {
        // Bit-pack slot and stat indices
        const [byte1, byte2] = packSlotAndStat(slotIdx, statIdx);
        bytes.push(byte1, byte2);
      } else {
        // Fallback: slot index + 0xFF marker + string
        bytes.push(slotIdx);
        bytes.push(0xFF);
        writeString(bytes, eq.stat);
      }

      // Weapon type (index or 0 for none)
      const weaponIdx = eq.weaponType ? WEAPONS.indexOf(eq.weaponType) : -1;
      bytes.push(weaponIdx >= 0 ? weaponIdx + 1 : 0);

      // Sigils bitflags (2 bits: sigil1, sigil2)
      // Infusions are handled separately at build level
      const sigilFlags = [!!eq.sigil1Id, !!eq.sigil2Id];
      writeBitflags(bytes, sigilFlags, 2);

      // Write sigil IDs
      if (eq.sigil1Id) writeVarInt(bytes, eq.sigil1Id);
      if (eq.sigil2Id) writeVarInt(bytes, eq.sigil2Id);
    }

    // Skills bitflags (5 bits: heal, util1, util2, util3, elite)
    const skillSlots: SkillSlot[] = ['heal', 'utility1', 'utility2', 'utility3', 'elite'];
    const skillFlags = skillSlots.map(slot => !!build.skills[slot]);
    writeBitflags(bytes, skillFlags, 5);

    // Only write non-zero skill IDs
    for (const slot of skillSlots) {
      if (build.skills[slot]) {
        writeVarInt(bytes, build.skills[slot]!);
      }
    }

    // Traits - encode spec IDs and packed choices
    const specs: SpecData[] = [
      { id: build.traits.spec1, choices: build.traits.spec1Choices },
      { id: build.traits.spec2, choices: build.traits.spec2Choices },
      { id: build.traits.spec3, choices: build.traits.spec3Choices },
    ];

    // Bitflags for which specs are set (3 bits)
    const specFlags = specs.map(s => !!s.id);
    writeBitflags(bytes, specFlags, 3);

    for (const spec of specs) {
      if (spec.id) {
        writeVarInt(bytes, spec.id);
        // V6: Convert trait IDs to positions (0-2) and pack into 1 byte
        const choices = spec.choices || [null, null, null];
        const positions: number[] = [];
        for (let tier = 0; tier < 3; tier++) {
          const traitId = choices[tier];
          if (traitId) {
            const [foundTier, position] = getTraitPosition(spec.id, traitId);
            if (foundTier === tier) {
              positions.push(position);
            } else {
              positions.push(0); // Fallback to top if not found
            }
          } else {
            positions.push(0); // Default to top if null
          }
        }
        bytes.push(packTraitPositions(positions));
      }
    }

    // Rune and Relic bitflags (2 bits)
    const upgradeFlags = [!!build.runeId, !!build.relicId];
    writeBitflags(bytes, upgradeFlags, 2);
    if (build.runeId) writeVarInt(bytes, build.runeId);
    if (build.relicId) writeVarInt(bytes, build.relicId);

    // Profession-specific mechanics
    const mechanics = build.professionMechanics;

    switch (build.profession) {
      case 'Elementalist': {
        // Evoker familiar (only if set)
        if (mechanics?.evokerFamiliar) {
          bytes.push(1); // flag: has familiar
          writeVarInt(bytes, mechanics.evokerFamiliar);
        } else {
          bytes.push(0);
        }
        break;
      }

      case 'Revenant': {
        // Revenant legends (use enum indices)
        const legend1 = mechanics?.revenantLegends?.legend1;
        const legend2 = mechanics?.revenantLegends?.legend2;
        const legend1Idx = legend1 ? REVENANT_LEGENDS.indexOf(legend1 as typeof REVENANT_LEGENDS[number]) : -1;
        const legend2Idx = legend2 ? REVENANT_LEGENDS.indexOf(legend2 as typeof REVENANT_LEGENDS[number]) : -1;

        bytes.push(legend1Idx >= 0 ? legend1Idx + 1 : 0);
        bytes.push(legend2Idx >= 0 ? legend2Idx + 1 : 0);
        break;
      }

      case 'Engineer': {
        // Amalgam morphs (3 slots, bitflags + values)
        const morphFlags = [
          !!mechanics?.amalgamMorphs?.slot2,
          !!mechanics?.amalgamMorphs?.slot3,
          !!mechanics?.amalgamMorphs?.slot4,
        ];
        writeBitflags(bytes, morphFlags, 3);
        if (mechanics?.amalgamMorphs?.slot2) writeVarInt(bytes, mechanics.amalgamMorphs.slot2);
        if (mechanics?.amalgamMorphs?.slot3) writeVarInt(bytes, mechanics.amalgamMorphs.slot3);
        if (mechanics?.amalgamMorphs?.slot4) writeVarInt(bytes, mechanics.amalgamMorphs.slot4);
        break;
      }

      case 'Ranger': {
        // Ranger pets (2 pets, bitflags + values)
        const petFlags = [
          !!mechanics?.rangerPets?.pet1,
          !!mechanics?.rangerPets?.pet2,
        ];
        writeBitflags(bytes, petFlags, 2);
        if (mechanics?.rangerPets?.pet1) writeVarInt(bytes, mechanics.rangerPets.pet1);
        if (mechanics?.rangerPets?.pet2) writeVarInt(bytes, mechanics.rangerPets.pet2);
        break;
      }

      // Other professions: no mechanics to encode
      default:
        break;
    }

    const binary = new Uint8Array(bytes);
    const compressed = pako.deflate(binary, { level: 9 });
    const base64 = uint8ArrayToBase64(compressed);
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  } catch (error) {
    console.error('Failed to encode build:', error);
    throw error;
  }
}

/**
 * Decode build data from a URL-safe base64 string
 */
export function decodeBuild(encoded: string): BuildData {
  try {
    // Restore standard base64
    const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    // Add padding if needed
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);

    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    const decompressed = pako.inflate(bytes);

    // Check version byte
    if (decompressed[0] === 6) {
      // Binary format (version 6) - optimized with sparse equipment, bitflags, profession-specific mechanics
      const offset = { value: 1 };

      // Read profession + game mode
      const packed = decompressed[offset.value++];
      const profIdx = (packed >> 2) & 0x07;
      const modeIdx = packed & 0x03;

      const build: BuildData = {
        profession: PROFESSIONS[profIdx] as Profession,
        gameMode: GAME_MODES[modeIdx] as GameMode,
        equipment: [],
        skills: {},
        traits: {},
      };

      // Read default stat (0 = Berserker, otherwise index+1)
      const defaultStatByte = decompressed[offset.value++];
      const defaultStat: StatName = defaultStatByte > 0 ? STATS[defaultStatByte - 1] : 'Berserker';

      // Read infusions (stored as counts at build level)
      const infusionTypeCount = decompressed[offset.value++];
      const allInfusions: number[] = [];
      for (let i = 0; i < infusionTypeCount; i++) {
        const count = readVarInt(decompressed, offset);
        const id = readVarInt(decompressed, offset);
        for (let j = 0; j < count; j++) {
          allInfusions.push(id);
        }
      }

      // Track infusion assignment index
      let infusionIdx = 0;

      // Read sparse equipment (only non-default slots encoded)
      const eqCount = decompressed[offset.value++];
      for (let i = 0; i < eqCount; i++) {
        const byte1 = decompressed[offset.value++];

        let slotIdx: number;
        let stat: StatName;

        if (decompressed[offset.value] === 0xFF) {
          // String fallback for unknown stats
          offset.value++; // skip 0xFF marker
          slotIdx = byte1;
          stat = readString(decompressed, offset);
        } else {
          // Bit-packed slot and stat
          const byte2 = decompressed[offset.value++];
          let statIdx: number;
          [slotIdx, statIdx] = unpackSlotAndStat(byte1, byte2);
          stat = STATS[statIdx];
        }

        // Weapon type
        const weaponByte = decompressed[offset.value++];
        const weaponType = weaponByte > 0 ? WEAPONS[weaponByte - 1] : undefined;

        // Read sigil bitflags (2 bits, infusions handled separately)
        const sigilFlags = readBitflags(decompressed, offset, 2);

        // Read sigils
        const sigil1Id = sigilFlags[0] ? readVarInt(decompressed, offset) : undefined;
        const sigil2Id = sigilFlags[1] ? readVarInt(decompressed, offset) : undefined;

        build.equipment.push({
          slot: SLOTS[slotIdx] as EquipmentSlot,
          stat: stat as StatCombo,
          ...(weaponType && { weaponType: weaponType as WeaponType }),
          ...(sigil1Id && { sigil1Id }),
          ...(sigil2Id && { sigil2Id }),
        });
      }

      // Fill in default equipment for missing slots
      const presentSlots = new Set(build.equipment.map(eq => eq.slot));
      const armorTrinketSlots: EquipmentSlot[] = ['Helm', 'Shoulders', 'Coat', 'Gloves', 'Leggings', 'Boots',
                                  'Amulet', 'Ring1', 'Ring2', 'Accessory1', 'Accessory2', 'Backpack'];
      for (const slotName of armorTrinketSlots) {
        if (!presentSlots.has(slotName)) {
          build.equipment.push({
            slot: slotName,
            stat: defaultStat as StatCombo,
          });
        }
      }

      // Also create weapon slots if missing (UI expects all 4 weapon slots to exist)
      const weaponSlots: EquipmentSlot[] = ['MainHand1', 'OffHand1', 'MainHand2', 'OffHand2'];
      for (const slotName of weaponSlots) {
        if (!presentSlots.has(slotName)) {
          build.equipment.push({
            slot: slotName,
            stat: defaultStat as StatCombo,
          });
        }
      }

      // Fill infusions across all equipment in slot order
      // Only fill slots that can actually hold infusions based on equipment type
      build.equipment.sort((a, b) => SLOTS.indexOf(a.slot) - SLOTS.indexOf(b.slot));
      for (const eq of build.equipment) {
        const slot = eq.slot;
        const isRing = slot === 'Ring1' || slot === 'Ring2';
        const isBackpack = slot === 'Backpack';
        const is2HandedWeapon = eq.weaponType && ['Greatsword', 'Hammer', 'Longbow', 'Rifle', 'Short Bow', 'Staff', 'Spear', 'Trident', 'Harpoon Gun'].includes(eq.weaponType);

        // All equipment has at least 1 infusion slot
        if (infusionIdx < allInfusions.length) (eq as EquipmentWithInfusions).infusion1 = allInfusions[infusionIdx++];

        // Backpack and 2-handed weapons have 2 slots
        if ((isBackpack || is2HandedWeapon) && infusionIdx < allInfusions.length) {
          (eq as EquipmentWithInfusions).infusion2 = allInfusions[infusionIdx++];
        }

        // Only rings have 3 slots
        if (isRing && infusionIdx < allInfusions.length) {
          (eq as EquipmentWithInfusions).infusion2 = allInfusions[infusionIdx++];
          if (infusionIdx < allInfusions.length) (eq as EquipmentWithInfusions).infusion3 = allInfusions[infusionIdx++];
        }
      }

      // Read skills (with bitflags)
      const skillSlots: SkillSlot[] = ['heal', 'utility1', 'utility2', 'utility3', 'elite'];
      const skillFlags = readBitflags(decompressed, offset, 5);
      for (let i = 0; i < skillSlots.length; i++) {
        if (skillFlags[i]) {
          build.skills[skillSlots[i]] = readVarInt(decompressed, offset);
        }
      }

      // Read traits (with bitflags)
      const specFlags = readBitflags(decompressed, offset, 3);

      if (specFlags[0]) {
        const specId = readVarInt(decompressed, offset);
        build.traits.spec1 = specId;
        // V6: Unpack positions and convert to trait IDs
        const positions = unpackTraitPositions(decompressed[offset.value++]);
        build.traits.spec1Choices = [
          getTraitIdFromPosition(specId, 0, positions[0]) || null,
          getTraitIdFromPosition(specId, 1, positions[1]) || null,
          getTraitIdFromPosition(specId, 2, positions[2]) || null,
        ];
      }

      if (specFlags[1]) {
        const specId = readVarInt(decompressed, offset);
        build.traits.spec2 = specId;
        const positions = unpackTraitPositions(decompressed[offset.value++]);
        build.traits.spec2Choices = [
          getTraitIdFromPosition(specId, 0, positions[0]) || null,
          getTraitIdFromPosition(specId, 1, positions[1]) || null,
          getTraitIdFromPosition(specId, 2, positions[2]) || null,
        ];
      }

      if (specFlags[2]) {
        const specId = readVarInt(decompressed, offset);
        build.traits.spec3 = specId;
        const positions = unpackTraitPositions(decompressed[offset.value++]);
        build.traits.spec3Choices = [
          getTraitIdFromPosition(specId, 0, positions[0]) || null,
          getTraitIdFromPosition(specId, 1, positions[1]) || null,
          getTraitIdFromPosition(specId, 2, positions[2]) || null,
        ];
      }

      // Read rune and relic (with bitflags)
      const upgradeFlags = readBitflags(decompressed, offset, 2);
      if (upgradeFlags[0]) build.runeId = readVarInt(decompressed, offset);
      if (upgradeFlags[1]) build.relicId = readVarInt(decompressed, offset);

      // Read profession-specific mechanics
      build.professionMechanics = {};

      switch (build.profession) {
        case 'Elementalist': {
          const hasFamiliar = decompressed[offset.value++];
          if (hasFamiliar) {
            build.professionMechanics.evokerFamiliar = readVarInt(decompressed, offset);
          }
          break;
        }

        case 'Revenant': {
          const legend1Idx = decompressed[offset.value++];
          const legend2Idx = decompressed[offset.value++];
          if (legend1Idx > 0 || legend2Idx > 0) {
            build.professionMechanics.revenantLegends = {
              ...(legend1Idx > 0 && { legend1: REVENANT_LEGENDS[legend1Idx - 1] as LegendName }),
              ...(legend2Idx > 0 && { legend2: REVENANT_LEGENDS[legend2Idx - 1] as LegendName }),
            };
          }
          break;
        }

        case 'Engineer': {
          const morphFlags = readBitflags(decompressed, offset, 3);
          const slot2 = morphFlags[0] ? readVarInt(decompressed, offset) : undefined;
          const slot3 = morphFlags[1] ? readVarInt(decompressed, offset) : undefined;
          const slot4 = morphFlags[2] ? readVarInt(decompressed, offset) : undefined;
          if (slot2 || slot3 || slot4) {
            build.professionMechanics.amalgamMorphs = {
              ...(slot2 && { slot2 }),
              ...(slot3 && { slot3 }),
              ...(slot4 && { slot4 }),
            };
          }
          break;
        }

        case 'Ranger': {
          const petFlags = readBitflags(decompressed, offset, 2);
          const pet1 = petFlags[0] ? readVarInt(decompressed, offset) : undefined;
          const pet2 = petFlags[1] ? readVarInt(decompressed, offset) : undefined;
          if (pet1 || pet2) {
            build.professionMechanics.rangerPets = {
              ...(pet1 && { pet1 }),
              ...(pet2 && { pet2 }),
            };
          }
          break;
        }

        // Other professions: no mechanics
        default:
          break;
      }

      return build;
    } else if (decompressed[0] === 5) {
      // Binary format (version 5) - adds all profession mechanics
      const offset = { value: 1 };

      // Read profession + game mode
      const packed = decompressed[offset.value++];
      const profIdx = (packed >> 2) & 0x07;
      const modeIdx = packed & 0x03;

      const build: BuildData = {
        profession: PROFESSIONS[profIdx] as Profession,
        gameMode: GAME_MODES[modeIdx] as GameMode,
        equipment: [],
        skills: {},
        traits: {},
      };

      // Read equipment
      const eqCount = decompressed[offset.value++];
      for (let i = 0; i < eqCount; i++) {
        const slotIdx = decompressed[offset.value++];

        // Read stat (index or string)
        const statByte = decompressed[offset.value++];
        const stat: StatName = statByte > 0 ? STATS[statByte - 1] : readString(decompressed, offset);

        // Read weapon type (index or string)
        const weaponByte = decompressed[offset.value++];
        const weaponType = weaponByte > 0 ? WEAPONS[weaponByte - 1] : readString(decompressed, offset);

        // Read sigils
        const sigil1Id = readVarInt(decompressed, offset);
        const sigil2Id = readVarInt(decompressed, offset);

        // Read infusions as item IDs
        const infusion1 = readVarInt(decompressed, offset);
        const infusion2 = readVarInt(decompressed, offset);
        const infusion3 = readVarInt(decompressed, offset);

        build.equipment.push({
          slot: SLOTS[slotIdx] as EquipmentSlot,
          stat: stat as StatCombo,
          ...(weaponType && { weaponType: weaponType as WeaponType }),
          ...(sigil1Id && { sigil1Id }),
          ...(sigil2Id && { sigil2Id }),
          ...(infusion1 && { infusion1 }),
          ...(infusion2 && { infusion2 }),
          ...(infusion3 && { infusion3 }),
        });
      }

      // Read skills
      const skillSlots: SkillSlot[] = ['heal', 'utility1', 'utility2', 'utility3', 'elite'];
      for (const slot of skillSlots) {
        const id = readVarInt(decompressed, offset);
        if (id) build.skills[slot] = id;
      }

      // Read traits
      build.traits.spec1 = readVarInt(decompressed, offset) || undefined;
      build.traits.spec1Choices = [
        readVarInt(decompressed, offset) || null,
        readVarInt(decompressed, offset) || null,
        readVarInt(decompressed, offset) || null,
      ];

      build.traits.spec2 = readVarInt(decompressed, offset) || undefined;
      build.traits.spec2Choices = [
        readVarInt(decompressed, offset) || null,
        readVarInt(decompressed, offset) || null,
        readVarInt(decompressed, offset) || null,
      ];

      build.traits.spec3 = readVarInt(decompressed, offset) || undefined;
      build.traits.spec3Choices = [
        readVarInt(decompressed, offset) || null,
        readVarInt(decompressed, offset) || null,
        readVarInt(decompressed, offset) || null,
      ];

      // Read rune and relic
      const runeId = readVarInt(decompressed, offset);
      const relicId = readVarInt(decompressed, offset);
      if (runeId) build.runeId = runeId;
      if (relicId) build.relicId = relicId;

      // Read profession mechanics
      build.professionMechanics = {};

      const evokerFamiliar = readVarInt(decompressed, offset);
      if (evokerFamiliar) {
        build.professionMechanics.evokerFamiliar = evokerFamiliar;
      }

      const legend1 = readString(decompressed, offset);
      const legend2 = readString(decompressed, offset);
      if (legend1 || legend2) {
        build.professionMechanics.revenantLegends = {
          ...(legend1 && { legend1 }),
          ...(legend2 && { legend2 }),
        };
      }

      const morphSlot2 = readVarInt(decompressed, offset);
      const morphSlot3 = readVarInt(decompressed, offset);
      const morphSlot4 = readVarInt(decompressed, offset);
      if (morphSlot2 || morphSlot3 || morphSlot4) {
        build.professionMechanics.amalgamMorphs = {
          ...(morphSlot2 && { slot2: morphSlot2 }),
          ...(morphSlot3 && { slot3: morphSlot3 }),
          ...(morphSlot4 && { slot4: morphSlot4 }),
        };
      }

      const pet1 = readVarInt(decompressed, offset);
      const pet2 = readVarInt(decompressed, offset);
      if (pet1 || pet2) {
        build.professionMechanics.rangerPets = {
          ...(pet1 && { pet1 }),
          ...(pet2 && { pet2 }),
        };
      }

      return build;
    } else if (decompressed[0] === 4) {
      // Binary format (version 4) - adds evoker familiar only
      const offset = { value: 1 };

      // Read profession + game mode
      const packed = decompressed[offset.value++];
      const profIdx = (packed >> 2) & 0x07;
      const modeIdx = packed & 0x03;

      const build: BuildData = {
        profession: PROFESSIONS[profIdx] as Profession,
        gameMode: GAME_MODES[modeIdx] as GameMode,
        equipment: [],
        skills: {},
        traits: {},
      };

      // Read equipment
      const eqCount = decompressed[offset.value++];
      for (let i = 0; i < eqCount; i++) {
        const slotIdx = decompressed[offset.value++];

        // Read stat (index or string)
        const statByte = decompressed[offset.value++];
        const stat: StatName = statByte > 0 ? STATS[statByte - 1] : readString(decompressed, offset);

        // Read weapon type (index or string)
        const weaponByte = decompressed[offset.value++];
        const weaponType = weaponByte > 0 ? WEAPONS[weaponByte - 1] : readString(decompressed, offset);

        // Read sigils
        const sigil1Id = readVarInt(decompressed, offset);
        const sigil2Id = readVarInt(decompressed, offset);

        // Read infusions as item IDs
        const infusion1 = readVarInt(decompressed, offset);
        const infusion2 = readVarInt(decompressed, offset);
        const infusion3 = readVarInt(decompressed, offset);

        build.equipment.push({
          slot: SLOTS[slotIdx] as EquipmentSlot,
          stat: stat as StatCombo,
          ...(weaponType && { weaponType: weaponType as WeaponType }),
          ...(sigil1Id && { sigil1Id }),
          ...(sigil2Id && { sigil2Id }),
          ...(infusion1 && { infusion1 }),
          ...(infusion2 && { infusion2 }),
          ...(infusion3 && { infusion3 }),
        });
      }

      // Read skills
      const skillSlots: SkillSlot[] = ['heal', 'utility1', 'utility2', 'utility3', 'elite'];
      for (const slot of skillSlots) {
        const id = readVarInt(decompressed, offset);
        if (id) build.skills[slot] = id;
      }

      // Read traits
      build.traits.spec1 = readVarInt(decompressed, offset) || undefined;
      build.traits.spec1Choices = [
        readVarInt(decompressed, offset) || null,
        readVarInt(decompressed, offset) || null,
        readVarInt(decompressed, offset) || null,
      ];

      build.traits.spec2 = readVarInt(decompressed, offset) || undefined;
      build.traits.spec2Choices = [
        readVarInt(decompressed, offset) || null,
        readVarInt(decompressed, offset) || null,
        readVarInt(decompressed, offset) || null,
      ];

      build.traits.spec3 = readVarInt(decompressed, offset) || undefined;
      build.traits.spec3Choices = [
        readVarInt(decompressed, offset) || null,
        readVarInt(decompressed, offset) || null,
        readVarInt(decompressed, offset) || null,
      ];

      // Read rune and relic
      const runeId = readVarInt(decompressed, offset);
      const relicId = readVarInt(decompressed, offset);
      if (runeId) build.runeId = runeId;
      if (relicId) build.relicId = relicId;

      // Read profession mechanics
      const evokerFamiliar = readVarInt(decompressed, offset);
      if (evokerFamiliar) {
        build.professionMechanics = { evokerFamiliar };
      }
      // TODO: Add other profession mechanics as they are implemented

      return build;
    } else if (decompressed[0] === 3) {
      // Binary format (version 3) - uses indices for stats/weapons/infusions
      const offset = { value: 1 };

      // Read profession + game mode
      const packed = decompressed[offset.value++];
      const profIdx = (packed >> 2) & 0x07;
      const modeIdx = packed & 0x03;

      const build: BuildData = {
        profession: PROFESSIONS[profIdx] as Profession,
        gameMode: GAME_MODES[modeIdx] as GameMode,
        equipment: [],
        skills: {},
        traits: {},
      };

      // Read equipment
      const eqCount = decompressed[offset.value++];
      for (let i = 0; i < eqCount; i++) {
        const slotIdx = decompressed[offset.value++];

        // Read stat (index or string)
        const statByte = decompressed[offset.value++];
        const stat: StatName = statByte > 0 ? STATS[statByte - 1] : readString(decompressed, offset);

        // Read weapon type (index or string)
        const weaponByte = decompressed[offset.value++];
        const weaponType = weaponByte > 0 ? WEAPONS[weaponByte - 1] : readString(decompressed, offset);

        // Read sigils
        const sigil1Id = readVarInt(decompressed, offset);
        const sigil2Id = readVarInt(decompressed, offset);

        // Read infusions as item IDs
        const infusion1 = readVarInt(decompressed, offset);
        const infusion2 = readVarInt(decompressed, offset);
        const infusion3 = readVarInt(decompressed, offset);

        const equipmentItem: Equipment = {
          slot: SLOTS[slotIdx] as ArmorSlot | WeaponSlot | TrinketSlot,
          stat: stat as StatCombo,
          ...(weaponType && { weaponType: weaponType as WeaponType }),
          ...(sigil1Id && { sigil1Id }),
          ...(sigil2Id && { sigil2Id }),
          ...(infusion1 && { infusion1 }),
          ...(infusion2 && { infusion2 }),
          ...(infusion3 && { infusion3 }),
        };

        build.equipment.push(equipmentItem);
      }

      // Read skills
      const skillSlots: SkillSlot[] = ['heal', 'utility1', 'utility2', 'utility3', 'elite'];
      for (const slot of skillSlots) {
        const id = readVarInt(decompressed, offset);
        if (id) build.skills[slot] = id;
      }

      // Read traits
      build.traits.spec1 = readVarInt(decompressed, offset) || undefined;
      build.traits.spec1Choices = [
        readVarInt(decompressed, offset) || null,
        readVarInt(decompressed, offset) || null,
        readVarInt(decompressed, offset) || null,
      ];

      build.traits.spec2 = readVarInt(decompressed, offset) || undefined;
      build.traits.spec2Choices = [
        readVarInt(decompressed, offset) || null,
        readVarInt(decompressed, offset) || null,
        readVarInt(decompressed, offset) || null,
      ];

      build.traits.spec3 = readVarInt(decompressed, offset) || undefined;
      build.traits.spec3Choices = [
        readVarInt(decompressed, offset) || null,
        readVarInt(decompressed, offset) || null,
        readVarInt(decompressed, offset) || null,
      ];

      // Read rune and relic
      const runeId = readVarInt(decompressed, offset);
      const relicId = readVarInt(decompressed, offset);
      if (runeId) build.runeId = runeId;
      if (relicId) build.relicId = relicId;

      return build;
    } else if (decompressed[0] === 2) {
      // Binary format (version 2) - uses strings for stats/weapons/infusions (backwards compat)
      const offset = { value: 1 };

      // Read profession + game mode
      const packed = decompressed[offset.value++];
      const profIdx = (packed >> 2) & 0x07;
      const modeIdx = packed & 0x03;

      const build: BuildData = {
        profession: PROFESSIONS[profIdx] as Profession,
        gameMode: GAME_MODES[modeIdx] as GameMode,
        equipment: [],
        skills: {},
        traits: {},
      };

      // Read equipment
      const eqCount = decompressed[offset.value++];
      for (let i = 0; i < eqCount; i++) {
        const slotIdx = decompressed[offset.value++];
        const stat = readString(decompressed, offset);
        const weaponType = readString(decompressed, offset);
        const upgrade = readString(decompressed, offset);
        const sigil1Id = readVarInt(decompressed, offset);
        const sigil2Id = readVarInt(decompressed, offset);
        const infusion1 = readString(decompressed, offset);
        const infusion2 = readString(decompressed, offset);
        const infusion3 = readString(decompressed, offset);

        const equipmentItem: Equipment = {
          slot: SLOTS[slotIdx] as ArmorSlot | WeaponSlot | TrinketSlot,
          stat: stat as StatCombo,
          ...(weaponType && { weaponType: weaponType as WeaponType }),
          ...(upgrade && { upgrade }),
          ...(sigil1Id && { sigil1Id }),
          ...(sigil2Id && { sigil2Id }),
          ...(infusion1 && { infusion1: parseInt(infusion1) || undefined }),
          ...(infusion2 && { infusion2: parseInt(infusion2) || undefined }),
          ...(infusion3 && { infusion3: parseInt(infusion3) || undefined }),
        };

        build.equipment.push(equipmentItem);
      }

      // Read skills
      const skillSlots: SkillSlot[] = ['heal', 'utility1', 'utility2', 'utility3', 'elite'];
      for (const slot of skillSlots) {
        const id = readVarInt(decompressed, offset);
        if (id) build.skills[slot] = id;
      }

      // Read traits
      build.traits.spec1 = readVarInt(decompressed, offset) || undefined;
      build.traits.spec1Choices = [
        readVarInt(decompressed, offset) || null,
        readVarInt(decompressed, offset) || null,
        readVarInt(decompressed, offset) || null,
      ];

      build.traits.spec2 = readVarInt(decompressed, offset) || undefined;
      build.traits.spec2Choices = [
        readVarInt(decompressed, offset) || null,
        readVarInt(decompressed, offset) || null,
        readVarInt(decompressed, offset) || null,
      ];

      build.traits.spec3 = readVarInt(decompressed, offset) || undefined;
      build.traits.spec3Choices = [
        readVarInt(decompressed, offset) || null,
        readVarInt(decompressed, offset) || null,
        readVarInt(decompressed, offset) || null,
      ];

      // Read rune and relic
      const runeId = readVarInt(decompressed, offset);
      const relicId = readVarInt(decompressed, offset);
      if (runeId) build.runeId = runeId;
      if (relicId) build.relicId = relicId;

      return build;
    } else {
      // Old JSON format (version 1 or legacy)
      const decompressedStr = pako.inflate(bytes, { to: 'string' });
      const parsed = JSON.parse(decompressedStr);

      // Check if it's compact JSON format (version 1)
      if (parsed.p !== undefined) {
        return {
          profession: parsed.p,
          gameMode: parsed.g,
          equipment: parsed.e.map((eq: Equipment) => ({
            slot: eq.slot,
            stat: eq.stat,
            ...(eq.weaponType && { weaponType: eq.weaponType }),
            ...(eq.upgrade && { upgrade: eq.upgrade }),
            ...(eq.sigil1Id && { sigil1Id: eq.sigil1Id }),
            ...(eq.sigil2Id && { sigil2Id: eq.sigil2Id }),
            ...(eq.infusion1 && { infusion1: eq.infusion1 }),
            ...(eq.infusion2 && { infusion2: eq.infusion2 }),
            ...(eq.infusion3 && { infusion3: eq.infusion3 }),
          })),
          skills: parsed.sk,
          traits: parsed.t,
          ...(parsed.r && { runeId: parsed.r }),
          ...(parsed.rl && { relicId: parsed.rl }),
        };
      }

      // Legacy full JSON format
      return parsed;
    }
  } catch (error) {
    console.error('Failed to decode build:', error);
    throw error;
  }
}

/**
 * Convert specialization or profession name to URL-friendly slug
 * Examples: "Dragon Hunter" -> "dragonhunter", "Amalgam" -> "amalgam"
 */
function toSpecSlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '');
}

/**
 * Get the elite specialization name or profession name for URL
 * Checks spec3, spec2, spec1 in order for elite specs, falls back to profession
 */
function getEliteSpecOrProfession(build: BuildData): string {
  const specs = specializationsData as SpecializationsData;

  // Check spec3 (bottom slot, most common for elite spec)
  if (build.traits.spec3) {
    const spec = specs.find(s => s.id === build.traits.spec3);
    if (spec?.elite) {
      return toSpecSlug(spec.name);
    }
  }

  // Check spec2 (middle slot)
  if (build.traits.spec2) {
    const spec = specs.find(s => s.id === build.traits.spec2);
    if (spec?.elite) {
      return toSpecSlug(spec.name);
    }
  }

  // Check spec1 (top slot)
  if (build.traits.spec1) {
    const spec = specs.find(s => s.id === build.traits.spec1);
    if (spec?.elite) {
      return toSpecSlug(spec.name);
    }
  }

  // No elite spec found, use profession name
  return toSpecSlug(build.profession);
}

/**
 * Get shareable URL for current build
 * Includes elite spec or profession name for better readability
 */
export function getShareableUrl(build: BuildData): string {
  const url = new URL(window.location.href);
  const encoded = encodeBuild(build);
  const specSlug = getEliteSpecOrProfession(build);

  // Clear existing params and rebuild in correct order
  url.search = '';
  url.searchParams.set('spec', specSlug);
  url.searchParams.set('build', encoded);

  return url.toString();
}

/**
 * Load build from URL if present
 */
export function loadBuildFromUrl(): BuildData | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const buildParam = params.get('build');
    if (buildParam) {
      return decodeBuild(buildParam);
    }
  } catch (error) {
    console.error('Failed to load build from URL:', error);
  }
  return null;
}
