import { useState, useEffect } from 'react';
import { useBuildStore } from '../store/buildStore';
import { gw2Api } from '../lib/gw2api';
import type { GW2Skill, GW2Specialization, GW2Trait, GW2Item } from '../types/gw2';
import Tooltip from './Tooltip';
import SkillPicker from './SkillPicker';
import { STAT_COMBOS, INFUSIONS, RUNE_IDS, RELIC_IDS, type StatCombo, type InfusionType } from '../types/gw2';

type SectionType = 'skills' | 'traits' | 'equipment';
type SkillSlot = 'heal' | 'utility1' | 'utility2' | 'utility3' | 'elite';

const SLOT_LABELS: Record<SkillSlot, string> = {
  heal: 'Heal',
  utility1: 'Utility 1',
  utility2: 'Utility 2',
  utility3: 'Utility 3',
  elite: 'Elite',
};

interface BuildEditorProps {
  activeSection: SectionType;
}

export default function BuildEditor({ activeSection }: BuildEditorProps) {
  if (activeSection === 'equipment') {
    return (
      <div className="rounded-[32px] border border-slate-800/80 bg-gradient-to-b from-slate-900/70 via-slate-950/70 to-slate-950/90 p-4 shadow-[0_30px_70px_-30px_rgba(15,23,42,0.9)]">
        <div className="mb-4">
          <p className="text-[10px] uppercase tracking-[0.4em] text-slate-500">Loadout</p>
          <h2 className="mt-1 text-lg font-semibold text-white">Equipment</h2>
        </div>
        <div>
          <EquipmentPanelContent />
        </div>
      </div>
    );
  }

  // Show Skills & Traits together in a wider, more horizontal layout
  return (
    <div className="rounded-[32px] border border-slate-800/80 bg-gradient-to-b from-slate-900/70 via-slate-950/70 to-slate-950/90 p-4 shadow-[0_30px_70px_-30px_rgba(15,23,42,0.9)]">
      {/* Skills Section */}
      <div className="mb-3">
        <p className="text-[10px] uppercase tracking-[0.4em] text-slate-500">Utility Bar</p>
        <h2 className="mt-1 text-lg font-semibold text-white">Skills</h2>
      </div>
      <div className="mb-4">
        <SkillBarContent />
      </div>

      {/* Traits Section */}
      <div className="mb-2 border-t border-slate-800/50 pt-3">
        <p className="text-[10px] uppercase tracking-[0.4em] text-slate-500">Specializations</p>
        <h2 className="mt-1 text-lg font-semibold text-white">Traits</h2>
      </div>
      <div>
        <TraitPanelContent />
      </div>
    </div>
  );
}

// Skill Bar Content (without wrapper)
function SkillBarContent() {
  const { profession, skills, traits, setSkill } = useBuildStore();
  const [availableSkills, setAvailableSkills] = useState<GW2Skill[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSkills();
  }, [profession]);

  const loadSkills = async () => {
    setLoading(true);
    try {
      const allSkills = await gw2Api.getSkills(profession);
      // Filter out racial skills - they have multiple professions (8 base professions)
      // Regular profession skills only have 1 profession in the array
      // Also filter out skill flips/transforms - they don't have a slot field
      const filteredSkills = allSkills.filter(skill =>
        skill.professions.length === 1 && skill.slot
      );

      // Deduplicate skills by NAME (not ID) to handle PvE/PvP versions
      // Keep the first occurrence of each skill name
      const uniqueSkills = Array.from(
        new Map(filteredSkills.map(skill => [skill.name, skill])).values()
      );

      setAvailableSkills(uniqueSkills);
    } catch (error) {
      console.error('Failed to load skills:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSkillsForSlot = (slotType: string): GW2Skill[] => {
    // Get selected elite specializations
    const selectedEliteSpecs = [traits.spec1, traits.spec2, traits.spec3]
      .filter((id): id is number => typeof id === 'number');

    const filteredSkills = availableSkills.filter((skill) => {
      if (skill.slot?.toLowerCase() !== slotType.toLowerCase()) return false;

      // For Elite slot, show ALL elites (core + elite spec)
      // Since availableSkills is already filtered by profession, this is safe
      if (slotType === 'Elite') {
        return true;
      }

      // For other slots, filter by specialization
      if (skill.specialization) {
        return selectedEliteSpecs.includes(skill.specialization);
      }

      // Core skills (no specialization) are always available
      return true;
    });

    return filteredSkills;
  };

  const renderSkillSlot = (slot: SkillSlot) => {
    const slotType = slot === 'heal' ? 'Heal' : slot === 'elite' ? 'Elite' : 'Utility';
    const skillsForSlot = getSkillsForSlot(slotType);
    const selectedSkillId = skills[slot];
    const selectedSkill = availableSkills.find((skill) => skill.id === selectedSkillId);

    return (
      <div key={slot} className="flex flex-col items-center gap-2">
        <span className="text-[10px] uppercase tracking-[0.3em] text-slate-500">{SLOT_LABELS[slot]}</span>
        {selectedSkill ? (
          <Tooltip title={selectedSkill.name} content={selectedSkill.description || ''} icon={selectedSkill.icon}>
            <div>
              <SkillPicker
                skills={skillsForSlot}
                selectedSkillId={selectedSkillId}
                onSelect={(skillId) => setSkill(slot, skillId)}
                slotLabel={SLOT_LABELS[slot]}
                selectedSkill={selectedSkill}
              />
            </div>
          </Tooltip>
        ) : (
          <SkillPicker
            skills={skillsForSlot}
            selectedSkillId={selectedSkillId}
            onSelect={(skillId) => setSkill(slot, skillId)}
            slotLabel={SLOT_LABELS[slot]}
            selectedSkill={undefined}
          />
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex gap-4">
        {[...Array(5)].map((_, index) => (
          <div key={index} className="h-32 flex-1 rounded-2xl bg-slate-800/60" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-4">
      {renderSkillSlot('heal')}
      {renderSkillSlot('utility1')}
      {renderSkillSlot('utility2')}
      {renderSkillSlot('utility3')}
      {renderSkillSlot('elite')}
    </div>
  );
}

// Trait Panel Content (without wrapper)
function TraitPanelContent() {
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

  const renderSpecSlot = (slotNum: 1 | 2 | 3) => {
    const specIdKey = `spec${slotNum}` as const;
    const choicesKey = `spec${slotNum}Choices` as const;
    const selectedSpecId = traits[specIdKey];
    const selectedChoices = traits[choicesKey] || [null, null, null];

    const otherSelectedSpecs = [1, 2, 3]
      .filter(slot => slot !== slotNum)
      .map(slot => traits[`spec${slot}` as keyof typeof traits])
      .filter((id): id is number => typeof id === 'number');

    // Check if an elite spec is already selected in another slot
    const hasEliteSpecElsewhere = otherSelectedSpecs.some(specId => {
      const spec = specs.find(s => s.id === specId);
      return spec?.elite;
    });

    // Filter specs: exclude already selected ones, and if elite is selected elsewhere, exclude elite specs
    const availableSpecs = specs.filter(spec => {
      if (otherSelectedSpecs.includes(spec.id)) return false;
      if (hasEliteSpecElsewhere && spec.elite) return false;
      return true;
    });

    return (
      <div key={slotNum} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3">
        <div className="flex flex-col gap-2">
          <label className="text-[10px] uppercase tracking-[0.35em] text-slate-500">
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
            <option value="">Select spec</option>
            {availableSpecs.map((spec) => (
              <option key={spec.id} value={spec.id}>
                {spec.name} {spec.elite ? '(E)' : ''}
              </option>
            ))}
          </select>
        </div>

        {selectedSpecId && (
          <div className="mt-3">
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
      <div className="space-y-3">
        {[...Array(3)].map((_, index) => (
          <div key={index} className="h-32 rounded-2xl bg-slate-800/60" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
      {renderSpecSlot(1)}
      {renderSpecSlot(2)}
      {renderSpecSlot(3)}
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
    return <div className="text-sm text-slate-400">Loading traits...</div>;
  }

  if (!spec) return null;

  const majorTraits = traits.filter(t => spec.major_traits.includes(t.id));
  const traitsByTier = [1, 2, 3].map(tier => {
    const tierTraits = majorTraits.filter(t => t.tier === tier);
    return tierTraits.sort((a, b) => a.order - b.order);
  });

  const traitRows = [0, 1, 2].map(position => {
    return traitsByTier.map(tierTraits => tierTraits[position]).filter(Boolean);
  });

  return (
    <div className="space-y-2">
      {traitRows.map((rowTraits, rowIndex) => (
        <div key={rowIndex} className="flex justify-center gap-3">
          {rowTraits.map((trait, colIndex) => {
            if (!trait) return <div key={colIndex} />;

            const tierIndex = colIndex;
            const isSelected = selectedChoices[tierIndex] === trait.id;

            return (
              <Tooltip key={trait.id} title={trait.name} content={trait.description} icon={trait.icon}>
                <button
                  onClick={() => onTraitSelect(tierIndex as 0 | 1 | 2, trait.id)}
                  className={`group relative flex h-12 w-12 items-center justify-center rounded-xl border-2 transition ${
                    isSelected
                      ? 'border-yellow-400 bg-yellow-400/15'
                      : 'border-slate-800 bg-slate-900/60 hover:border-slate-600 hover:bg-slate-900'
                  }`}
                >
                  <div className="h-10 w-10 overflow-hidden rounded-lg border border-slate-700 bg-slate-900">
                    <img src={trait.icon} alt={trait.name} className="h-full w-full object-cover" />
                  </div>
                  {isSelected && (
                    <div className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-yellow-300 text-[9px] font-bold text-slate-900">
                      ✓
                    </div>
                  )}
                </button>
              </Tooltip>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// Equipment Panel Content (without wrapper)
function EquipmentPanelContent() {
  const { equipment, updateEquipment, applyStatToCategory, applyInfusionToCategory, runeId, setRuneId, relicId, setRelicId } = useBuildStore();
  const [bulkStat, setBulkStat] = useState<StatCombo>('Berserker');
  const [bulkInfusion, setBulkInfusion] = useState<InfusionType>('Mighty');
  const [runes, setRunes] = useState<GW2Item[]>([]);
  const [relics, setRelics] = useState<GW2Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [armorExpanded, setArmorExpanded] = useState(false);
  const [trinketsExpanded, setTrinketsExpanded] = useState(false);

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    setLoading(true);
    try {
      // Fetch all runes and relics using static ID lists
      const [runeItems, relicItems] = await Promise.all([
        gw2Api.getItems(RUNE_IDS),
        gw2Api.getItems(RELIC_IDS)
      ]);

      // Sort by name for better UX
      const sortedRunes = runeItems.sort((a, b) => a.name.localeCompare(b.name));
      const sortedRelics = relicItems.sort((a, b) => a.name.localeCompare(b.name));

      setRunes(sortedRunes);
      setRelics(sortedRelics);
      console.log(`Loaded ${sortedRunes.length} runes and ${sortedRelics.length} relics`);
    } catch (error) {
      console.error('Failed to load runes/relics:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedRune = runes.find(r => r.id === runeId);
  const selectedRelic = relics.find(r => r.id === relicId);

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
    <div key={item.slot} className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
      <div className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-500">{item.slot}</div>
      <select
        value={item.stat}
        onChange={(event) => updateEquipment(item.slot, { stat: event.target.value as StatCombo })}
        className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950/70 px-2 py-1.5 text-xs text-slate-200 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
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
        className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950/70 px-2 py-1.5 text-xs text-slate-200 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
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
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-400">Bulk apply</h3>

        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-slate-500">Stats</p>
            <select
              value={bulkStat}
              onChange={(event) => setBulkStat(event.target.value as StatCombo)}
              className="w-full rounded-lg border border-slate-800 bg-slate-950/70 px-2 py-1.5 text-xs text-slate-200 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            >
              {STAT_COMBOS.map((stat) => (
                <option key={stat} value={stat}>
                  {stat}
                </option>
              ))}
            </select>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => applyStatToCategory('armor', bulkStat)}
                className="rounded-lg border border-slate-700 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-200 transition hover:border-slate-500"
              >
                Armor
              </button>
              <button
                onClick={() => applyStatToCategory('trinkets', bulkStat)}
                className="rounded-lg border border-slate-700 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-200 transition hover:border-slate-500"
              >
                Trinkets
              </button>
              <button
                onClick={() => applyStatToCategory('weapons', bulkStat)}
                className="rounded-lg border border-slate-700 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-200 transition hover:border-slate-500"
              >
                Weapons
              </button>
              <button
                onClick={() => applyStatToCategory('all', bulkStat)}
                className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-200 transition hover:border-emerald-400 hover:bg-emerald-500/20"
              >
                All
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-slate-500">Infusions</p>
            <select
              value={bulkInfusion}
              onChange={(event) => setBulkInfusion(event.target.value as InfusionType)}
              className="w-full rounded-lg border border-slate-800 bg-slate-950/70 px-2 py-1.5 text-xs text-slate-200 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            >
              {INFUSIONS.map((inf) => (
                <option key={inf} value={inf}>
                  {inf}
                </option>
              ))}
            </select>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => applyInfusionToCategory('armor', bulkInfusion)}
                className="rounded-lg border border-slate-700 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-200 transition hover:border-slate-500"
              >
                Armor
              </button>
              <button
                onClick={() => applyInfusionToCategory('trinkets', bulkInfusion)}
                className="rounded-lg border border-slate-700 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-200 transition hover:border-slate-500"
              >
                Trinkets
              </button>
              <button
                onClick={() => applyInfusionToCategory('weapons', bulkInfusion)}
                className="rounded-lg border border-slate-700 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-200 transition hover:border-slate-500"
              >
                Weapons
              </button>
              <button
                onClick={() => applyInfusionToCategory('all', bulkInfusion)}
                className="rounded-lg border border-indigo-500/40 bg-indigo-500/10 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-200 transition hover:border-indigo-400 hover:bg-indigo-500/20"
              >
                All
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Runes and Relic */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-400">Upgrades</h3>

        {loading && (
          <div className="mt-3 text-center text-xs text-slate-400">
            Loading all runes and relics from API... This may take a minute on first load.
          </div>
        )}

        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {/* Runes */}
          <div className="space-y-2">
            <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-slate-500">Runes (6x)</p>
            <div className="flex gap-2">
              <select
                value={runeId || ''}
                onChange={(event) => setRuneId(event.target.value ? parseInt(event.target.value) : undefined)}
                className="flex-1 rounded-lg border border-slate-800 bg-slate-950/70 px-2 py-1.5 text-xs text-slate-200 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                disabled={loading}
              >
                <option value="">Select Rune</option>
                {runes.map((rune) => (
                  <option key={rune.id} value={rune.id}>
                    {rune.name.replace('Superior Rune of the ', '').replace('Superior Rune of ', '')}
                  </option>
                ))}
              </select>
              {selectedRune && (
                <Tooltip
                  title={selectedRune.name}
                  content={selectedRune.description || ''}
                  icon={selectedRune.icon}
                  bonuses={selectedRune.details?.bonuses}
                  rarity={selectedRune.rarity}
                  itemType={selectedRune.details?.type || 'Upgrade Component'}
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-yellow-400 bg-slate-900">
                    <img src={selectedRune.icon} alt={selectedRune.name} className="h-6 w-6 rounded" />
                  </div>
                </Tooltip>
              )}
            </div>
          </div>

          {/* Relic */}
          <div className="space-y-2">
            <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-slate-500">Relic</p>
            <div className="flex gap-2">
              <select
                value={relicId || ''}
                onChange={(event) => setRelicId(event.target.value ? parseInt(event.target.value) : undefined)}
                className="flex-1 rounded-lg border border-slate-800 bg-slate-950/70 px-2 py-1.5 text-xs text-slate-200 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                disabled={loading}
              >
                <option value="">Select Relic</option>
                {relics.map((relic) => (
                  <option key={relic.id} value={relic.id}>
                    {relic.name.replace('Relic of the ', '').replace('Relic of ', '')}
                  </option>
                ))}
              </select>
              {selectedRelic && (
                <Tooltip
                  title={selectedRelic.name}
                  content={selectedRelic.description || ''}
                  icon={selectedRelic.icon}
                  bonuses={selectedRelic.details?.bonuses}
                  rarity={selectedRelic.rarity}
                  itemType="Relic"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-yellow-400 bg-slate-900">
                    <img src={selectedRelic.icon} alt={selectedRelic.name} className="h-6 w-6 rounded" />
                  </div>
                </Tooltip>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Weapons */}
      <div>
        <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-400">Weapons</h3>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {weaponItems.map(renderEquipmentSlot)}
        </div>
      </div>

      {/* Armor - Collapsible */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
        <button
          onClick={() => setArmorExpanded(!armorExpanded)}
          className="w-full px-3 py-2 flex items-center justify-between text-left hover:bg-slate-800/40 transition"
        >
          <h3 className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-400">Armor</h3>
          <span className="text-slate-400 text-sm">{armorExpanded ? '−' : '+'}</span>
        </button>
        {armorExpanded && (
          <div className="p-3 pt-0">
            <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
              {armorItems.map(renderEquipmentSlot)}
            </div>
          </div>
        )}
      </div>

      {/* Trinkets - Collapsible */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
        <button
          onClick={() => setTrinketsExpanded(!trinketsExpanded)}
          className="w-full px-3 py-2 flex items-center justify-between text-left hover:bg-slate-800/40 transition"
        >
          <h3 className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-400">Trinkets</h3>
          <span className="text-slate-400 text-sm">{trinketsExpanded ? '−' : '+'}</span>
        </button>
        {trinketsExpanded && (
          <div className="p-3 pt-0">
            <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
              {trinketItems.map(renderEquipmentSlot)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
