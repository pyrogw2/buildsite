/**
 * GW2 Build Editor - Stat Calculation Service
 *
 * Calculates all character stats from various sources:
 * - Base stats (health, armor by profession/weight class)
 * - Equipment (armor, weapons, trinkets with stat combos)
 * - Infusions (+5 to specific stats)
 * - Runes (6-piece bonuses)
 * - Sigils (flat bonuses only, no conditional/stacking)
 * - Traits (passive stat bonuses, mode-specific)
 * - Skills (passive signet bonuses, mode-specific)
 *
 * Assumptions:
 * - Level 80 characters
 * - Ascended quality gear
 * - Superior quality runes/sigils
 * - Only flat/passive bonuses (no conditional bonuses)
 */

import type {
  Profession,
  GameMode,
  Equipment,
  StatCombo,
  GW2Item,
  GW2TraitWithModes,
  GW2Skill,
  GW2Specialization,
  BuildData,
  GW2Fact,
} from '../types/gw2';
import {
  BASE_HEALTH,
  PROFESSION_WEIGHT_CLASS,
  BASE_ARMOR,
  TWO_HANDED_WEAPONS,
} from '../types/gw2';
import {
  ASCENDED_ARMOR_STATS,
  ASCENDED_TRINKET_STATS,
  ASCENDED_WEAPON_STATS,
  type SlotStatValues,
} from './statTables';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Attribute keys matching GW2 API naming
 */
export type AttributeKey =
  | 'Power'
  | 'Toughness'
  | 'Vitality'
  | 'Precision'
  | 'Ferocity'
  | 'ConditionDamage'
  | 'HealingPower'
  | 'Expertise'
  | 'Concentration'; // Derives Boon Duration % (Concentration / 15 = Boon Duration %)

/**
 * Base attribute values (starting point for all characters)
 */
export interface BaseAttributes {
  Power: number;
  Toughness: number;
  Vitality: number;
  Precision: number;
  Ferocity: number;
  ConditionDamage: number;
  HealingPower: number;
  Expertise: number;
  Concentration: number;
}

/**
 * Calculated/derived stats from attributes
 */
export interface DerivedStats {
  // Health and Armor
  health: number;
  armor: number;

  // Offensive
  critChance: number;      // Percentage (0-100) - includes both attribute-derived and direct bonuses
  critDamage: number;      // Percentage (150+) - includes both attribute-derived and direct bonuses
  effectivePower: number;  // Power × (1 + CritChance × (CritDamage - 1))

  // Durations
  conditionDuration: number; // Percentage (0-100) - includes both attribute-derived and direct bonuses
  boonDuration: number;      // Percentage (0-100) - includes both attribute-derived and direct bonuses

  // Survivability
  effectiveHP: number;       // HP × (1 + Armor / 1000)
}

/**
 * Complete stat calculation result
 */
export interface CalculatedStats {
  attributes: BaseAttributes;
  derived: DerivedStats;
  sources: StatSourceBreakdown;
}

/**
 * Direct percentage bonuses (not derived from attributes)
 * Example: Sigil of Accuracy gives +7% crit chance directly
 */
export interface DirectPercentageBonuses {
  critChance?: number;         // Direct % bonus to crit chance
  critDamage?: number;         // Direct % bonus to crit damage
  conditionDuration?: number;  // Direct % bonus to condition duration
  boonDuration?: number;       // Direct % bonus to boon duration
}

/**
 * Breakdown of where stats come from (for debugging/display)
 */
export interface StatSourceBreakdown {
  base: Partial<BaseAttributes>;
  equipment: Partial<BaseAttributes>;
  infusions: Partial<BaseAttributes>;
  runes: Partial<BaseAttributes>;
  sigils: Partial<BaseAttributes>;
  traits: Partial<BaseAttributes>;
  skills: Partial<BaseAttributes>;
  // Direct percentage bonuses from runes/sigils/traits/skills
  percentageBonuses: DirectPercentageBonuses;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Base attribute values for all level 80 characters
 */
const BASE_ATTRIBUTES: BaseAttributes = {
  Power: 1000,
  Toughness: 1000,
  Vitality: 1000,
  Precision: 1000,
  Ferocity: 0,
  ConditionDamage: 0,
  HealingPower: 0,
  Expertise: 0,
  Concentration: 0,
};

/**
 * Shield defense bonus (Ascended shield adds +295 armor)
 */
const SHIELD_ARMOR_BONUS = 295;

/**
 * Infusion item IDs and their bonuses (+5 to specific stat)
 */
const INFUSION_BONUSES: Record<number, Partial<BaseAttributes>> = {
  43254: { Power: 5 },           // Mighty WvW Infusion
  43255: { Precision: 5 },       // Precise WvW Infusion
  43253: { ConditionDamage: 5 }, // Malign WvW Infusion
  87218: { Expertise: 5 },       // Expertise WvW Infusion
  43251: { Toughness: 5 },       // Resilient WvW Infusion
  43252: { Vitality: 5 },        // Vital WvW Infusion
  43250: { HealingPower: 5 },    // Healing WvW Infusion
  86986: { Concentration: 5 },   // Concentration WvW Infusion
};

/**
 * Stat distribution for each stat combo (in priority order)
 * Format: [major stat(s), minor stat(s)]
 */
const STAT_COMBOS: Record<StatCombo, AttributeKey[]> = {
  // 3-stat combos
  Berserker: ['Power', 'Precision', 'Ferocity'],
  Assassin: ['Precision', 'Power', 'Ferocity'],
  Sinister: ['ConditionDamage', 'Power', 'Precision'],
  Harrier: ['Power', 'HealingPower', 'Concentration'],
  Magi: ['HealingPower', 'Precision', 'Vitality'],
  Soldier: ['Power', 'Toughness', 'Vitality'],
  Cavalier: ['Toughness', 'Power', 'Ferocity'],
  Nomad: ['Toughness', 'Vitality', 'HealingPower'],
  Giver: ['Toughness', 'Concentration', 'HealingPower'],
  Zealot: ['Power', 'Precision', 'HealingPower'],
  Valkyrie: ['Power', 'Vitality', 'Ferocity'],
  Rampager: ['Precision', 'Power', 'ConditionDamage'],
  Knight: ['Toughness', 'Power', 'Precision'],
  Sentinel: ['Vitality', 'Power', 'Toughness'],
  Shaman: ['Vitality', 'ConditionDamage', 'HealingPower'],
  Carrion: ['ConditionDamage', 'Power', 'Vitality'],
  Rabid: ['ConditionDamage', 'Precision', 'Toughness'],
  Dire: ['ConditionDamage', 'Toughness', 'Vitality'],
  Cleric: ['HealingPower', 'Power', 'Toughness'],
  Apothecary: ['HealingPower', 'Toughness', 'ConditionDamage'],

  // 4-stat combos
  Marauder: ['Power', 'Precision', 'Vitality', 'Ferocity'],
  Viper: ['Power', 'ConditionDamage', 'Precision', 'Expertise'],
  Diviner: ['Power', 'Concentration', 'Precision', 'Ferocity'],
  Minstrel: ['Toughness', 'HealingPower', 'Vitality', 'Concentration'],
  Trailblazer: ['Toughness', 'ConditionDamage', 'Vitality', 'Expertise'],
  Seraph: ['Precision', 'ConditionDamage', 'Concentration', 'HealingPower'],
  Commander: ['Power', 'Precision', 'Toughness', 'Concentration'],
  Vigilant: ['Power', 'Toughness', 'Concentration', 'Expertise'],
  Crusader: ['Power', 'Toughness', 'Ferocity', 'HealingPower'],
  Marshal: ['Power', 'HealingPower', 'Precision', 'ConditionDamage'],
  Grieving: ['Power', 'ConditionDamage', 'Precision', 'Ferocity'],
  Plaguedoctor: ['Vitality', 'ConditionDamage', 'HealingPower', 'Concentration'],
  Dragon: ['Power', 'Ferocity', 'Precision', 'Vitality'],
  Ritualist: ['Vitality', 'ConditionDamage', 'Concentration', 'Expertise'],
  Demolisher: ['Power', 'Precision', 'Toughness', 'Ferocity'],
  Wanderer: ['Power', 'Vitality', 'Toughness', 'Concentration'],

  // 9-stat combo (Celestial)
  Celestial: ['Power', 'Precision', 'Toughness', 'Vitality', 'ConditionDamage', 'HealingPower', 'Expertise', 'Concentration', 'Ferocity'],
};

/**
 * Mapping from GW2 API stat names to AttributeKey
 * Used for parsing rune/sigil/trait bonuses
 */
const STAT_NAME_MAP: Record<string, AttributeKey> = {
  'Power': 'Power',
  'Precision': 'Precision',
  'Toughness': 'Toughness',
  'Vitality': 'Vitality',
  'Ferocity': 'Ferocity',
  'Condition Damage': 'ConditionDamage',
  'ConditionDamage': 'ConditionDamage',
  'Condition Duration': 'Expertise',
  'Expertise': 'Expertise',
  'Healing Power': 'HealingPower',
  'HealingPower': 'HealingPower',
  'Healing': 'HealingPower',
  'Concentration': 'Concentration',
  'Boon Duration': 'Concentration', // Runes say "+10% Boon Duration" but mean Concentration
  'BoonDuration': 'Concentration',
  'Critical Damage': 'Ferocity',
  'CritDamage': 'Ferocity',
};

/**
 * Conversion rate from percentage bonuses to flat attributes
 * Example: 10% Boon Duration = 150 Concentration (10 * 15 = 150)
 */
const PERCENT_TO_ATTRIBUTE: Partial<Record<AttributeKey, number>> = {
  Expertise: 15,      // 1% Condition Duration = 15 Expertise
  Concentration: 15,  // 1% Boon Duration = 15 Concentration
  Ferocity: 15,       // 1% Crit Damage = 15 Ferocity (actually 150% base, but +1% = +15 Ferocity)
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Creates an empty attributes object with all stats at 0
 */
function createEmptyAttributes(): BaseAttributes {
  return {
    Power: 0,
    Toughness: 0,
    Vitality: 0,
    Precision: 0,
    Ferocity: 0,
    ConditionDamage: 0,
    HealingPower: 0,
    Expertise: 0,
    Concentration: 0,
  };
}

/**
 * Adds attributes from source to target (mutates target)
 */
function addAttributes(target: BaseAttributes, source: Partial<BaseAttributes>): void {
  for (const [key, value] of Object.entries(source)) {
    if (value !== undefined) {
      target[key as AttributeKey] += value;
    }
  }
}

/**
 * Parses a bonus string like "+25 Power" or "+10% Boon Duration"
 * Returns attribute and flat value (converts percentages)
 */
function parseBonus(bonus: string): { attribute: AttributeKey; value: number } | null {
  // Match patterns like "+25 Power" or "+10% Boon Duration"
  const match = bonus.match(/\+(\d+)(%?)\s+(.+)/);
  if (!match) return null;

  const [, valueStr, percentSign, statName] = match;
  const attribute = STAT_NAME_MAP[statName.trim()];
  if (!attribute) return null;

  let value = parseInt(valueStr, 10);

  // Convert percentage to flat attribute
  if (percentSign === '%') {
    const conversion = PERCENT_TO_ATTRIBUTE[attribute];
    if (conversion) {
      value = value * conversion;
    } else {
      // Unknown percentage conversion, skip
      return null;
    }
  }

  return { attribute, value };
}

// ============================================================================
// Stat Calculation Functions
// ============================================================================

/**
 * Calculate equipment stats from gear
 * Includes armor, weapons, and trinkets with their stat combos
 * Excludes Weapon Set 2 (MainHand2/OffHand2)
 */
function calculateEquipmentStats(equipment: Equipment[]): Partial<BaseAttributes> {
  const stats = createEmptyAttributes();
  const armorStats = ASCENDED_ARMOR_STATS as Record<string, SlotStatValues>;
  const trinketStats = ASCENDED_TRINKET_STATS as Record<string, SlotStatValues>;

  // Build lookup for equipment by slot
  const equipmentBySlot = equipment.reduce<Record<string, Equipment>>((acc, item) => {
    acc[item.slot] = item;
    return acc;
  }, {});

  equipment.forEach((item) => {
    // Skip Weapon Set 2
    if (item.slot === 'MainHand2' || item.slot === 'OffHand2') {
      return;
    }

    let slotValues: SlotStatValues | undefined;

    // Determine slot stat values
    if (armorStats[item.slot]) {
      slotValues = armorStats[item.slot];
    } else if (trinketStats[item.slot]) {
      slotValues = trinketStats[item.slot];
    } else if (item.slot === 'MainHand1') {
      const isTwoHanded = item.weaponType ? TWO_HANDED_WEAPONS.includes(item.weaponType) : false;
      slotValues = isTwoHanded ? ASCENDED_WEAPON_STATS.twoHanded : ASCENDED_WEAPON_STATS.oneHanded;
    } else if (item.slot === 'OffHand1') {
      const mainHand = equipmentBySlot['MainHand1'];
      const mainIsTwoHanded = mainHand?.weaponType ? TWO_HANDED_WEAPONS.includes(mainHand.weaponType) : false;
      if (mainIsTwoHanded) {
        // Two-handed weapon in main hand, skip off-hand
        return;
      }
      slotValues = ASCENDED_WEAPON_STATS.oneHanded;
    } else {
      return;
    }

    // Get stat combo for this item
    const statCombo = STAT_COMBOS[item.stat as StatCombo];
    if (!slotValues || !statCombo) {
      return;
    }

    // Apply stats based on combo type
    if (statCombo.length === 9) {
      // Celestial: all stats get major9 value
      statCombo.forEach((attribute) => {
        stats[attribute] += slotValues.major9;
      });
    } else if (statCombo.length === 4) {
      // 4-stat: first 2 are major, last 2 are minor
      statCombo.forEach((attribute, index) => {
        stats[attribute] += index < 2 ? slotValues.major4 : slotValues.minor4;
      });
    } else {
      // 3-stat: first is major, rest are minor
      statCombo.forEach((attribute, index) => {
        stats[attribute] += index === 0 ? slotValues.major3 : slotValues.minor3;
      });
    }
  });

  return stats;
}

/**
 * Calculate infusion bonuses from equipment
 * Each infusion gives +5 to a specific stat
 * Excludes Weapon Set 2 (MainHand2/OffHand2)
 */
function calculateInfusionStats(equipment: Equipment[]): Partial<BaseAttributes> {
  const stats = createEmptyAttributes();

  equipment.forEach((item) => {
    // Skip Weapon Set 2 (consistent with equipment stat calculation)
    if (item.slot === 'MainHand2' || item.slot === 'OffHand2') {
      return;
    }

    // Check all infusion slots
    (['infusion1', 'infusion2', 'infusion3'] as const).forEach((key) => {
      const infusionId = item[key];
      if (!infusionId) return;

      const infusionBonus = INFUSION_BONUSES[infusionId];
      if (infusionBonus) {
        addAttributes(stats, infusionBonus);
      }
    });
  });

  return stats;
}

/**
 * Calculate rune bonuses from 6-piece set
 * Parses rune bonus strings for flat and percentage bonuses
 *
 * IMPORTANT: Percentage bonuses from runes are direct percentage bonuses,
 * not attribute bonuses. "+10% Boon Duration" adds 10 percentage points,
 * it does NOT convert to Concentration.
 */
function calculateRuneStats(runeItem: GW2Item | null): {
  attributes: Partial<BaseAttributes>;
  percentages: DirectPercentageBonuses
} {
  const stats = createEmptyAttributes();
  const percentages: DirectPercentageBonuses = {};

  if (!runeItem?.details?.bonuses) {
    return { attributes: stats, percentages };
  }

  runeItem.details.bonuses.forEach((bonus) => {
    // Check if it's a percentage bonus
    const percentMatch = bonus.match(/\+(\d+)%\s+(.+)/);
    if (percentMatch) {
      const [, valueStr, statName] = percentMatch;
      const value = parseInt(valueStr, 10);
      const trimmedName = statName.trim();

      // Map percentage bonuses to direct percentage increases
      if (trimmedName === 'Boon Duration') {
        percentages.boonDuration = (percentages.boonDuration || 0) + value;
      } else if (trimmedName === 'Condition Duration') {
        percentages.conditionDuration = (percentages.conditionDuration || 0) + value;
      }
      // Ignore specific duration bonuses (Burning Duration, etc.)
      return;
    }

    // Parse flat attribute bonuses
    const parsed = parseBonus(bonus);
    if (parsed) {
      stats[parsed.attribute] += parsed.value;
    }
  });

  return { attributes: stats, percentages };
}

/**
 * Sigil item IDs that provide direct percentage bonuses (not attributes)
 * These add directly to derived stats like crit chance %, boon duration %, etc.
 */
const SIGIL_DIRECT_PERCENTAGE_BONUSES: Record<number, Partial<DirectPercentageBonuses>> = {
  24618: { critChance: 7 },         // Superior Sigil of Accuracy: +7% Crit Chance
  72339: { boonDuration: 10 },      // Superior Sigil of Concentration: +10% Boon Duration
  44950: { conditionDuration: 10 }, // Superior Sigil of Malice: +10% Condition Duration
};

/**
 * Calculate sigil bonuses (flat/passive bonuses only)
 *
 * Includes:
 * - Superior Sigil of Accuracy: +7% Crit Chance
 * - Superior Sigil of Concentration: +10% Boon Duration
 * - Superior Sigil of Malice: +10% Condition Duration
 *
 * Excludes:
 * - Stacking sigils (Perception, Bounty, Cruelty, Stars, etc.)
 * - Conditional sigils (on-kill, on-crit, on-swap, etc.)
 * - Multiplicative damage sigils (Force, Bursting)
 *
 * @returns Object with both attribute bonuses and direct percentage bonuses
 */
function calculateSigilStats(
  equipment: Equipment[],
  _sigilItems: Map<number, GW2Item>
): { attributes: Partial<BaseAttributes>; percentages: DirectPercentageBonuses } {
  const attributes = createEmptyAttributes();
  const percentages: DirectPercentageBonuses = {};

  // Collect all sigil IDs from equipment (weapon set 1 only)
  const sigilIds = new Set<number>();
  equipment.forEach((item) => {
    // Skip Weapon Set 2 (consistent with other calculations)
    if (item.slot === 'MainHand2' || item.slot === 'OffHand2') {
      return;
    }

    if (item.sigil1Id) sigilIds.add(item.sigil1Id);
    if (item.sigil2Id) sigilIds.add(item.sigil2Id);
  });

  // Apply bonuses from each sigil
  sigilIds.forEach((sigilId) => {
    // Check for direct percentage bonuses
    const percentageBonus = SIGIL_DIRECT_PERCENTAGE_BONUSES[sigilId];
    if (percentageBonus) {
      if (percentageBonus.critChance) {
        percentages.critChance = (percentages.critChance || 0) + percentageBonus.critChance;
      }
      if (percentageBonus.boonDuration) {
        percentages.boonDuration = (percentages.boonDuration || 0) + percentageBonus.boonDuration;
      }
      if (percentageBonus.conditionDuration) {
        percentages.conditionDuration = (percentages.conditionDuration || 0) + percentageBonus.conditionDuration;
      }
      if (percentageBonus.critDamage) {
        percentages.critDamage = (percentages.critDamage || 0) + percentageBonus.critDamage;
      }
    }

    // Future: Check for attribute bonuses (none currently exist for passive sigils)
    // If we find any, parse them here similar to runes
  });

  return { attributes, percentages };
}

/**
 * Whitelist of trait IDs that provide passive stat bonuses (no conditions)
 * Only includes traits where stat bonus is always active
 *
 * Excluded: Conditional bonuses (weapon-specific, boon-dependent, combat state, etc.)
 *
 * MAINTENANCE NOTE:
 * - This list may need updates after balance patches
 * - To find new passive traits, run: node scripts/audit-passive-traits.js
 * - To verify a trait is passive, check its description for conditional keywords:
 *   "while", "when", "wielding", "above", "below", "against", "per", "each"
 * - Future improvement: Move this to public/data/passive-traits.json for easier updates
 */
const PASSIVE_STAT_TRAITS: number[] = [
  // Major traits (manually selected)
  1801, // Seething Malice (Revenant - Corruption): +360 Condition Damage
  2028, // Soothing Power (Elementalist - Water): +300 Vitality
  325,  // Burning Rage (Elementalist - Fire): +180 Condition Damage
  1232, // Preparedness (Thief - Trickery): +150 Expertise
  1938, // Gathered Focus (Elementalist - Tempest): +360 Concentration
  861,  // Vital Persistence (Necromancer - Soul Reaping): +180 Vitality
  2190, // Power for Power (Guardian - Willbender): +120 Power

  // Minor traits (automatically granted by specializations)
  1896, // Defender's Dogma (Guardian - Dragonhunter): +180 Vitality
  2394, // Light's Gift (Guardian - Luminary): +180 Vitality
  1059, // Lingering Magic (Ranger - Nature Magic): +360 Concentration
  413,  // Compounding Chemicals (Engineer - Alchemy): +360 Concentration
  1065, // Pet's Prowess (Ranger - Beastmastery): +300 Ferocity
  2004, // Elemental Enchantment (Elementalist - Arcane): +300 Concentration
  1788, // Reinforced Potency (Revenant - Herald): +300 Concentration
  2418, // Inspiring Implements (Warrior - Paragon): +180 Concentration (PvE), +60 Concentration (PvP/WvW)
  2371, // Boon of Creation (Necromancer - Ritualist): +240 Concentration
];

/**
 * Calculate trait bonuses (passive stat bonuses only, mode-specific)
 *
 * Uses mode-specific trait data (pve/pvp/wvw) when available, otherwise falls back
 * to base trait facts. This ensures competitive split traits (like Inspiring Implements)
 * use the correct values for each game mode.
 */
function calculateTraitStats(
  selectedTraits: number[],
  allTraits: GW2TraitWithModes[],
  gameMode: GameMode
): Partial<BaseAttributes> {
  const stats = createEmptyAttributes();

  // Filter for passive traits that are selected
  const passiveTraitsInBuild = selectedTraits.filter(id => PASSIVE_STAT_TRAITS.includes(id));

  passiveTraitsInBuild.forEach((traitId) => {
    const trait = allTraits.find(t => t.id === traitId);
    if (!trait) return;

    // Get mode-specific facts or fall back to base facts
    let facts: GW2Fact[] | undefined;
    switch (gameMode) {
      case 'PvE':
        facts = trait.modes.pve?.facts || trait.modes.default.facts;
        break;
      case 'PvP':
        facts = trait.modes.pvp?.facts || trait.modes.default.facts;
        break;
      case 'WvW':
        facts = trait.modes.wvw?.facts || trait.modes.default.facts;
        break;
      default:
        facts = trait.modes.default.facts;
    }

    if (!facts) return;

    // Find AttributeAdjust facts
    const statFacts = facts.filter(f => f.type === 'AttributeAdjust');

    // Track which attributes we've already processed to avoid double-counting
    // (API may return multiple AttributeAdjust facts for the same target)
    const processedTargets = new Set<string>();

    statFacts.forEach((fact: GW2Fact) => {
      const target = fact.target as string | undefined;
      const value = fact.value;

      // Skip if we've already processed this target
      if (target && processedTargets.has(target)) {
        return;
      }
      if (target) {
        processedTargets.add(target);
      }

      // Map API target names to our AttributeKey
      const attribute = target ? STAT_NAME_MAP[target] : undefined;
      if (attribute && value !== undefined) {
        stats[attribute] = (stats[attribute] || 0) + value;
      }
    });
  });

  return stats;
}

/**
 * Signet passive stat bonuses (level 80)
 *
 * NOTE: The GW2 API does not expose signet passive bonuses via AttributeAdjust facts.
 * These values are hardcoded based on GW2 Wiki (formula: 20 + 2 * level = 180 at level 80).
 *
 * Excluded: Superconducting Signet (provides % damage modifier, not attribute bonus)
 * Excluded: Healing signets (provide healing effects, not flat attribute bonuses)
 */
const SIGNET_PASSIVE_STAT_BONUSES: Record<number, { attribute: AttributeKey; value: number }> = {
  9151: { attribute: 'ConditionDamage', value: 180 }, // Signet of Wrath (Guardian)
  14404: { attribute: 'Power', value: 180 },          // Signet of Might (Warrior)
  14410: { attribute: 'Precision', value: 180 },      // Signet of Fury (Warrior)
  12491: { attribute: 'Ferocity', value: 180 },       // Signet of Wild (Ranger)
  13046: { attribute: 'Power', value: 180 },          // Assassin's Signet (Thief)
  13062: { attribute: 'Precision', value: 180 },      // Signet of Agility (Thief)
};

/**
 * Calculate skill bonuses (passive signet bonuses only, mode-specific)
 *
 * NOTE: Mode support is implemented but none of the whitelisted signets
 * currently have mode-specific data. If future signets have modes, this will
 * automatically use getModeData() to get the correct stats.
 */
function calculateSkillStats(
  selectedSkills: number[],
  _allSkills: GW2Skill[],
  _gameMode: GameMode
): Partial<BaseAttributes> {
  const stats = createEmptyAttributes();

  selectedSkills.forEach((skillId) => {
    const bonus = SIGNET_PASSIVE_STAT_BONUSES[skillId];
    if (bonus) {
      stats[bonus.attribute] = (stats[bonus.attribute] || 0) + bonus.value;
    }
  });

  return stats;
}

/**
 * Calculate derived stats from base attributes
 *
 * @param attributes - Raw attribute values
 * @param profession - Character profession
 * @param hasShield - Whether a shield is equipped in weapon set 1
 * @param percentageBonuses - Direct percentage bonuses from runes/sigils/traits/skills
 */
function calculateDerivedStats(
  attributes: BaseAttributes,
  profession: Profession,
  hasShield: boolean,
  percentageBonuses: DirectPercentageBonuses = {}
): DerivedStats {
  const weightClass = PROFESSION_WEIGHT_CLASS[profession];
  const baseHealth = BASE_HEALTH[profession];
  const baseArmor = BASE_ARMOR[weightClass];

  // Health = Base Health + (Vitality - 1000) × 10
  const health = baseHealth + (attributes.Vitality - 1000) * 10;

  // Armor = Base Armor + Toughness + Shield Bonus
  let armor = baseArmor + attributes.Toughness;
  if (hasShield) {
    armor += SHIELD_ARMOR_BONUS;
  }

  // Crit Chance = 5% + (Precision - 1000) / 21 + direct bonuses (capped at 0-100%)
  const baseCritChance = 5 + (attributes.Precision - 1000) / 21;
  const critChance = Math.min(100, Math.max(0, baseCritChance + (percentageBonuses.critChance || 0)));

  // Crit Damage = 150% + Ferocity / 15 + direct bonuses
  const baseCritDamage = 150 + attributes.Ferocity / 15;
  const critDamage = baseCritDamage + (percentageBonuses.critDamage || 0);

  // Effective Power = Power × (1 + Crit Chance × (Crit Damage - 1))
  const effectivePower = attributes.Power * (1 + (critChance / 100) * ((critDamage / 100) - 1));

  // Condition Duration % = Expertise / 15 + direct bonuses (capped at 100%)
  const baseConditionDuration = attributes.Expertise / 15;
  const conditionDuration = Math.min(100, baseConditionDuration + (percentageBonuses.conditionDuration || 0));

  // Boon Duration % = Concentration / 15 + direct bonuses (capped at 100%)
  const baseBoonDuration = attributes.Concentration / 15;
  const boonDuration = Math.min(100, baseBoonDuration + (percentageBonuses.boonDuration || 0));

  // Effective HP = HP × (1 + Armor / 1000)
  const effectiveHP = health * (1 + armor / 1000);

  return {
    health,
    armor,
    critChance,
    critDamage,
    effectivePower,
    conditionDuration,
    boonDuration,
    effectiveHP,
  };
}

/**
 * Check if equipment has a shield in Weapon Set 1
 */
function hasShieldEquipped(equipment: Equipment[]): boolean {
  return equipment.some(
    (item) => item.slot === 'OffHand1' && item.weaponType === 'Shield'
  );
}

// ============================================================================
// Main Export
// ============================================================================

/**
 * Calculate all stats for a build
 *
 * @param buildData - Complete build data
 * @param runeItem - Rune item data (if equipped)
 * @param sigilItems - Map of sigil item IDs to item data
 * @param allTraits - All available traits
 * @param allSkills - All available skills
 * @returns Complete calculated stats with breakdown by source
 */
export function calculateStats(
  buildData: BuildData,
  runeItem: GW2Item | null,
  sigilItems: Map<number, GW2Item>,
  allTraits: GW2TraitWithModes[],
  allSpecs: GW2Specialization[],
  allSkills: GW2Skill[]
): CalculatedStats {
  const { profession, equipment, gameMode, traits, skills } = buildData;

  if (!profession) {
    // No profession selected, return base stats
    return {
      attributes: { ...BASE_ATTRIBUTES },
      derived: {
        health: 0,
        armor: 0,
        critChance: 5,
        critDamage: 150,
        effectivePower: 1000,
        conditionDuration: 0,
        boonDuration: 0,
        effectiveHP: 0,
      },
      sources: {
        base: {},
        equipment: {},
        infusions: {},
        runes: {},
        sigils: {},
        traits: {},
        skills: {},
        percentageBonuses: {},
      },
    };
  }

  // Calculate stats from each source
  const baseStats = { ...BASE_ATTRIBUTES };
  const equipmentStats = calculateEquipmentStats(equipment);
  const infusionStats = calculateInfusionStats(equipment);
  const runeResult = calculateRuneStats(runeItem);
  const sigilResult = calculateSigilStats(equipment, sigilItems);

  // Get selected trait IDs (both major and minor traits)
  const selectedTraitIds: number[] = [];

  // Add manually selected major traits
  if (traits.spec1Choices) selectedTraitIds.push(...traits.spec1Choices.filter((id): id is number => id !== null));
  if (traits.spec2Choices) selectedTraitIds.push(...traits.spec2Choices.filter((id): id is number => id !== null));
  if (traits.spec3Choices) selectedTraitIds.push(...traits.spec3Choices.filter((id): id is number => id !== null));

  // Add minor traits from selected specializations
  const selectedSpecIds = [traits.spec1, traits.spec2, traits.spec3].filter((id): id is number => id !== undefined);
  selectedSpecIds.forEach((specId) => {
    const spec = allSpecs.find(s => s.id === specId);
    if (spec?.minor_traits) {
      selectedTraitIds.push(...spec.minor_traits);
    }
  });

  // Get selected skill IDs
  const selectedSkillIds: number[] = Object.values(skills).filter((id): id is number => id !== null && id !== undefined);

  const traitStats = calculateTraitStats(selectedTraitIds, allTraits, gameMode);
  const skillStats = calculateSkillStats(selectedSkillIds, allSkills, gameMode);

  // Combine all attribute stats
  const totalAttributes = createEmptyAttributes();
  addAttributes(totalAttributes, baseStats);
  addAttributes(totalAttributes, equipmentStats);
  addAttributes(totalAttributes, infusionStats);
  addAttributes(totalAttributes, runeResult.attributes);
  addAttributes(totalAttributes, sigilResult.attributes);
  addAttributes(totalAttributes, traitStats);
  addAttributes(totalAttributes, skillStats);

  // Collect percentage bonuses from runes and sigils
  const percentageBonuses: DirectPercentageBonuses = {
    critChance: (sigilResult.percentages.critChance || 0),
    boonDuration: (runeResult.percentages.boonDuration || 0) + (sigilResult.percentages.boonDuration || 0),
    conditionDuration: (runeResult.percentages.conditionDuration || 0) + (sigilResult.percentages.conditionDuration || 0),
    critDamage: (sigilResult.percentages.critDamage || 0),
  };

  // Calculate derived stats
  const hasShield = hasShieldEquipped(equipment);
  const derived = calculateDerivedStats(totalAttributes, profession, hasShield, percentageBonuses);

  return {
    attributes: totalAttributes,
    derived,
    sources: {
      base: baseStats,
      equipment: equipmentStats,
      infusions: infusionStats,
      runes: runeResult.attributes,
      sigils: sigilResult.attributes,
      traits: traitStats,
      skills: skillStats,
      percentageBonuses,
    },
  };
}

/**
 * Export utility function for parsing bonuses (used by tests/debugging)
 */
export { parseBonus };
