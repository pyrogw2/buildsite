import { useMemo, useState, useEffect } from 'react';
import { useBuildStore } from '../store/buildStore';
import { gw2Api } from '../lib/gw2api';
import type { StatCombo, InfusionType, GW2Item } from '../types/gw2';
import { BASE_HEALTH, PROFESSION_WEIGHT_CLASS, BASE_ARMOR } from '../types/gw2';

type AttributeKey =
  | 'Power'
  | 'Toughness'
  | 'Vitality'
  | 'Precision'
  | 'Ferocity'
  | 'ConditionDamage'
  | 'HealingPower'
  | 'Expertise'
  | 'BoonDuration';

const BASE_ATTRIBUTES: Record<AttributeKey, number> = {
  Power: 1000,
  Toughness: 1000,
  Vitality: 1000,
  Precision: 1000,
  Ferocity: 0,
  ConditionDamage: 0,
  HealingPower: 0,
  Expertise: 0,
  BoonDuration: 0,
};

// Infusions give +5 to a stat
const INFUSION_BONUSES: Record<InfusionType, Partial<Record<AttributeKey, number>>> = {
  Mighty: { Power: 5 },
  Precise: { Precision: 5 },
  Malign: { ConditionDamage: 5 },
  Expertise: { Expertise: 5 },
  Resilient: { Toughness: 5 },
  Vital: { Vitality: 5 },
  Healing: { HealingPower: 5 },
  Concentration: { BoonDuration: 5 },
};

// Stat distribution for each stat combo (in order of priority)
// Format: [major stat, minor stat 1, minor stat 2, minor stat 3 (if 4-stat)]
const STAT_COMBOS: Record<StatCombo, AttributeKey[]> = {
  Berserker: ['Power', 'Precision', 'Ferocity'],
  Assassin: ['Precision', 'Power', 'Ferocity'],
  Marauder: ['Power', 'Precision', 'Vitality', 'Ferocity'],
  Viper: ['Power', 'ConditionDamage', 'Precision', 'Expertise'],
  Sinister: ['ConditionDamage', 'Power', 'Precision'],
  Celestial: ['Power', 'Precision', 'Toughness', 'Vitality', 'ConditionDamage', 'HealingPower', 'Expertise', 'BoonDuration', 'Ferocity'],
  Diviner: ['Power', 'BoonDuration', 'Precision', 'Ferocity'],
  Harrier: ['Power', 'HealingPower', 'BoonDuration'],
  Minstrel: ['Toughness', 'HealingPower', 'Vitality', 'BoonDuration'],
  Magi: ['HealingPower', 'Precision', 'Vitality'],
  Soldier: ['Power', 'Toughness', 'Vitality'],
  Cavalier: ['Toughness', 'Power', 'Ferocity'],
  Nomad: ['Toughness', 'Vitality', 'HealingPower'],
  Trailblazer: ['Toughness', 'ConditionDamage', 'Vitality', 'Expertise'],
  Seraph: ['Precision', 'ConditionDamage', 'BoonDuration', 'HealingPower'],
  Commander: ['Power', 'Precision', 'Toughness', 'BoonDuration'],
  Vigilant: ['Power', 'Toughness', 'BoonDuration', 'Expertise'],
  Crusader: ['Power', 'Toughness', 'Ferocity', 'HealingPower'],
  Marshal: ['Power', 'HealingPower', 'Precision', 'ConditionDamage'],
  Grieving: ['Power', 'ConditionDamage', 'Precision', 'Ferocity'],
  Plaguedoctor: ['Vitality', 'ConditionDamage', 'HealingPower', 'BoonDuration'],
  Giver: ['Toughness', 'BoonDuration', 'HealingPower'],
  Dragon: ['Power', 'Ferocity', 'Precision', 'Vitality'],
  Ritualist: ['Vitality', 'ConditionDamage', 'BoonDuration', 'Expertise'],
  Demolisher: ['Power', 'Precision', 'Toughness', 'Ferocity'],
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
  Wanderer: ['Power', 'Vitality', 'Toughness', 'BoonDuration'],
};

// Stat multipliers per slot (based on GW2 ascended gear)
// For 3-stat: [major, minor, minor]
// For 4-stat: [major, major, minor, minor]
const SLOT_MULTIPLIERS: Record<string, number[]> = {
  // Armor
  'Helm': [0.47, 0.47, 0.26, 0.26],
  'Shoulders': [0.35, 0.35, 0.19, 0.19],
  'Coat': [1.05, 1.05, 0.58, 0.58],
  'Gloves': [0.35, 0.35, 0.19, 0.19],
  'Leggings': [0.70, 0.70, 0.39, 0.39],
  'Boots': [0.35, 0.35, 0.19, 0.19],
  // Trinkets
  'Backpack': [1.16, 1.16, 0.62, 0.62],
  'Accessory1': [0.80, 0.80, 0.43, 0.43],
  'Accessory2': [0.80, 0.80, 0.43, 0.43],
  'Amulet': [1.16, 1.16, 0.62, 0.62],
  'Ring1': [0.93, 0.93, 0.49, 0.49],
  'Ring2': [0.93, 0.93, 0.49, 0.49],
  // Weapons - treating as 2H for now (staff/greatsword/etc)
  // TODO: detect 1H vs 2H weapons properly
  'MainHand1': [1.87, 1.87, 1.03, 1.03],
  'OffHand1': [0.52, 0.52, 0.31, 0.31],
  'MainHand2': [1.87, 1.87, 1.03, 1.03],
  'OffHand2': [0.52, 0.52, 0.31, 0.31],
};

const BASE_STAT_VALUE = 115; // Base major stat value for armor

const ATTRIBUTES: Array<{
  key: AttributeKey;
  label: string;
  accent: string;
}> = [
  { key: 'Power', label: 'Power', accent: 'bg-sky-500' },
  { key: 'Toughness', label: 'Toughness', accent: 'bg-amber-500' },
  { key: 'Vitality', label: 'Vitality', accent: 'bg-emerald-500' },
  { key: 'Precision', label: 'Precision', accent: 'bg-fuchsia-500' },
  { key: 'Ferocity', label: 'Ferocity', accent: 'bg-orange-500' },
  { key: 'ConditionDamage', label: 'Condition Damage', accent: 'bg-red-500' },
  { key: 'HealingPower', label: 'Healing Power', accent: 'bg-teal-400' },
  { key: 'Expertise', label: 'Expertise', accent: 'bg-indigo-500' },
  { key: 'BoonDuration', label: 'Concentration', accent: 'bg-lime-400' },
];

const formatNumber = (value: number) => Math.round(value).toLocaleString();

// Map API stat names to AttributeKey
const STAT_NAME_MAP: Record<string, AttributeKey> = {
  'Power': 'Power',
  'Precision': 'Precision',
  'Toughness': 'Toughness',
  'Vitality': 'Vitality',
  'Ferocity': 'Ferocity',
  'Condition Damage': 'ConditionDamage',
  'Healing Power': 'HealingPower',
  'Expertise': 'Expertise',
  'Concentration': 'BoonDuration',
};

// Parse rune bonus strings like "+25 Power", "+10% Boon Duration"
function parseRuneBonus(bonus: string): { attribute: AttributeKey; value: number; isPercent: boolean } | null {
  const match = bonus.match(/\+(\d+)(%?)\s+(.+)/);
  if (!match) return null;

  const [, valueStr, percentSign, statName] = match;
  const attribute = STAT_NAME_MAP[statName];
  if (!attribute) return null;

  return {
    attribute,
    value: parseInt(valueStr, 10),
    isPercent: percentSign === '%',
  };
}

export default function StatsPanel() {
  const { equipment, runeId, profession } = useBuildStore();
  const [runeItem, setRuneItem] = useState<GW2Item | null>(null);

  useEffect(() => {
    if (runeId) {
      gw2Api.getItem(runeId).then(setRuneItem).catch(console.error);
    } else {
      setRuneItem(null);
    }
  }, [runeId]);

  const totals = useMemo(() => {
    const acc = equipment.reduce<Record<AttributeKey, number>>((acc, item) => {
      // Only count weapon set 1 (not both weapon sets)
      if (item.slot === 'MainHand2' || item.slot === 'OffHand2') {
        return acc;
      }

      // Get stat combo and slot multipliers
      const statCombo = STAT_COMBOS[item.stat as StatCombo];
      const multipliers = SLOT_MULTIPLIERS[item.slot];

      if (statCombo && multipliers) {
        // Determine if this is 3-stat or 4-stat combo
        const is4Stat = statCombo.length === 4;
        const is3Stat = statCombo.length === 3;

        // Apply stats based on priority and slot multipliers
        statCombo.forEach((attribute, index) => {
          let multiplier = 0;

          if (is3Stat) {
            // 3-stat: [major, minor, minor]
            multiplier = index === 0 ? multipliers[0] : multipliers[2];
          } else if (is4Stat) {
            // 4-stat: [major, major, minor, minor]
            multiplier = index < 2 ? multipliers[0] : multipliers[2];
          } else {
            // Celestial (9-stat) or other - use multipliers directly
            multiplier = multipliers[Math.min(index, multipliers.length - 1)];
          }

          const value = Math.round(BASE_STAT_VALUE * multiplier);
          acc[attribute] += value;
        });
      }

      // Add infusion contributions
      if (item.infusion1) {
        const infusionBonus = INFUSION_BONUSES[item.infusion1];
        if (infusionBonus) {
          Object.entries(infusionBonus).forEach(([key, value]) => {
            const attribute = key as AttributeKey;
            acc[attribute] += value ?? 0;
          });
        }
      }

      return acc;
    }, { ...BASE_ATTRIBUTES });

    // Add rune bonuses
    if (runeItem?.details?.bonuses) {
      runeItem.details.bonuses.forEach(bonus => {
        const parsed = parseRuneBonus(bonus);
        if (parsed) {
          if (parsed.isPercent) {
            // Convert percentage to flat stat (e.g., 10% boon duration = 150 points)
            // For Expertise/BoonDuration: 15 points = 1%
            const flatValue = parsed.value * 15;
            acc[parsed.attribute] += flatValue;
          } else {
            // Direct stat bonus
            acc[parsed.attribute] += parsed.value;
          }
        }
      });
    }

    return acc;
  }, [equipment, runeItem]);

  const maxValue = useMemo(() => {
    return ATTRIBUTES.reduce((max, attribute) => Math.max(max, totals[attribute.key]), 0);
  }, [totals]);

  // Calculate derived stat for a given attribute
  const getDerivedStat = (attributeKey: AttributeKey, value: number): string | null => {
    if (!profession) return null;

    const weightClass = PROFESSION_WEIGHT_CLASS[profession];
    const baseHealth = BASE_HEALTH[profession];
    const baseArmor = BASE_ARMOR[weightClass];

    switch (attributeKey) {
      case 'Toughness':
        // Armor = Base Armor + Total Toughness
        const armor = baseArmor + value;
        return `Armor: ${formatNumber(armor)}`;
      case 'Vitality':
        // Base health already includes base vitality, so only add equipment bonus
        const health = baseHealth + (value - 1000) * 10;
        return `Health: ${formatNumber(health)}`;
      case 'Precision':
        const critChance = Math.min(100, Math.max(0, 4 + (value - 1000) / 21));
        return `Crit Chance: ${critChance.toFixed(1)}%`;
      case 'Ferocity':
        const critDamage = 150 + value / 15;
        return `Crit Damage: ${critDamage.toFixed(1)}%`;
      case 'Expertise':
        const conditionDuration = Math.min(100, value / 15);
        return `Condition Duration: +${conditionDuration.toFixed(1)}%`;
      case 'BoonDuration':
        const boonDuration = Math.min(100, value / 15);
        return `Boon Duration: +${boonDuration.toFixed(1)}%`;
      default:
        return null;
    }
  };

  return (
    <aside className="rounded-[28px] border border-slate-800/80 bg-slate-900/70 p-6 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.9)]">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.35em] text-slate-500">Attributes</p>
          <h2 className="mt-2 text-lg font-semibold text-white">Stat Summary</h2>
        </div>
        <div className="rounded-full border border-slate-700 px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-slate-400">
          Ascended est.
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {ATTRIBUTES.map((attribute) => {
          const value = totals[attribute.key];
          const percent = maxValue ? Math.min(100, (value / maxValue) * 100) : 0;
          const derivedStat = getDerivedStat(attribute.key, value);

          return (
            <div key={attribute.key} className="space-y-2">
              <div className="flex items-center justify-between text-sm text-slate-300">
                <span className="font-medium text-slate-200">{attribute.label}</span>
                <span className="font-semibold text-white">{formatNumber(value)}</span>
              </div>
              <div className="h-2.5 rounded-full bg-slate-800/80">
                <div
                  className={`h-2.5 rounded-full ${attribute.accent}`}
                  style={{ width: `${percent}%` }}
                />
              </div>
              {derivedStat && (
                <div className="text-[11px] text-slate-400 pl-0.5">
                  {derivedStat}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
