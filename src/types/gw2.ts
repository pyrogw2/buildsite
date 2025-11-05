// Core profession types
export type Profession =
  | 'Guardian' | 'Warrior' | 'Engineer' | 'Ranger' | 'Thief'
  | 'Elementalist' | 'Mesmer' | 'Necromancer' | 'Revenant';

export type WeightClass = 'Heavy' | 'Medium' | 'Light';

// Base health pools at level 80
export const BASE_HEALTH: Record<Profession, number> = {
  Warrior: 19212,
  Necromancer: 19212,
  Revenant: 15922,
  Engineer: 15922,
  Ranger: 15922,
  Mesmer: 15922,
  Guardian: 11645,
  Thief: 11645,
  Elementalist: 11645,
};

// Weight class by profession
export const PROFESSION_WEIGHT_CLASS: Record<Profession, WeightClass> = {
  Guardian: 'Heavy',
  Warrior: 'Heavy',
  Revenant: 'Heavy',
  Engineer: 'Medium',
  Ranger: 'Medium',
  Thief: 'Medium',
  Elementalist: 'Light',
  Mesmer: 'Light',
  Necromancer: 'Light',
};

// Base armor by weight class (Ascended tier)
export const BASE_ARMOR: Record<WeightClass, number> = {
  Light: 967,
  Medium: 1118,
  Heavy: 1271,
};

// Game mode types
export type GameMode = 'PvE' | 'PvP' | 'WvW';

export type ModeKey = 'default' | 'pve' | 'pvp' | 'wvw';

export interface ModeBundle<T> {
  default: T;
  pve?: T;
  pvp?: T;
  wvw?: T;
}

// Equipment slot types
export type ArmorSlot = 'Helm' | 'Shoulders' | 'Coat' | 'Gloves' | 'Leggings' | 'Boots';
export type WeaponSlot = 'MainHand1' | 'OffHand1' | 'MainHand2' | 'OffHand2';
export type TrinketSlot = 'Backpack' | 'Accessory1' | 'Accessory2' | 'Amulet' | 'Ring1' | 'Ring2';

// Weapon types
export const WEAPON_TYPES = [
  'Axe', 'Dagger', 'Mace', 'Pistol', 'Sword', 'Scepter', // One-handed main hand
  'Focus', 'Shield', 'Torch', 'Warhorn', // Off-hand only
  'Greatsword', 'Hammer', 'Longbow', 'Rifle', 'Short Bow', 'Staff', 'Spear', // Two-handed
  'Harpoon Gun', 'Trident', // Aquatic
] as const;

export type WeaponType = typeof WEAPON_TYPES[number];

// Profession weapon availability (land weapons only for now)
// Data sourced from GW2 API /v2/professions endpoint
export const PROFESSION_WEAPONS: Record<Profession, WeaponType[]> = {
  Guardian: ['Greatsword', 'Hammer', 'Longbow', 'Staff', 'Sword', 'Mace', 'Scepter', 'Axe', 'Pistol', 'Focus', 'Shield', 'Torch', 'Spear'],
  Warrior: ['Greatsword', 'Hammer', 'Longbow', 'Rifle', 'Staff', 'Sword', 'Axe', 'Mace', 'Dagger', 'Pistol', 'Shield', 'Torch', 'Warhorn', 'Spear'],
  Engineer: ['Hammer', 'Rifle', 'Short Bow', 'Sword', 'Mace', 'Pistol', 'Shield', 'Spear'],
  Ranger: ['Greatsword', 'Hammer', 'Longbow', 'Short Bow', 'Staff', 'Sword', 'Axe', 'Mace', 'Dagger', 'Torch', 'Warhorn', 'Spear'],
  Thief: ['Rifle', 'Short Bow', 'Staff', 'Sword', 'Axe', 'Dagger', 'Scepter', 'Pistol', 'Spear'],
  Elementalist: ['Hammer', 'Staff', 'Sword', 'Dagger', 'Scepter', 'Pistol', 'Focus', 'Warhorn', 'Spear'],
  Mesmer: ['Greatsword', 'Rifle', 'Staff', 'Sword', 'Axe', 'Dagger', 'Scepter', 'Pistol', 'Focus', 'Shield', 'Torch', 'Spear'],
  Necromancer: ['Greatsword', 'Staff', 'Sword', 'Axe', 'Dagger', 'Scepter', 'Pistol', 'Focus', 'Torch', 'Warhorn', 'Spear'],
  Revenant: ['Greatsword', 'Hammer', 'Short Bow', 'Staff', 'Sword', 'Axe', 'Mace', 'Scepter', 'Shield', 'Spear'],
};

// Which weapons can go in off-hand
export const OFF_HAND_WEAPONS: WeaponType[] = ['Axe', 'Dagger', 'Mace', 'Pistol', 'Sword', 'Focus', 'Shield', 'Torch', 'Warhorn'];

// Two-handed weapons (can't use off-hand)
export const TWO_HANDED_WEAPONS: WeaponType[] = ['Greatsword', 'Hammer', 'Longbow', 'Rifle', 'Short Bow', 'Staff', 'Spear', 'Harpoon Gun', 'Trident'];

// Stat combinations (common ones)
export const STAT_COMBOS = [
  'Berserker', 'Assassin', 'Marauder', 'Viper', 'Sinister',
  'Celestial', 'Diviner', 'Harrier', 'Minstrel', 'Magi',
  'Soldier', 'Cavalier', 'Nomad', 'Trailblazer', 'Seraph',
  'Commander', 'Vigilant', 'Crusader', 'Marshal', 'Grieving',
  'Plaguedoctor', 'Giver', 'Dragon', 'Ritualist', 'Demolisher',
  'Zealot', 'Valkyrie', 'Rampager', 'Knight', 'Sentinel',
  'Shaman', 'Carrion', 'Rabid', 'Dire', 'Cleric', 'Apothecary',
  'Wanderer'
] as const;

export type StatCombo = typeof STAT_COMBOS[number];

// Infusion types (+5 to stat)
export const INFUSIONS = [
  'Mighty', 'Precise', 'Malign', 'Expertise', 'Resilient', 'Vital', 'Healing', 'Concentration'
] as const;

export type InfusionType = typeof INFUSIONS[number];

// All Superior Rune item IDs (complete list - 99 unique runes)
export const RUNE_IDS = [
  89999, // Fireworks
  76813, // Surging
  24702, // Pack
  24741, // Citadel
  24714, // Strength
  24782, // Privateer
  24729, // Hoelbrak
  24747, // Fire
  24788, // Centaur
  36044, // Mad King
  24797, // Flame Legion
  24854, // Baelfire
  24800, // Elementalist
  24836, // Scholar
  82791, // Deadeye
  24756, // Ogre
  24703, // Infiltration
  84749, // Spellbreaker
  24803, // Mesmer
  73399, // Chronomancer
  70829, // Reaper
  72852, // Daredevil
  71276, // Scrapper
  24833, // Brawler
  83367, // Cavalier
  24711, // Vampirism
  82633, // Holosmith
  24776, // Lyssa
  24726, // Rata Sum
  24818, // Thief
  24723, // Eagle
  24815, // Ranger
  76100, // Herald
  73653, // Durability
  24744, // Earth
  24794, // Svanir
  24851, // Forgeman
  24812, // Engineer
  24771, // Melandru
  24699, // Dolyak
  24708, // Mercy
  67912, // Defender
  24824, // Guardian
  49460, // Resistance
  68437, // Snowfall
  24857, // Sanctuary
  67342, // Radiance
  24720, // Speed
  24688, // Lich
  24753, // Ice
  24791, // Wurm
  24821, // Warrior
  24827, // Trooper
  44951, // Exuberance
  24845, // Aristocracy
  83338, // Firebrand
  67339, // Trapper
  24848, // Nightmare
  24762, // Krait
  24765, // Balthazar
  24779, // Grenth
  44957, // Perplexity
  72912, // Thorns
  24687, // Afflicted
  44956, // Tormenting
  83502, // Renegade
  71425, // Berserker
  83964, // Soulbeast
  24830, // Adventurer
  24757, // Undead
  84127, // Mirage
  24806, // Necromancer
  24738, // Scavenging
  48907, // Antitoxin
  47908, // Sunless
  24860, // Orr
  24717, // Rage
  24750, // Air
  67344, // Evasion
  74978, // Dragonhunter
  24785, // Golemancer
  84171, // Rebirth
  38206, // Altruism
  24842, // Monk
  24839, // Water
  24735, // Grove
  24768, // Dwayna
  83663, // Scourge
  70450, // Druid
  24696, // Flock
  81091, // Nature's Bounty
  24691, // Traveler
  70600, // Leadership
  76166, // Tempest
  83423, // Weaver
  24732, // Divinity
  69370, // Revenant
  88118, // Zephyrite
  85713, // Stars
] as const;

// All Relic item IDs (deduplicated - one ID per relic)
export const RELIC_IDS = [
  104849, // Agony
  100432, // Akeem
  104256, // Altruism
  100390, // Antitoxin
  102245, // Atrocity
  104848, // Bava Nisos
  104800, // Bloodstone
  105652, // Castora
  100074, // Cerus
  100942, // Dagda
  100455, // Durability
  100614, // Evasion
  101116, // Febe
  104501, // Fire
  100947, // Fireworks
  103763, // Geysers
  99997, // Isgarren
  101268, // Karakosa
  100625, // Leadership
  100461, // Lyhr
  100115, // Mabon
  100429, // Mercy
  104994, // Mistburn
  101801, // Mosyn
  103872, // Mount Balrior
  101198, // Nayos
  101191, // Nourys
  100177, // Peitha
  100794, // Resistance
  103984, // Reunification
  103015, // Rivers
  103424, // Sorrow
  100148, // Speed
  100063, // Surging
  100561, // Adventurer
  100693, // Afflicted
  100849, // Aristocracy
  100388, // Astral Ward
  103977, // Beehive
  106364, // Biomancer
  102199, // Blightbringer
  100527, // Brawler
  100542, // Cavalier
  100385, // Centaur
  100450, // Chronomancer
  100448, // Citadel
  103574, // Claw
  100345, // Daredevil
  100924, // Deadeye
  100934, // Defender
  101166, // Demon Queen
  100090, // Dragonhunter
  104241, // Eagle
  100435, // Earth
  100453, // Firebrand
  105585, // First Revenant
  99965, // Flock
  101737, // Founding
  100153, // Fractal
  100403, // Golemancer
  100219, // Herald
  100908, // Holosmith
  100048, // Ice
  100230, // Krait
  100238, // Lich
  104928, // Living City
  101139, // Midnight King
  100158, // Mirage
  106206, // Mist Stranger
  103901, // Mists Tide
  100031, // Monk
  100580, // Necromancer
  100579, // Nightmare
  100311, // Ogre
  100752, // Pack
  104733, // Phenom
  106221, // Pirate Queen
  100479, // Privateer
  100739, // Reaper
  106355, // Scoundrel
  100368, // Scourge
  101863, // Sorcerer
  104022, // Steamshrieker
  102595, // Stormsinger
  100400, // Sunless
  100916, // Thief
  100411, // Trooper
  101767, // Twin Generals
  100694, // Unseen Invasion
  100144, // Warrior
  100659, // Water
  101943, // Wayfinder
  100194, // Weaver
  100557, // Wizard's Tower
  100893, // Zephyrite
  104424, // Thorns
  100676, // Vampirism
  100775, // Vass
  101955, // Zakiros
] as const;

// All Superior Sigil item IDs (complete list - 81 unique sigils)
export const SIGIL_IDS = [
  24618, // Accuracy
  24615, // Force
  44944, // Bursting
  44950, // Malice
  72339, // Concentration
  74326, // Transference
  24612, // Agony
  24624, // Smoldering
  24630, // Chilling
  24627, // Hobbling
  24632, // Venom
  24583, // Demons
  24621, // Peril
  24636, // Debility
  24639, // Paralyzation
  24645, // Centaur Slaying
  24664, // Demon Slaying
  24654, // Destroyer Slaying
  24684, // Sorrow
  24661, // Elemental Slaying
  24675, // Smothering
  24809, // Ghost Slaying
  24648, // Grawl Slaying
  91339, // Hologram Slaying
  24651, // Icebrood Slaying
  24672, // Mad Scientists
  24678, // Justice
  37912, // Karka Slaying
  24658, // Serpent Slaying
  24681, // Dreams
  36053, // Night
  24655, // Ogre Slaying
  24667, // Wrath
  24868, // Impact
  24642, // Undead Slaying
  24572, // Nullification
  24571, // Purity
  24567, // Frailty
  24555, // Ice
  67343, // Incapacitation
  24554, // Air
  24548, // Fire
  24570, // Blood
  38294, // Generosity
  24561, // Rage
  24562, // Strength
  24551, // Water
  67913, // Blight
  24560, // Earth
  48911, // Torment
  82876, // Frenzy
  24591, // Luck
  24589, // Speed
  24592, // Stamina
  81045, // Bounty
  24578, // Corruption
  67341, // Cruelty
  24584, // Benevolence
  24582, // Life
  24575, // Bloodlust
  24580, // Perception
  49457, // Momentum
  86170, // Stars
  72092, // Agility
  24601, // Battle
  67340, // Cleansing
  24609, // Doom
  24607, // Energy
  24605, // Geomancy
  24597, // Hydromancy
  24599, // Leeching
  68436, // Mischief
  44947, // Renewal
  24600, // Vision
  72872, // Absorption
  24865, // Celerity
  70825, // Draining
  73532, // Rending
  24594, // Restoration
  71130, // Ruthlessness
  84505, // Severance
] as const;

export interface GW2Fact {
  text?: string;
  type: string;
  value?: number;
  icon?: string;
  duration?: number;
  hit_count?: number;
  apply_count?: number;
  requires_trait?: number;
  requires_buff?: number;
  distance?: number;
  number?: number;
  percent?: number;
  time?: number;
  [key: string]: unknown;
}

export interface GW2SkillModeData {
  description?: string;
  facts?: GW2Fact[];
  traited_facts?: GW2Fact[];
  [key: string]: unknown;
}

export interface GW2TraitModeData {
  description?: string;
  facts?: GW2Fact[];
  traited_facts?: GW2Fact[];
  [key: string]: unknown;
}

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
  facts?: GW2Fact[];
  traited_facts?: GW2Fact[];
  categories?: string[];
  specialization?: number;
  flags?: string[];
  dual_wield?: string;
  flip_skill?: number;
  transform_skill?: number;
  bundle_skill?: number;
  next_chain?: number;
  prev_chain?: number;
  chain?: string;
  toolbelt_skill?: number;
  skill_id?: number;
  attunement?: string;
  cost?: number;
  initiative?: number;
  swap?: string;
  sequence?: string;
  ammo?: number;
  ammo_count?: number;
  subskills?: Array<{ id: number; attunement?: string | null }>; // Glyphs, tomes, etc.
  pve?: GW2SkillModeData;
  pvp?: GW2SkillModeData;
  wvw?: GW2SkillModeData;
}

export interface GW2SkillWithModes
  extends Omit<GW2Skill, 'description' | 'facts' | 'traited_facts' | 'pve' | 'pvp' | 'wvw'> {
  modes: ModeBundle<GW2SkillModeData>;
}

export interface GW2Trait {
  id: number;
  tier: number;
  order: number;
  name: string;
  description: string;
  icon: string;
  specialization: number;
  facts?: GW2Fact[];
  traited_facts?: GW2Fact[];
  pve?: GW2TraitModeData;
  pvp?: GW2TraitModeData;
  wvw?: GW2TraitModeData;
}

export interface GW2TraitWithModes
  extends Omit<GW2Trait, 'description' | 'facts' | 'traited_facts' | 'pve' | 'pvp' | 'wvw'> {
  modes: ModeBundle<GW2TraitModeData>;
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

export interface GW2Item {
  id: number;
  name: string;
  description?: string;
  type: string;
  level: number;
  rarity: string;
  vendor_value: number;
  icon: string;
  details?: {
    type?: string;
    bonuses?: string[];
    infix_upgrade?: {
      id: number;
      attributes: Array<{
        attribute: string;
        modifier: number;
      }>;
      buff?: {
        skill_id: number;
        description: string;
      };
    };
  };
}

// Build data structure
export interface Equipment {
  slot: ArmorSlot | WeaponSlot | TrinketSlot;
  stat: StatCombo;
  weaponType?: WeaponType; // For weapon slots
  upgrade?: string; // Rune or Sigil name (deprecated, use sigil1Id/sigil2Id for weapons)
  sigil1Id?: number; // First sigil for weapon slots (item ID)
  sigil2Id?: number; // Second sigil for weapon slots (item ID)
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
  runeId?: number; // Item ID of the rune
  relicId?: number; // Item ID of the relic
}
