import { useState, useEffect } from 'react';
import { useBuildStore } from '../store/buildStore';
import { gw2Api } from '../lib/gw2api';
import type { GW2Specialization, GW2Trait } from '../types/gw2';
import Tooltip from './Tooltip';
import { stripGW2Markup } from '../lib/textParser';

export default function TraitPanel() {
  const { profession, traits, setSpecialization, setTrait } = useBuildStore();
  const [specs, setSpecs] = useState<GW2Specialization[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    loadSpecializations();
  }, [profession]);

  const loadSpecializations = async () => {
    setLoading(true);
    try {
      const allSpecs = await gw2Api.getSpecializations(profession);
      setSpecs(allSpecs);
    } catch (error) {
      console.error('Failed to load specializations:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderSpecSlot = (slotNum: 1 | 2 | 3) => {
    const specIdKey = `spec${slotNum}` as const;
    const choicesKey = `spec${slotNum}Choices` as const;
    const selectedSpecId = traits[specIdKey];
    const selectedChoices = traits[choicesKey] || [null, null, null];

    // Get all selected specializations from other slots
    const otherSelectedSpecs = [1, 2, 3]
      .filter(slot => slot !== slotNum)
      .map(slot => traits[`spec${slot}` as keyof typeof traits])
      .filter((id): id is number => typeof id === 'number');

    // Filter out already selected specializations
    const availableSpecs = specs.filter(
      spec => !otherSelectedSpecs.includes(spec.id)
    );

    return (
      <div key={slotNum} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <div className="flex flex-col gap-2">
          <label className="text-[11px] uppercase tracking-[0.35em] text-slate-500">
            Line {slotNum}
          </label>
          <select
            value={selectedSpecId || ''}
            onChange={(event) => {
              const specId = event.target.value ? parseInt(event.target.value, 10) : 0;
              if (specId) setSpecialization(slotNum, specId);
            }}
            className="rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-xs font-medium text-slate-200 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500"
          >
            <option value="">Select specialization</option>
            {availableSpecs.map((spec) => (
              <option key={spec.id} value={spec.id}>
                {spec.name} {spec.elite ? '(Elite)' : ''}
              </option>
            ))}
          </select>
        </div>

        {selectedSpecId && (
          <div className="mt-4">
            <TraitSelector
              specId={selectedSpecId}
              selectedChoices={selectedChoices}
              onTraitSelect={(tier, traitId) => setTrait(slotNum, tier, traitId)}
            />
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <section className="rounded-3xl border border-slate-800/80 bg-slate-900/70 p-6 shadow-[0_18px_50px_-28px_rgba(14,22,40,1)]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.35em] text-slate-500">Specializations</p>
            <h2 className="mt-2 text-lg font-semibold text-white">Traits</h2>
          </div>
          <span className="text-xs text-slate-500">Loading…</span>
        </div>
        <div className="mt-6 space-y-3">
          {[...Array(3)].map((_, index) => (
            <div key={index} className="h-32 rounded-2xl bg-slate-800/60" />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-slate-800/80 bg-slate-900/70 p-6 shadow-[0_18px_50px_-28px_rgba(14,22,40,1)]">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full items-center justify-between"
      >
        <div>
          <p className="text-[11px] uppercase tracking-[0.35em] text-slate-500">Specializations</p>
          <h2 className="mt-2 text-lg font-semibold text-white">Traits</h2>
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
        <div className="mt-6 space-y-3">
          {renderSpecSlot(1)}
          {renderSpecSlot(2)}
          {renderSpecSlot(3)}
        </div>
      )}
    </section>
  );
}

interface TraitSelectorProps {
  specId: number;
  selectedChoices: [number | null, number | null, number | null];
  onTraitSelect: (tier: 0 | 1 | 2, traitId: number | null) => void;
}

function TraitSelector({ specId, selectedChoices, onTraitSelect }: TraitSelectorProps) {
  const [traits, setTraits] = useState<GW2Trait[]>([]);
  const [spec, setSpec] = useState<GW2Specialization | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTraits();
  }, [specId]);

  const loadTraits = async () => {
    setLoading(true);
    try {
      const [specData, traitsData] = await Promise.all([
        gw2Api.getSpecialization(specId),
        gw2Api.getTraits(specId)
      ]);
      setSpec(specData);
      setTraits(traitsData);
    } catch (error) {
      console.error('Failed to load traits:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-sm text-slate-400">Loading traits...</div>;
  }

  if (!spec) return null;

  const majorTraits = traits.filter(t => spec.major_traits.includes(t.id));

  // Group by tier, then sort by order within each tier
  const traitsByTier = [1, 2, 3].map(tier => {
    const tierTraits = majorTraits.filter(t => t.tier === tier);
    // Sort by order: 0=top, 1=mid, 2=bot
    return tierTraits.sort((a, b) => a.order - b.order);
  });

  // Reorganize into rows (by position/order) instead of columns (by tier)
  const traitRows = [0, 1, 2].map(position => {
    return traitsByTier.map(tierTraits => tierTraits[position]).filter(Boolean);
  });

  const TIER_LABELS = ['Adept', 'Master', 'Grandmaster'];

  return (
    <div className="space-y-2">
      <div className="mb-1 grid grid-cols-3 gap-2">
        {TIER_LABELS.map((label, idx) => (
          <div key={idx} className="rounded-xl bg-slate-900/70 py-2 text-center text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-400">
            {label}
          </div>
        ))}
      </div>

      {traitRows.map((rowTraits, rowIndex) => (
        <div key={rowIndex} className="grid grid-cols-3 gap-2">
          {rowTraits.map((trait, colIndex) => {
            if (!trait) return <div key={colIndex} />;

            const tierIndex = colIndex;
            const isSelected = selectedChoices[tierIndex] === trait.id;

            return (
              <Tooltip key={trait.id} title={trait.name} content={trait.description} icon={trait.icon}>
                <button
                  onClick={() => onTraitSelect(tierIndex as 0 | 1 | 2, trait.id)}
                  className={`flex w-full items-start gap-2 rounded-2xl border-2 px-2 py-2 text-left transition ${
                    isSelected
                      ? 'border-yellow-400 bg-yellow-400/15 text-yellow-200 shadow-[0_14px_30px_-20px_rgba(250,204,21,1)]'
                      : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-600 hover:bg-slate-900'
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    <div className="h-10 w-10 overflow-hidden rounded-xl border border-slate-700 bg-slate-900">
                      <img src={trait.icon} alt={trait.name} className="h-full w-full object-cover" />
                    </div>
                    {isSelected && (
                      <div className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-yellow-300 text-[10px] font-bold text-slate-900">
                        ✓
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className={`text-xs font-semibold leading-tight ${isSelected ? 'text-yellow-200' : 'text-slate-100'}`}>
                      {trait.name}
                    </div>
                    <div className="mt-1 text-[11px] leading-snug text-slate-400">
                      {stripGW2Markup(trait.description)}
                    </div>
                  </div>
                </button>
              </Tooltip>
            );
          })}
        </div>
      ))}
    </div>
  );
}
