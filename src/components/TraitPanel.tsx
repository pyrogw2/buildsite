import { useState, useEffect } from 'react';
import { useBuildStore } from '../store/buildStore';
import { gw2Api } from '../lib/gw2api';
import type { GW2Specialization, GW2Trait } from '../types/gw2';

export default function TraitPanel() {
  const { profession, traits, setSpecialization, setTrait } = useBuildStore();
  const [specs, setSpecs] = useState<GW2Specialization[]>([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Specializations & Traits</h2>
        <div className="text-gray-400">Loading specializations...</div>
      </div>
    );
  }

  const renderSpecSlot = (slotNum: 1 | 2 | 3) => {
    const specIdKey = `spec${slotNum}` as const;
    const choicesKey = `spec${slotNum}Choices` as const;
    const selectedSpecId = traits[specIdKey];
    const selectedChoices = traits[choicesKey] || [null, null, null];

    return (
      <div key={slotNum} className="bg-gray-700 rounded-lg p-2">
        <div className="mb-2">
          <label className="text-xs text-gray-300 mb-1 block">
            Specialization {slotNum}
          </label>
          <select
            value={selectedSpecId || ''}
            onChange={(e) => {
              const specId = e.target.value ? parseInt(e.target.value) : 0;
              if (specId) setSpecialization(slotNum, specId);
            }}
            className="w-full bg-gray-600 text-white rounded px-2 py-1 text-xs"
          >
            <option value="">Select Specialization</option>
            {specs.map(spec => (
              <option key={spec.id} value={spec.id}>
                {spec.name} {spec.elite ? '(Elite)' : ''}
              </option>
            ))}
          </select>
        </div>

        {selectedSpecId && (
          <TraitSelector
            specId={selectedSpecId}
            selectedChoices={selectedChoices}
            onTraitSelect={(tier, traitId) => setTrait(slotNum, tier, traitId)}
          />
        )}
      </div>
    );
  };

  return (
    <div className="bg-gray-800 rounded-lg p-3">
      <h2 className="text-sm font-semibold mb-2">Specializations & Traits</h2>
      <div className="space-y-2">
        {renderSpecSlot(1)}
        {renderSpecSlot(2)}
        {renderSpecSlot(3)}
      </div>
    </div>
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
    return <div className="text-sm text-gray-400">Loading traits...</div>;
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
    <div className="space-y-1">
      {/* Header row */}
      <div className="grid grid-cols-3 gap-1.5 mb-0.5">
        {TIER_LABELS.map((label, idx) => (
          <div key={idx} className="text-xs text-gray-400 font-medium text-center">
            {label}
          </div>
        ))}
      </div>

      {/* Each position (top/mid/bot) as a row */}
      {traitRows.map((rowTraits, rowIndex) => (
        <div key={rowIndex} className="grid grid-cols-3 gap-1.5">
          {rowTraits.map((trait, colIndex) => {
            if (!trait) return <div key={colIndex} />;

            const tierIndex = colIndex; // tier 0, 1, 2 maps to array index
            const isSelected = selectedChoices[tierIndex] === trait.id;

            return (
              <button
                key={trait.id}
                onClick={() => onTraitSelect(tierIndex as 0 | 1 | 2, trait.id)}
                className={`
                  flex items-start gap-1.5 p-1.5 rounded border-2 transition-all text-left
                  ${isSelected
                    ? 'border-yellow-400 bg-yellow-400/20'
                    : 'border-gray-600 bg-gray-700/50 hover:border-gray-500 hover:bg-gray-700'
                  }
                `}
              >
                {/* Trait Icon */}
                <div className="relative flex-shrink-0">
                  <div className="w-8 h-8 rounded overflow-hidden bg-gray-800">
                    <img
                      src={trait.icon}
                      alt={trait.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {isSelected && (
                    <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-yellow-400 rounded-full flex items-center justify-center">
                      <span className="text-xs text-black font-bold leading-none">✓</span>
                    </div>
                  )}
                </div>

                {/* Trait Info */}
                <div className="flex-1 min-w-0">
                  <div className={`font-semibold text-xs leading-tight ${isSelected ? 'text-yellow-400' : 'text-gray-200'}`}>
                    {trait.name}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5 line-clamp-2 leading-tight">
                    {trait.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
