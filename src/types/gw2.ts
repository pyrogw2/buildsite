// Core profession types
export type Profession =
  | 'Guardian' | 'Warrior' | 'Engineer' | 'Ranger' | 'Thief'
  | 'Elementalist' | 'Mesmer' | 'Necromancer' | 'Revenant';

export type WeightClass = 'Heavy' | 'Medium' | 'Light';

// Game mode types
export type GameMode = 'PvE' | 'PvP' | 'WvW';

// Equipment slot types
export type ArmorSlot = 'Helm' | 'Shoulders' | 'Coat' | 'Gloves' | 'Leggings' | 'Boots';
export type WeaponSlot = 'MainHand1' | 'OffHand1' | 'MainHand2' | 'OffHand2';
export type TrinketSlot = 'Backpack' | 'Accessory1' | 'Accessory2' | 'Amulet' | 'Ring1' | 'Ring2';

// Stat combinations (common ones)
export const STAT_COMBOS = [
  'Berserker', 'Assassin', 'Marauder', 'Viper', 'Sinister',
  'Celestial', 'Diviner', 'Harrier', 'Minstrel', 'Magi',
  'Soldier', 'Cavalier', 'Nomad', 'Trailblazer', 'Seraph',
  'Commander', 'Vigilant', 'Crusader', 'Marshal', 'Grieving',
  'Plaguedoctor', 'Giver', 'Dragon', 'Ritualist', 'Demolisher'
] as const;

export type StatCombo = typeof STAT_COMBOS[number];

// Infusion types
export const INFUSIONS = [
  'Mighty', 'Precise', 'Malign', 'Healing', 'Vital', 'Resilient',
  'Mighty +9 Agony', 'Precise +9 Agony', 'Malign +9 Agony',
  'Healing +9 Agony', 'Vital +9 Agony', 'Resilient +9 Agony'
] as const;

export type InfusionType = typeof INFUSIONS[number];

// API Response Types
export interface GW2Skill {
  id: number;
  name: string;
  description: string;
  icon: string;
  type: string;
  weapon_type?: string;
  professions: string[];
  slot?: string;
  facts?: Array<{
    text?: string;
    type: string;
    value?: number;
    icon?: string;
  }>;
  categories?: string[];
  specialization?: number;
}

export interface GW2Trait {
  id: number;
  tier: number;
  order: number;
  name: string;
  description: string;
  icon: string;
  specialization: number;
  facts?: Array<{
    text?: string;
    type: string;
    value?: number;
    icon?: string;
  }>;
}

export interface GW2Specialization {
  id: number;
  name: string;
  profession: string;
  elite: boolean;
  icon: string;
  background: string;
  minor_traits: number[];
  major_traits: number[];
  weapon_trait?: string;
}

export interface GW2ItemStat {
  id: number;
  name: string;
  attributes: {
    Power?: number;
    Precision?: number;
    Toughness?: number;
    Vitality?: number;
    ConditionDamage?: number;
    ConditionDuration?: number;
    Healing?: number;
    BoonDuration?: number;
    CritDamage?: number;
    Ferocity?: number;
  };
}

// Build data structure
export interface Equipment {
  slot: ArmorSlot | WeaponSlot | TrinketSlot;
  stat: StatCombo;
  upgrade?: string; // Rune or Sigil name
  infusion1?: InfusionType;
  infusion2?: InfusionType;
  infusion3?: InfusionType;
}

export interface SkillSelection {
  heal?: number;
  utility1?: number;
  utility2?: number;
  utility3?: number;
  elite?: number;
}

export interface TraitSelection {
  spec1?: number;
  spec1Choices?: [number | null, number | null, number | null];
  spec2?: number;
  spec2Choices?: [number | null, number | null, number | null];
  spec3?: number;
  spec3Choices?: [number | null, number | null, number | null];
}

export interface BuildData {
  profession: Profession;
  gameMode: GameMode;
  equipment: Equipment[];
  skills: SkillSelection;
  traits: TraitSelection;
  relic?: string;
}
