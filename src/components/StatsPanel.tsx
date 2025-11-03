import { useMemo } from 'react';
import { useBuildStore } from '../store/buildStore';
import type { StatCombo } from '../types/gw2';

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

const STAT_ATTRIBUTE_MAP: Record<StatCombo, Partial<Record<AttributeKey, number>>> = {
  Berserker: { Power: 115, Precision: 85, Ferocity: 85 },
  Assassin: { Power: 85, Precision: 115, Ferocity: 85 },
  Marauder: { Power: 100, Precision: 85, Vitality: 85, Ferocity: 70 },
  Viper: { Power: 90, Precision: 75, ConditionDamage: 115, Expertise: 75 },
  Sinister: { Power: 90, Precision: 90, ConditionDamage: 115 },
  Celestial: {
    Power: 55,
    Precision: 55,
    Toughness: 55,
    Vitality: 55,
    ConditionDamage: 55,
    HealingPower: 55,
    Expertise: 55,
    BoonDuration: 55,
    Ferocity: 40,
  },
  Diviner: { Power: 100, Precision: 75, Ferocity: 70, BoonDuration: 75 },
  Harrier: { Power: 90, HealingPower: 115, BoonDuration: 90 },
  Minstrel: { Toughness: 115, Vitality: 90, HealingPower: 90, BoonDuration: 75 },
  Magi: { HealingPower: 115, Precision: 90, Vitality: 90 },
  Soldier: { Power: 100, Toughness: 100, Vitality: 100 },
  Cavalier: { Power: 90, Toughness: 115, Ferocity: 85 },
  Nomad: { Toughness: 115, Vitality: 115, HealingPower: 70 },
  Trailblazer: { ConditionDamage: 110, Toughness: 95, Vitality: 95, Expertise: 80 },
  Seraph: { Precision: 100, ConditionDamage: 90, HealingPower: 75, BoonDuration: 75 },
  Commander: { Power: 95, Precision: 80, Toughness: 80, BoonDuration: 80 },
  Vigilant: { Power: 95, Toughness: 95, BoonDuration: 80 },
  Crusader: { Power: 95, Toughness: 95, HealingPower: 80 },
  Marshal: { Power: 95, ConditionDamage: 95, HealingPower: 85, Precision: 70 },
  Grieving: { Power: 100, ConditionDamage: 105, Precision: 75, Ferocity: 70 },
  Plaguedoctor: { ConditionDamage: 95, Vitality: 95, HealingPower: 95, Expertise: 70 },
  Giver: { Toughness: 95, HealingPower: 90, BoonDuration: 90 },
  Dragon: { Power: 110, Precision: 100, Ferocity: 80, Vitality: 70 },
  Ritualist: { ConditionDamage: 95, Expertise: 95, Vitality: 80, BoonDuration: 80 },
  Demolisher: { Power: 105, Precision: 95, Ferocity: 95, Toughness: 70 },
};

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
  { key: 'BoonDuration', label: 'Boon Duration', accent: 'bg-lime-400' },
];

const formatNumber = (value: number) => Math.round(value).toLocaleString();

export default function StatsPanel() {
  const { equipment } = useBuildStore();

  const totals = useMemo(() => {
    return equipment.reduce<Record<AttributeKey, number>>((acc, item) => {
      const contributions = STAT_ATTRIBUTE_MAP[item.stat as StatCombo];
      if (!contributions) return acc;

      Object.entries(contributions).forEach(([key, value]) => {
        const attribute = key as AttributeKey;
        acc[attribute] += value ?? 0;
      });

      return acc;
    }, { ...BASE_ATTRIBUTES });
  }, [equipment]);

  const maxValue = useMemo(() => {
    return ATTRIBUTES.reduce((max, attribute) => Math.max(max, totals[attribute.key]), 0);
  }, [totals]);

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
            </div>
          );
        })}
      </div>
    </aside>
  );
}
