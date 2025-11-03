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

// Infusion types (+5 to stat)
export const INFUSIONS = [
  'Mighty', 'Precise', 'Malign', 'Expertise', 'Resilient', 'Vital', 'Healing', 'Concentration'
] as const;

export type InfusionType = typeof INFUSIONS[number];

// All Superior Rune item IDs
export const RUNE_IDS = [
  24765, // Balthazar
  91513, // Balthazar
  73653, // Durability
  91444, // Durability
  44951, // Exuberance
  91417, // Exuberance
  89999, // Fireworks
  91482, // Fireworks
  24779, // Grenth
  91468, // Grenth
  24729, // Hoelbrak
  91564, // Hoelbrak
  24703, // Infiltration
  91608, // Infiltration
  24776, // Lyssa
  91471, // Lyssa
  24771, // Melandru
  91566, // Melandru
  24708, // Mercy
  91556, // Mercy
  44957, // Perplexity
  91550, // Perplexity
  67342, // Radiance
  91587, // Radiance
  24726, // Rata Sum
  91572, // Rata Sum
  49460, // Resistance
  91411, // Resistance
  24857, // Sanctuary
  91605, // Sanctuary
  68437, // Snowfall
  91512, // Snowfall
  24720, // Speed
  91401, // Speed
  24714, // Strength
  91423, // Strength
  76813, // Surging
  91591, // Surging
  24794, // Svanir
  91494, // Svanir
  24687, // Afflicted
  91460, // Afflicted
  24845, // Aristocracy
  91602, // Aristocracy
  24854, // Baelfire
  91477, // Baelfire
  71425, // Berserker
  91397, // Berserker
  24833, // Brawler
  91425, // Brawler
  83367, // Cavalier
  91396, // Cavalier
  24788, // Centaur
  91599, // Centaur
  73399, // Chronomancer
  91565, // Chronomancer
  24741, // Citadel
  91588, // Citadel
  72852, // Daredevil
  91457, // Daredevil
  82791, // Deadeye
  91483, // Deadeye
  67912, // Defender
  91404, // Defender
  24699, // Dolyak
  91459, // Dolyak
  24723, // Eagle
  91433, // Eagle
  24744, // Earth
  91493, // Earth
  24800, // Elementalist
  91465, // Elementalist
  24812, // Engineer
  91522, // Engineer
  24747, // Fire
  91489, // Fire
  83338, // Firebrand
  91538, // Firebrand
  24797, // Flame Legion
  91507, // Flame Legion
  24851, // Forgeman
  91419, // Forgeman
  24824, // Guardian
  91570, // Guardian
  76100, // Herald
  91585, // Herald
  82633, // Holosmith
  91560, // Holosmith
  24753, // Ice
  91580, // Ice
  24762, // Krait
  91435, // Krait
  24688, // Lich
  91533, // Lich
  36044, // Mad King
  91581, // Mad King
  24803, // Mesmer
  91387, // Mesmer
  24848, // Nightmare
  91410, // Nightmare
  24756, // Ogre
  91497, // Ogre
  24702, // Pack
  91592, // Pack
  24782, // Privateer
  91557, // Privateer
  24815, // Ranger
  91541, // Ranger
  70829, // Reaper
  91578, // Reaper
  83502, // Renegade
  91573, // Renegade
  24836, // Scholar
  91595, // Scholar
  71276, // Scrapper
  91582, // Scrapper
  83964, // Soulbeast
  91510, // Soulbeast
  84749, // Spellbreaker
  91590, // Spellbreaker
  24818, // Thief
  91579, // Thief
  67339, // Trapper
  91508, // Trapper
  24827, // Trooper
  91551, // Trooper
  24821, // Warrior
  91523, // Warrior
  24791, // Wurm
  91593, // Wurm
  72912, // Thorns
  91381, // Thorns
  44956, // Tormenting
  91516, // Tormenting
  24711, // Vampirism
  91545, // Vampirism
] as const;

// All Relic item IDs
export const RELIC_IDS = [
  104849, // Agony
  100432, // Akeem
  101573, // Akeem
  104256, // Altruism
  104491, // Altruism
  100390, // Antitoxin
  101487, // Antitoxin
  102245, // Atrocity
  102787, // Atrocity
  104848, // Bava Nisos
  104800, // Bloodstone
  105652, // Castora
  100074, // Cerus
  101500, // Cerus
  100942, // Dagda
  101491, // Dagda
  100455, // Durability
  100562, // Durability
  101504, // Durability
  81733, // Dwayna
  100442, // Dwayna
  101514, // Dwayna
  100614, // Evasion
  100886, // Evasion
  101441, // Evasion
  101116, // Febe
  101563, // Febe
  104308, // Fire
  104501, // Fire
  100262, // Fireworks
  100947, // Fireworks
  101564, // Fireworks
  103763, // Geysers
  103829, // Geysers
  99997, // Isgarren
  101649, // Isgarren
  101268, // Karakosa
  101546, // Karakosa
  100625, // Leadership
  101461, // Leadership
  100461, // Lyhr
  101605, // Lyhr
  100115, // Mabon
  101643, // Mabon
  100429, // Mercy
  101439, // Mercy
  104994, // Mistburn
  101801, // Mosyn
  101860, // Mosyn
  103872, // Mount Balrior
  104035, // Mount Balrior
  101198, // Nayos
  101627, // Nayos
  101191, // Nourys
  101503, // Nourys
  100177, // Peitha
  101611, // Peitha
  100794, // Resistance
  101466, // Resistance
  103924, // Reunification
  103984, // Reunification
  102442, // Rivers
  103015, // Rivers
  103424, // Sorrow
  103507, // Sorrow
  100148, // Speed
  101442, // Speed
  100063, // Surging
  104274, // Surging
  100561, // Adventurer
  101511, // Adventurer
  100693, // Afflicted
  101493, // Afflicted
  100849, // Aristocracy
  101539, // Aristocracy
  100388, // Astral Ward
  101619, // Astral Ward
  103923, // Beehive
  103977, // Beehive
  106364, // Biomancer
  102199, // Blightbringer
  102896, // Blightbringer
  100527, // Brawler
  101600, // Brawler
  100542, // Cavalier
  101534, // Cavalier
  100385, // Centaur
  101607, // Centaur
  100450, // Chronomancer
  101549, // Chronomancer
  100248, // Citadel
  100448, // Citadel
  101647, // Citadel
  102877, // Claw
  103574, // Claw
  100345, // Daredevil
  101644, // Daredevil
  100924, // Deadeye
  101637, // Deadeye
  100934, // Defender
  101513, // Defender
  101166, // Demon Queen
  101467, // Demon Queen
  100090, // Dragonhunter
  101590, // Dragonhunter
  104241, // Eagle
  104413, // Eagle
  100435, // Earth
  104383, // Earth
  100453, // Firebrand
  101452, // Firebrand
  105585, // First Revenant
  99965, // Flock
  100633, // Flock
  101527, // Flock
  101737, // Founding
  101776, // Founding
  100153, // Fractal
  101489, // Fractal
  100403, // Golemancer
  104416, // Golemancer
  100219, // Herald
  101509, // Herald
  100908, // Holosmith
  104390, // Holosmith
  100048, // Ice
  101608, // Ice
  100230, // Krait
  101640, // Krait
  100238, // Lich
  104277, // Lich
  104928, // Living City
  104938, // Living City
  101139, // Midnight King
  101621, // Midnight King
  100158, // Mirage
  101581, // Mirage
  106206, // Mist Stranger
  103901, // Mists Tide
  103941, // Mists Tide
  100031, // Monk
  101630, // Monk
  100165, // Necromancer
  100580, // Necromancer
  101465, // Necromancer
  100579, // Nightmare
  101453, // Nightmare
  100311, // Ogre
  104334, // Ogre
  100752, // Pack
  101447, // Pack
  104733, // Phenom
  106221, // Pirate Queen
  100479, // Privateer
  104311, // Privateer
  100739, // Reaper
  101472, // Reaper
  106355, // Scoundrel
  100368, // Scourge
  101634, // Scourge
  101863, // Sorcerer
  101908, // Sorcerer
  103811, // Steamshrieker
  104022, // Steamshrieker
  102595, // Stormsinger
  103262, // Stormsinger
  100400, // Sunless
  101541, // Sunless
  100916, // Thief
  100976, // Thief
  101580, // Thief
  100411, // Trooper
  101554, // Trooper
  101731, // Twin Generals
  101767, // Twin Generals
  100694, // Unseen Invasion
  101571, // Unseen Invasion
  100144, // Warrior
  100299, // Warrior
  101545, // Warrior
  100531, // Water
  100659, // Water
  101474, // Water
  101917, // Wayfinder
  101943, // Wayfinder
  100194, // Weaver
  101526, // Weaver
  100557, // Wizard's Tower
  101586, // Wizard's Tower
  100893, // Zephyrite
  101618, // Zephyrite
  104296, // Thorns
  104424, // Thorns
  100676, // Vampirism
  104249, // Vampirism
  100775, // Vass
  101492, // Vass
  101944, // Zakiros
  101955, // Zakiros
] as const;

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
    };
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
  runeId?: number; // Item ID of the rune
  relicId?: number; // Item ID of the relic
}
