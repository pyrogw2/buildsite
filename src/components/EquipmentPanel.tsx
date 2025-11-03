import { useState } from 'react';
import { useBuildStore } from '../store/buildStore';
import { STAT_COMBOS, INFUSIONS, type StatCombo, type InfusionType } from '../types/gw2';

export default function EquipmentPanel() {
  const { equipment, updateEquipment, applyStatToCategory, applyInfusionToCategory } = useBuildStore();
  const [bulkStat, setBulkStat] = useState<StatCombo>('Berserker');
  const [bulkInfusion, setBulkInfusion] = useState<InfusionType>('Mighty +9 Agony');
  const [expanded, setExpanded] = useState(true);

  const armorItems = equipment.filter(e =>
    ['Helm', 'Shoulders', 'Coat', 'Gloves', 'Leggings', 'Boots'].includes(e.slot)
  );
  const trinketItems = equipment.filter(e =>
    ['Backpack', 'Accessory1', 'Accessory2', 'Amulet', 'Ring1', 'Ring2'].includes(e.slot)
  );
  const weaponItems = equipment.filter(e =>
    ['MainHand1', 'OffHand1', 'MainHand2', 'OffHand2'].includes(e.slot)
  );

  const renderEquipmentSlot = (item: typeof equipment[0]) => (
    <div key={item.slot} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">{item.slot}</div>
      <select
        value={item.stat}
        onChange={(event) => updateEquipment(item.slot, { stat: event.target.value as StatCombo })}
        className="mt-3 w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-200 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500"
      >
        {STAT_COMBOS.map((stat) => (
          <option key={stat} value={stat}>
            {stat}
          </option>
        ))}
      </select>
      <select
        value={item.infusion1 || ''}
        onChange={(event) =>
          updateEquipment(item.slot, {
            infusion1: event.target.value ? (event.target.value as InfusionType) : undefined,
          })
        }
        className="mt-3 w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-200 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500"
      >
        <option value="">No Infusion</option>
        {INFUSIONS.map((inf) => (
          <option key={inf} value={inf}>
            {inf}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <section className="rounded-3xl border border-slate-800/80 bg-slate-900/70 p-6 shadow-[0_18px_50px_-28px_rgba(14,22,40,1)]">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full items-center justify-between"
      >
        <div>
          <p className="text-[11px] uppercase tracking-[0.35em] text-slate-500">Loadout</p>
          <h2 className="mt-2 text-lg font-semibold text-white">Equipment</h2>
        </div>
        <span className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-800 text-slate-400">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className={`h-4 w-4 transition-transform ${expanded ? '' : '-rotate-90'}`}
          >
            <path d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </span>
      </button>

      {expanded && (
        <div className="mt-6 space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Bulk apply</h3>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <p className="text-xs font-medium uppercase tracking-[0.25em] text-slate-500">Stats</p>
                <div className="flex flex-wrap gap-2">
                  <select
                    value={bulkStat}
                    onChange={(event) => setBulkStat(event.target.value as StatCombo)}
                    className="w-full min-w-[160px] flex-1 rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-200 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500"
                  >
                    {STAT_COMBOS.map((stat) => (
                      <option key={stat} value={stat}>
                        {stat}
                      </option>
                    ))}
                  </select>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => applyStatToCategory('armor', bulkStat)}
                      className="rounded-xl border border-slate-700 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200 transition hover:border-slate-500"
                    >
                      Armor
                    </button>
                    <button
                      onClick={() => applyStatToCategory('trinkets', bulkStat)}
                      className="rounded-xl border border-slate-700 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200 transition hover:border-slate-500"
                    >
                      Trinkets
                    </button>
                    <button
                      onClick={() => applyStatToCategory('weapons', bulkStat)}
                      className="rounded-xl border border-slate-700 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200 transition hover:border-slate-500"
                    >
                      Weapons
                    </button>
                    <button
                      onClick={() => applyStatToCategory('all', bulkStat)}
                      className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200 transition hover:border-emerald-400 hover:bg-emerald-500/20"
                    >
                      All
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-medium uppercase tracking-[0.25em] text-slate-500">Infusions</p>
                <div className="flex flex-wrap gap-2">
                  <select
                    value={bulkInfusion}
                    onChange={(event) => setBulkInfusion(event.target.value as InfusionType)}
                    className="w-full min-w-[160px] flex-1 rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-200 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500"
                  >
                    {INFUSIONS.map((inf) => (
                      <option key={inf} value={inf}>
                        {inf}
                      </option>
                    ))}
                  </select>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => applyInfusionToCategory('armor', bulkInfusion)}
                      className="rounded-xl border border-slate-700 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200 transition hover:border-slate-500"
                    >
                      Armor
                    </button>
                    <button
                      onClick={() => applyInfusionToCategory('trinkets', bulkInfusion)}
                      className="rounded-xl border border-slate-700 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200 transition hover:border-slate-500"
                    >
                      Trinkets
                    </button>
                    <button
                      onClick={() => applyInfusionToCategory('weapons', bulkInfusion)}
                      className="rounded-xl border border-slate-700 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200 transition hover:border-slate-500"
                    >
                      Weapons
                    </button>
                    <button
                      onClick={() => applyInfusionToCategory('all', bulkInfusion)}
                      className="rounded-xl border border-indigo-500/40 bg-indigo-500/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-200 transition hover:border-indigo-400 hover:bg-indigo-500/20"
                    >
                      All
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Armor</h3>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {armorItems.map(renderEquipmentSlot)}
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Trinkets</h3>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {trinketItems.map(renderEquipmentSlot)}
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Weapons</h3>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {weaponItems.map(renderEquipmentSlot)}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
