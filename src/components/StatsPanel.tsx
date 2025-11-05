import { useMemo, useState, useEffect } from 'react';
import { useBuildStore } from '../store/buildStore';
import { gw2Api } from '../lib/gw2api';
import type { StatCombo, GW2Item } from '../types/gw2';
import { BASE_HEALTH, PROFESSION_WEIGHT_CLASS, BASE_ARMOR, TWO_HANDED_WEAPONS } from '../types/gw2';
import { ASCENDED_ARMOR_STATS, ASCENDED_TRINKET_STATS, ASCENDED_WEAPON_STATS, type SlotStatValues } from '../lib/statTables';
import Tooltip from './Tooltip';

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

// Infusions give +5 to a stat (keyed by item ID)
const INFUSION_BONUSES: Record<number, Partial<Record<AttributeKey, number>>> = {
  43254: { Power: 5 },          // Mighty WvW Infusion
  43255: { Precision: 5 },      // Precise WvW Infusion
  43253: { ConditionDamage: 5 }, // Malign WvW Infusion
  87218: { Expertise: 5 },      // Expertise WvW Infusion
  43251: { Toughness: 5 },      // Resilient WvW Infusion
  43252: { Vitality: 5 },       // Vital WvW Infusion
  43250: { HealingPower: 5 },   // Healing WvW Infusion
  86986: { BoonDuration: 5 },   // Concentration WvW Infusion
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

const ATTRIBUTES: Array<{
  key: AttributeKey;
  label: string;
  shortLabel: string;
  accent: string;
  icon: string;
}> = [
  { key: 'Power', label: 'Power', shortLabel: 'Power', accent: 'bg-sky-500', icon: 'https://wiki.guildwars2.com/images/2/23/Power.png' },
  { key: 'Toughness', label: 'Toughness', shortLabel: 'Tough', accent: 'bg-amber-500', icon: 'https://wiki.guildwars2.com/images/1/12/Toughness.png' },
  { key: 'Vitality', label: 'Vitality', shortLabel: 'Vit', accent: 'bg-emerald-500', icon: 'https://wiki.guildwars2.com/images/b/be/Vitality.png' },
  { key: 'Precision', label: 'Precision', shortLabel: 'Prec', accent: 'bg-fuchsia-500', icon: 'https://wiki.guildwars2.com/images/e/ee/Precision.png' },
  { key: 'Ferocity', label: 'Ferocity', shortLabel: 'Fero', accent: 'bg-orange-500', icon: 'https://wiki.guildwars2.com/images/f/f1/Ferocity.png' },
  { key: 'ConditionDamage', label: 'Condition Damage', shortLabel: 'Condi', accent: 'bg-red-500', icon: 'https://wiki.guildwars2.com/images/5/54/Condition_Damage.png' },
  { key: 'HealingPower', label: 'Healing Power', shortLabel: 'Healing P', accent: 'bg-teal-400', icon: 'https://wiki.guildwars2.com/images/8/81/Healing_Power.png' },
  { key: 'Expertise', label: 'Expertise', shortLabel: 'Exp', accent: 'bg-indigo-500', icon: 'https://wiki.guildwars2.com/images/3/38/Condition_Duration.png' },
  { key: 'BoonDuration', label: 'Concentration', shortLabel: 'Conc', accent: 'bg-lime-400', icon: 'https://wiki.guildwars2.com/images/4/44/Boon_Duration.png' },
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
  'Condition Duration': 'Expertise',
  'Healing Power': 'HealingPower',
  'Expertise': 'Expertise',
  'Concentration': 'BoonDuration',
  'Boon Duration': 'BoonDuration',
  'Critical Damage': 'Ferocity',
};

const PERCENT_TO_ATTRIBUTE: Partial<Record<AttributeKey, number>> = {
  Expertise: 15,
  BoonDuration: 15,
  Ferocity: 15,
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
  const { equipment, runeId, relicId, profession } = useBuildStore();
  const [runeItem, setRuneItem] = useState<GW2Item | null>(null);
  const [relicItem, setRelicItem] = useState<GW2Item | null>(null);

  useEffect(() => {
    if (runeId) {
      gw2Api.getItem(runeId).then(setRuneItem).catch(console.error);
    } else {
      setRuneItem(null);
    }
  }, [runeId]);

  useEffect(() => {
    if (relicId) {
      gw2Api.getItem(relicId).then(setRelicItem).catch(console.error);
    } else {
      setRelicItem(null);
    }
  }, [relicId]);

  const totals = useMemo(() => {
    const armorStats = ASCENDED_ARMOR_STATS as Record<string, SlotStatValues>;
    const trinketStats = ASCENDED_TRINKET_STATS as Record<string, SlotStatValues>;
    const totals = { ...BASE_ATTRIBUTES } as Record<AttributeKey, number>;
    const equipmentBySlot = equipment.reduce<Record<string, typeof equipment[number]>>((acc, item) => {
      acc[item.slot] = item;
      return acc;
    }, {});

    equipment.forEach((item) => {
      if (item.slot === 'MainHand2' || item.slot === 'OffHand2') {
        return;
      }

      let slotValues: SlotStatValues | undefined;

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
          return;
        }
        slotValues = ASCENDED_WEAPON_STATS.oneHanded;
      } else {
        return;
      }

      const statCombo = STAT_COMBOS[item.stat as StatCombo];
      if (!slotValues || !statCombo) {
        return;
      }

      if (statCombo.length === 9) {
        statCombo.forEach((attribute) => {
          totals[attribute] += slotValues.major9;
        });
      } else if (statCombo.length === 4) {
        statCombo.forEach((attribute, index) => {
          totals[attribute] += index < 2 ? slotValues.major4 : slotValues.minor4;
        });
      } else {
        statCombo.forEach((attribute, index) => {
          totals[attribute] += index === 0 ? slotValues.major3 : slotValues.minor3;
        });
      }

      (['infusion1', 'infusion2', 'infusion3'] as const).forEach((key) => {
        const infusionType = item[key];
        if (!infusionType) return;
        const infusionBonus = INFUSION_BONUSES[infusionType];
        if (!infusionBonus) return;
        Object.entries(infusionBonus).forEach(([attribute, value]) => {
          totals[attribute as AttributeKey] += value ?? 0;
        });
      });
    });

    if (runeItem?.details?.bonuses) {
      runeItem.details.bonuses.forEach((bonus) => {
        const parsed = parseRuneBonus(bonus);
        if (!parsed) return;

        if (parsed.isPercent) {
          const conversion = PERCENT_TO_ATTRIBUTE[parsed.attribute];
          if (conversion) {
            totals[parsed.attribute] += parsed.value * conversion;
          }
        } else {
          totals[parsed.attribute] += parsed.value;
        }
      });
    }

    return totals;
  }, [equipment, runeItem]);

  // Calculate derived stat for a given attribute
  const getDerivedStat = (attributeKey: AttributeKey, value: number): { label: string; value: string } | null => {
    if (!profession) return null;

    const weightClass = PROFESSION_WEIGHT_CLASS[profession];
    const baseHealth = BASE_HEALTH[profession];
    const baseArmor = BASE_ARMOR[weightClass];

    switch (attributeKey) {
      case 'Toughness':
        // Armor = Base Armor + Total Toughness
        const armor = baseArmor + value;
        return { label: 'Armor', value: formatNumber(armor) };
      case 'Vitality':
        // Base health already includes base vitality, so only add equipment bonus
        const health = baseHealth + (value - 1000) * 10;
        return { label: 'HP', value: formatNumber(health) };
      case 'Precision':
        const critChance = Math.min(100, Math.max(0, 4 + (value - 1000) / 21));
        return { label: 'Crit ch', value: `${critChance.toFixed(2)}%` };
      case 'Ferocity':
        const critDamage = 150 + value / 15;
        return { label: 'Crit dm', value: `${critDamage.toFixed(2)}%` };
      case 'Expertise':
        const conditionDuration = Math.min(100, value / 15);
        return { label: 'Condi Dur', value: `${conditionDuration.toFixed(2)}%` };
      case 'BoonDuration':
        const boonDuration = Math.min(100, value / 15);
        return { label: 'Boon Dur', value: `${boonDuration.toFixed(2)}%` };
      default:
        return null;
    }
  };

  // Calculate effective power and effective HP
  const effectiveStats = useMemo(() => {
    if (!profession) return null;

    const power = totals.Power;
    const ferocity = totals.Ferocity;
    const critChance = Math.min(100, Math.max(0, 4 + (totals.Precision - 1000) / 21)) / 100;
    const critDamage = (150 + ferocity / 15) / 100;

    // Effective Power = Power * (1 + Crit Chance * (Crit Damage - 1))
    const effectivePower = power * (1 + critChance * (critDamage - 1));

    // Effective HP = HP * (1 + Armor / 1000)
    const weightClass = PROFESSION_WEIGHT_CLASS[profession];
    const baseHealth = BASE_HEALTH[profession];
    const baseArmor = BASE_ARMOR[weightClass];
    const health = baseHealth + (totals.Vitality - 1000) * 10;
    const armor = baseArmor + totals.Toughness;
    const effectiveHP = health * (1 + armor / 1000);

    return {
      effectivePower: formatNumber(effectivePower),
      effectiveHP: formatNumber(effectiveHP),
    };
  }, [totals, profession]);

  // Organize attributes into two columns: base stats and derived stats
  const leftColumnAttrs = [
    { key: 'Power', label: 'Power' },
    { key: 'Toughness', label: 'Tough' },
    { key: 'Vitality', label: 'Vit' },
    { key: 'Precision', label: 'Prec' },
    { key: 'Ferocity', label: 'Fero' },
    { key: 'ConditionDamage', label: 'Condi' },
    { key: 'Expertise', label: 'Exp' },
    { key: 'BoonDuration', label: 'Conc' },
  ];

  // Fetch sigils for gear summary
  const [sigilItems, setSigilItems] = useState<Map<number, GW2Item>>(new Map());

  useEffect(() => {
    const sigilIds = new Set<number>();
    equipment.forEach((item) => {
      if (item.sigil1Id) sigilIds.add(item.sigil1Id);
      if (item.sigil2Id) sigilIds.add(item.sigil2Id);
    });

    if (sigilIds.size > 0) {
      gw2Api.getItems([...sigilIds]).then((items) => {
        const map = new Map<number, GW2Item>();
        items.forEach(item => map.set(item.id, item));
        setSigilItems(map);
      }).catch(console.error);
    }
  }, [equipment]);

  // Calculate gear summary
  const gearSummary = useMemo(() => {
    // Weapon sets
    const weaponSet1: Array<{ text: string; sigil1Id?: number; sigil2Id?: number }> = [];
    const weaponSet2: Array<{ text: string; sigil1Id?: number; sigil2Id?: number }> = [];

    // Individual armor pieces
    const armorPieces: Array<{ slot: string; stat: string }> = [];

    // Individual trinkets
    const trinkets: Array<{ slot: string; stat: string }> = [];

    equipment.forEach((item) => {
      // Weapon Set 1
      if (item.slot === 'MainHand1' && item.weaponType && item.stat) {
        const isTwoHanded = TWO_HANDED_WEAPONS.includes(item.weaponType);
        weaponSet1.push({
          text: `${item.weaponType} - ${item.stat}${isTwoHanded ? ' (2H)' : ''}`,
          sigil1Id: item.sigil1Id,
          sigil2Id: item.sigil2Id,
        });
      } else if (item.slot === 'OffHand1' && item.weaponType && item.stat) {
        weaponSet1.push({
          text: `${item.weaponType} - ${item.stat}`,
          sigil1Id: item.sigil1Id,
        });
      }

      // Weapon Set 2
      if (item.slot === 'MainHand2' && item.weaponType && item.stat) {
        const isTwoHanded = TWO_HANDED_WEAPONS.includes(item.weaponType);
        weaponSet2.push({
          text: `${item.weaponType} - ${item.stat}${isTwoHanded ? ' (2H)' : ''}`,
          sigil1Id: item.sigil1Id,
          sigil2Id: item.sigil2Id,
        });
      } else if (item.slot === 'OffHand2' && item.weaponType && item.stat) {
        weaponSet2.push({
          text: `${item.weaponType} - ${item.stat}`,
          sigil1Id: item.sigil1Id,
        });
      }

      // Armor pieces
      if (['Helm', 'Shoulders', 'Coat', 'Gloves', 'Leggings', 'Boots'].includes(item.slot) && item.stat) {
        armorPieces.push({ slot: item.slot, stat: item.stat });
      }

      // Trinkets
      if (['Amulet', 'Ring1', 'Ring2', 'Accessory1', 'Accessory2', 'Backpack'].includes(item.slot) && item.stat) {
        const displaySlot = item.slot === 'Ring1' ? 'ring' :
                           item.slot === 'Ring2' ? 'ring' :
                           item.slot === 'Accessory1' ? 'accessory' :
                           item.slot === 'Accessory2' ? 'accessory' :
                           item.slot === 'Amulet' ? 'amulet' : 'back';
        trinkets.push({ slot: displaySlot, stat: item.stat });
      }
    });

    return { weaponSet1, weaponSet2, armorPieces, trinkets };
  }, [equipment]);

  return (
    <aside className="rounded-[28px] border border-slate-800/80 bg-slate-900/70 p-6 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.9)]">
      {/* Header */}
      <div>
        <p className="text-sm font-medium text-white">Attributes</p>
      </div>

      {/* Two-column layout */}
      <div className="mt-4 grid grid-cols-2 gap-x-12 gap-y-2.5">
        {/* Left column - base stats */}
        <div className="space-y-2.5">
          {leftColumnAttrs.map((attr) => {
            const attribute = ATTRIBUTES.find(a => a.key === attr.key as AttributeKey);
            if (!attribute) return null;
            const value = totals[attribute.key];

            return (
              <div key={attribute.key} className="flex items-center justify-between gap-2" title={attribute.label}>
                <img src={attribute.icon} alt={attribute.label} className="w-4 h-4 flex-shrink-0 cursor-help" />
                <span className="text-xs text-white font-medium">{formatNumber(value)}</span>
              </div>
            );
          })}
        </div>

        {/* Right column - derived stats */}
        <div className="space-y-2.5">
          {leftColumnAttrs.map((attr) => {
            const attribute = ATTRIBUTES.find(a => a.key === attr.key as AttributeKey);
            if (!attribute) return null;
            const value = totals[attribute.key];
            const derivedStat = getDerivedStat(attribute.key, value);

            if (!derivedStat) {
              // For stats without derived values (Power, Condi, Exp, Conc), show Healing Power or empty
              if (attribute.key === 'ConditionDamage') {
                const healingPower = ATTRIBUTES.find(a => a.key === 'HealingPower');
                const healValue = totals.HealingPower;
                return (
                  <div key={`${attribute.key}-healing`} className="flex items-center justify-between gap-2" title="Healing Power">
                    <img src={healingPower?.icon} alt="Healing Power" className="w-4 h-4 flex-shrink-0 cursor-help" />
                    <span className="text-xs text-white font-medium">{formatNumber(healValue)}</span>
                  </div>
                );
              }
              // Show icon with placeholder when no derived stat available
              return (
                <div key={`${attribute.key}-empty`} className="flex items-center justify-between gap-2" title={attribute.label}>
                  <img src={attribute.icon} alt={attribute.label} className="w-4 h-4 flex-shrink-0 opacity-30 cursor-help" />
                  <span className="text-xs text-slate-600 font-medium">—</span>
                </div>
              );
            }

            return (
              <div key={`${attribute.key}-derived`} className="flex items-center justify-between gap-2" title={derivedStat.label}>
                <img src={attribute.icon} alt={attribute.label} className="w-4 h-4 flex-shrink-0 cursor-help" />
                <span className="text-xs text-white font-medium">{derivedStat.value}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Effective stats */}
      {effectiveStats && (
        <div className="mt-6 pt-4 border-t border-slate-800/60 grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Eff Power</span>
            <span className="text-xs text-white font-medium ml-auto">{effectiveStats.effectivePower}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Eff HP</span>
            <span className="text-xs text-white font-medium ml-auto">{effectiveStats.effectiveHP}</span>
          </div>
        </div>
      )}

      {/* Gear Summary */}
      <div className="mt-6 pt-4 border-t border-slate-800/60 space-y-4">
        <p className="text-sm font-medium text-white">Gear Summary</p>

        {/* Weapon Sets with Swap Indicator */}
        {(gearSummary.weaponSet1.length > 0 || gearSummary.weaponSet2.length > 0) && (
          <div className="flex items-start gap-2">
            {/* Weapon Set 1 */}
            <div className="flex-1 space-y-1">
              {gearSummary.weaponSet1.map((weapon, idx) => (
                <div key={idx} className="flex items-center gap-1 text-[11px] text-slate-300">
                  <span className="truncate">{weapon.text.replace(' - ', '\n').split('\n')[0]}</span>
                  {(weapon.sigil1Id || weapon.sigil2Id) && (
                    <div className="flex gap-0.5 ml-auto flex-shrink-0">
                      {weapon.sigil1Id && sigilItems.get(weapon.sigil1Id) && (
                        <Tooltip
                          title={sigilItems.get(weapon.sigil1Id)!.name}
                          content={sigilItems.get(weapon.sigil1Id)!.details?.infix_upgrade?.buff?.description || sigilItems.get(weapon.sigil1Id)!.description || ''}
                          icon={sigilItems.get(weapon.sigil1Id)!.icon}
                          rarity={sigilItems.get(weapon.sigil1Id)!.rarity}
                          itemType={sigilItems.get(weapon.sigil1Id)!.type}
                        >
                          <img src={sigilItems.get(weapon.sigil1Id)!.icon} alt="" className="w-3.5 h-3.5 rounded flex-shrink-0 cursor-help" />
                        </Tooltip>
                      )}
                      {weapon.sigil2Id && sigilItems.get(weapon.sigil2Id) && (
                        <Tooltip
                          title={sigilItems.get(weapon.sigil2Id)!.name}
                          content={sigilItems.get(weapon.sigil2Id)!.details?.infix_upgrade?.buff?.description || sigilItems.get(weapon.sigil2Id)!.description || ''}
                          icon={sigilItems.get(weapon.sigil2Id)!.icon}
                          rarity={sigilItems.get(weapon.sigil2Id)!.rarity}
                          itemType={sigilItems.get(weapon.sigil2Id)!.type}
                        >
                          <img src={sigilItems.get(weapon.sigil2Id)!.icon} alt="" className="w-3.5 h-3.5 rounded flex-shrink-0 cursor-help" />
                        </Tooltip>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Swap Indicator */}
            {gearSummary.weaponSet1.length > 0 && gearSummary.weaponSet2.length > 0 && (
              <div className="flex items-center justify-center px-1">
                <img
                  src="https://wiki.guildwars2.com/images/c/ce/Weapon_Swap_Button.png"
                  alt="Weapon Swap"
                  className="w-5 h-5 opacity-60"
                />
              </div>
            )}

            {/* Weapon Set 2 */}
            <div className="flex-1 space-y-1">
              {gearSummary.weaponSet2.map((weapon, idx) => (
                <div key={idx} className="flex items-center gap-1 text-[11px] text-slate-300">
                  <span className="truncate">{weapon.text.replace(' - ', '\n').split('\n')[0]}</span>
                  {(weapon.sigil1Id || weapon.sigil2Id) && (
                    <div className="flex gap-0.5 ml-auto flex-shrink-0">
                      {weapon.sigil1Id && sigilItems.get(weapon.sigil1Id) && (
                        <Tooltip
                          title={sigilItems.get(weapon.sigil1Id)!.name}
                          content={sigilItems.get(weapon.sigil1Id)!.details?.infix_upgrade?.buff?.description || sigilItems.get(weapon.sigil1Id)!.description || ''}
                          icon={sigilItems.get(weapon.sigil1Id)!.icon}
                          rarity={sigilItems.get(weapon.sigil1Id)!.rarity}
                          itemType={sigilItems.get(weapon.sigil1Id)!.type}
                        >
                          <img src={sigilItems.get(weapon.sigil1Id)!.icon} alt="" className="w-3.5 h-3.5 rounded flex-shrink-0 cursor-help" />
                        </Tooltip>
                      )}
                      {weapon.sigil2Id && sigilItems.get(weapon.sigil2Id) && (
                        <Tooltip
                          title={sigilItems.get(weapon.sigil2Id)!.name}
                          content={sigilItems.get(weapon.sigil2Id)!.details?.infix_upgrade?.buff?.description || sigilItems.get(weapon.sigil2Id)!.description || ''}
                          icon={sigilItems.get(weapon.sigil2Id)!.icon}
                          rarity={sigilItems.get(weapon.sigil2Id)!.rarity}
                          itemType={sigilItems.get(weapon.sigil2Id)!.type}
                        >
                          <img src={sigilItems.get(weapon.sigil2Id)!.icon} alt="" className="w-3.5 h-3.5 rounded flex-shrink-0 cursor-help" />
                        </Tooltip>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Armor and Trinkets in Two Columns */}
        {(gearSummary.armorPieces.length > 0 || gearSummary.trinkets.length > 0) && (
          <div className="grid grid-cols-2 gap-4">
            {/* Armor Column */}
            <div className="space-y-2">
              <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Armor</div>
              <div className="space-y-1">
                {gearSummary.armorPieces.map((piece, idx) => {
                  const slotIcons: Record<string, string> = {
                    'Helm': 'https://wiki.guildwars2.com/images/5/51/Mistforged_Triumphant_Hero%27s_Warhelm.png',
                    'Shoulders': 'https://wiki.guildwars2.com/images/1/10/Mistforged_Triumphant_Hero%27s_Pauldrons.png',
                    'Coat': 'https://wiki.guildwars2.com/images/5/59/Sublime_Mistforged_Triumphant_Hero%27s_Breastplate.png',
                    'Gloves': 'https://wiki.guildwars2.com/images/d/dd/Mistforged_Triumphant_Hero%27s_Gauntlets.png',
                    'Leggings': 'https://wiki.guildwars2.com/images/b/bc/Mistforged_Triumphant_Hero%27s_Legplates.png',
                    'Boots': 'https://wiki.guildwars2.com/images/7/7f/Mistforged_Triumphant_Hero%27s_Wargreaves.png',
                  };

                  return (
                    <div key={idx} className="flex items-center gap-1.5 text-[11px] text-slate-300">
                      <img src={slotIcons[piece.slot]} alt={piece.slot} title={piece.slot} className="w-4 h-4" />
                      <span className="text-slate-400">{piece.stat}</span>
                    </div>
                  );
                })}
              </div>

              {/* Rune at bottom of Armor column */}
              {runeItem && (
                <div className="pt-2 border-t border-slate-800/40">
                  <Tooltip
                    title={runeItem.name}
                    content={runeItem.description || ''}
                    icon={runeItem.icon}
                    bonuses={runeItem.details?.bonuses}
                    rarity={runeItem.rarity}
                    itemType={runeItem.type}
                  >
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-300 cursor-help hover:text-white transition-colors">
                      <img src={runeItem.icon} alt={runeItem.name} className="w-3.5 h-3.5 rounded flex-shrink-0" />
                      <span className="truncate">{runeItem.name.replace('Superior Rune of ', '')}</span>
                    </div>
                  </Tooltip>
                </div>
              )}
            </div>

            {/* Trinkets Column */}
            <div className="space-y-2">
              <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Trinkets</div>
              <div className="space-y-1">
                {gearSummary.trinkets.map((trinket, idx) => {
                  const slotIcons: Record<string, string> = {
                    'amulet': 'https://wiki.guildwars2.com/images/b/bb/Mist_Pendant.png',
                    'ring': 'https://wiki.guildwars2.com/images/0/04/Mist_Band_%28Infused%29.png',
                    'accessory': 'https://wiki.guildwars2.com/images/6/6a/Mist_Talisman.png',
                    'back': 'https://wiki.guildwars2.com/images/2/20/Warbringer.png',
                  };

                  const slotNames: Record<string, string> = {
                    'amulet': 'Amulet',
                    'ring': 'Ring',
                    'accessory': 'Accessory',
                    'back': 'Back',
                  };

                  return (
                    <div key={idx} className="flex items-center gap-1.5 text-[11px] text-slate-300">
                      <img src={slotIcons[trinket.slot]} alt={trinket.slot} title={slotNames[trinket.slot]} className="w-4 h-4" />
                      <span className="text-slate-400">{trinket.stat}</span>
                    </div>
                  );
                })}
              </div>

              {/* Relic at bottom of Trinkets column */}
              {relicItem && (
                <div className="pt-2 border-t border-slate-800/40">
                  <Tooltip
                    title={relicItem.name}
                    content={relicItem.description || ''}
                    icon={relicItem.icon}
                    bonuses={relicItem.details?.bonuses}
                    rarity={relicItem.rarity}
                    itemType={relicItem.type}
                  >
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-300 cursor-help hover:text-white transition-colors">
                      <img src={relicItem.icon} alt={relicItem.name} className="w-3.5 h-3.5 rounded flex-shrink-0" />
                      <span className="truncate">{relicItem.name.replace('Relic of the ', '')}</span>
                    </div>
                  </Tooltip>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
