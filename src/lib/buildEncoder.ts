import pako from 'pako';
import type { BuildData } from '../types/gw2';

// Profession enum (3 bits, 0-8)
const PROFESSIONS = ['Guardian', 'Warrior', 'Engineer', 'Ranger', 'Thief', 'Elementalist', 'Mesmer', 'Necromancer', 'Revenant'];
// Game mode enum (2 bits, 0-2)
const GAME_MODES = ['PvE', 'PvP', 'WvW'];
// Equipment slots (4 bits, 0-15)
const SLOTS = ['Helm', 'Shoulders', 'Coat', 'Gloves', 'Leggings', 'Boots', 'Amulet', 'Ring1', 'Ring2', 'Accessory1', 'Accessory2', 'Backpack', 'MainHand1', 'OffHand1', 'MainHand2', 'OffHand2'];
// Stat combinations (6 bits, 0-63)
const STATS = ['Berserker', 'Assassin', 'Harrier', 'Commander', 'Minstrel', 'Marauder', 'Marshal', 'Viper', 'Sinister', 'Grieving', 'Trailblazer', 'Seraph', 'Celestial', 'Diviner', 'Vigilant', 'Crusader', 'Wanderer', 'Nomad', 'Sentinel', 'Dire', 'Rabid', 'Magi', 'Apothecary', 'Cleric', 'Giver', 'Knight', 'Cavalier', 'Soldier', 'Shaman', 'Settler', 'Zealot', 'Valkyrie', 'Rampager', 'Carrion', 'Sinister', 'Plaguedoctor', 'Ritualist', 'Dragon', 'Spellbreaker', 'Wanderer'];
// Weapon types (5 bits, 0-31)
const WEAPONS = ['Greatsword', 'Hammer', 'Longbow', 'Rifle', 'Short Bow', 'Staff', 'Axe', 'Dagger', 'Mace', 'Pistol', 'Scepter', 'Sword', 'Focus', 'Shield', 'Torch', 'Warhorn', 'Spear', 'Trident', 'Harpoon Gun'];

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
 * Encode build data to a compact binary format
 */
export function encodeBuild(build: BuildData): string {
  try {
    const bytes: number[] = [];

    // Version byte for future compatibility
    bytes.push(5);

    // Profession (3 bits) + GameMode (2 bits) = 1 byte
    const profIdx = PROFESSIONS.indexOf(build.profession);
    const modeIdx = GAME_MODES.indexOf(build.gameMode);
    bytes.push((profIdx << 2) | modeIdx);

    // Equipment count
    bytes.push(build.equipment.length);
    for (const eq of build.equipment) {
      const slotIdx = SLOTS.indexOf(eq.slot);
      bytes.push(slotIdx);

      // Use index for stat (fallback to string for unknown stats)
      const statIdx = STATS.indexOf(eq.stat);
      if (statIdx >= 0) {
        bytes.push(statIdx + 1); // +1 so 0 means "use string"
      } else {
        bytes.push(0);
        writeString(bytes, eq.stat);
      }

      // Use index for weapon type (fallback to string)
      const weaponIdx = eq.weaponType ? WEAPONS.indexOf(eq.weaponType) : -1;
      if (weaponIdx >= 0) {
        bytes.push(weaponIdx + 1);
      } else {
        bytes.push(0);
        writeString(bytes, eq.weaponType || '');
      }

      // Sigils
      writeVarInt(bytes, eq.sigil1Id || 0);
      writeVarInt(bytes, eq.sigil2Id || 0);

      // Infusions - write as item IDs
      for (const infKey of ['infusion1', 'infusion2', 'infusion3'] as const) {
        const infId = eq[infKey] || 0;
        writeVarInt(bytes, infId);
      }
    }

    // Skills - write as array of IDs
    const skillSlots = ['heal', 'utility1', 'utility2', 'utility3', 'elite'] as const;
    for (const slot of skillSlots) {
      writeVarInt(bytes, build.skills[slot] || 0);
    }

    // Traits
    writeVarInt(bytes, build.traits.spec1 || 0);
    const spec1Choices = build.traits.spec1Choices || [null, null, null];
    for (const choice of spec1Choices) {
      writeVarInt(bytes, choice || 0);
    }

    writeVarInt(bytes, build.traits.spec2 || 0);
    const spec2Choices = build.traits.spec2Choices || [null, null, null];
    for (const choice of spec2Choices) {
      writeVarInt(bytes, choice || 0);
    }

    writeVarInt(bytes, build.traits.spec3 || 0);
    const spec3Choices = build.traits.spec3Choices || [null, null, null];
    for (const choice of spec3Choices) {
      writeVarInt(bytes, choice || 0);
    }

    // Rune and Relic
    writeVarInt(bytes, build.runeId || 0);
    writeVarInt(bytes, build.relicId || 0);

    // Profession Mechanics
    console.log('[Encoder] Encoding profession mechanics:', build.professionMechanics);

    // Evoker familiar
    writeVarInt(bytes, build.professionMechanics?.evokerFamiliar || 0);

    // Revenant legends
    writeString(bytes, build.professionMechanics?.revenantLegends?.legend1 || '');
    writeString(bytes, build.professionMechanics?.revenantLegends?.legend2 || '');

    // Amalgam morphs
    writeVarInt(bytes, build.professionMechanics?.amalgamMorphs?.slot2 || 0);
    writeVarInt(bytes, build.professionMechanics?.amalgamMorphs?.slot3 || 0);
    writeVarInt(bytes, build.professionMechanics?.amalgamMorphs?.slot4 || 0);
    console.log('[Encoder] Amalgam morphs:', {
      slot2: build.professionMechanics?.amalgamMorphs?.slot2,
      slot3: build.professionMechanics?.amalgamMorphs?.slot3,
      slot4: build.professionMechanics?.amalgamMorphs?.slot4,
    });

    // Ranger pets
    writeVarInt(bytes, build.professionMechanics?.rangerPets?.pet1 || 0);
    writeVarInt(bytes, build.professionMechanics?.rangerPets?.pet2 || 0);

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
    if (decompressed[0] === 5) {
      // Binary format (version 5) - adds all profession mechanics
      const offset = { value: 1 };

      // Read profession + game mode
      const packed = decompressed[offset.value++];
      const profIdx = (packed >> 2) & 0x07;
      const modeIdx = packed & 0x03;

      const build: BuildData = {
        profession: PROFESSIONS[profIdx] as any,
        gameMode: GAME_MODES[modeIdx] as any,
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
        const stat = statByte > 0 ? STATS[statByte - 1] : readString(decompressed, offset);

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
          slot: SLOTS[slotIdx] as any,
          stat: stat as any,
          ...(weaponType && { weaponType: weaponType as any }),
          ...(sigil1Id && { sigil1Id }),
          ...(sigil2Id && { sigil2Id }),
          ...(infusion1 && { infusion1 }),
          ...(infusion2 && { infusion2 }),
          ...(infusion3 && { infusion3 }),
        } as any);
      }

      // Read skills
      const skillSlots = ['heal', 'utility1', 'utility2', 'utility3', 'elite'] as const;
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
        profession: PROFESSIONS[profIdx] as any,
        gameMode: GAME_MODES[modeIdx] as any,
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
        const stat = statByte > 0 ? STATS[statByte - 1] : readString(decompressed, offset);

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
          slot: SLOTS[slotIdx] as any,
          stat: stat as any,
          ...(weaponType && { weaponType: weaponType as any }),
          ...(sigil1Id && { sigil1Id }),
          ...(sigil2Id && { sigil2Id }),
          ...(infusion1 && { infusion1 }),
          ...(infusion2 && { infusion2 }),
          ...(infusion3 && { infusion3 }),
        } as any);
      }

      // Read skills
      const skillSlots = ['heal', 'utility1', 'utility2', 'utility3', 'elite'] as const;
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
        profession: PROFESSIONS[profIdx] as any,
        gameMode: GAME_MODES[modeIdx] as any,
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
        const stat = statByte > 0 ? STATS[statByte - 1] : readString(decompressed, offset);

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
          slot: SLOTS[slotIdx] as any,
          stat: stat as any,
          ...(weaponType && { weaponType: weaponType as any }),
          ...(sigil1Id && { sigil1Id }),
          ...(sigil2Id && { sigil2Id }),
          ...(infusion1 && { infusion1 }),
          ...(infusion2 && { infusion2 }),
          ...(infusion3 && { infusion3 }),
        } as any);
      }

      // Read skills
      const skillSlots = ['heal', 'utility1', 'utility2', 'utility3', 'elite'] as const;
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
        profession: PROFESSIONS[profIdx] as any,
        gameMode: GAME_MODES[modeIdx] as any,
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

        build.equipment.push({
          slot: SLOTS[slotIdx] as any,
          stat: stat as any,
          ...(weaponType && { weaponType: weaponType as any }),
          ...(upgrade && { upgrade }),
          ...(sigil1Id && { sigil1Id }),
          ...(sigil2Id && { sigil2Id }),
          ...(infusion1 && { infusion1 }),
          ...(infusion2 && { infusion2 }),
          ...(infusion3 && { infusion3 }),
        } as any);
      }

      // Read skills
      const skillSlots = ['heal', 'utility1', 'utility2', 'utility3', 'elite'] as const;
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

      // Check if it's the compact JSON format (version 1)
      if (parsed.p !== undefined) {
        return {
          profession: parsed.p,
          gameMode: parsed.g,
          equipment: parsed.e.map((eq: any) => ({
            slot: eq.s,
            stat: eq.st,
            ...(eq.w && { weaponType: eq.w }),
            ...(eq.u && { upgrade: eq.u }),
            ...(eq.s1 && { sigil1Id: eq.s1 }),
            ...(eq.s2 && { sigil2Id: eq.s2 }),
            ...(eq.i1 && { infusion1: eq.i1 }),
            ...(eq.i2 && { infusion2: eq.i2 }),
            ...(eq.i3 && { infusion3: eq.i3 }),
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
 * Get shareable URL for current build
 */
export function getShareableUrl(build: BuildData): string {
  const url = new URL(window.location.href);
  const encoded = encodeBuild(build);
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
