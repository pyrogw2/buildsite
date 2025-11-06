import { useState, useEffect, useRef } from 'react';
import { useBuildStore } from '../store/buildStore';
import { gw2Api } from '../lib/gw2api';
import type {
  GW2SkillWithModes,
  GW2Specialization,
  GW2TraitWithModes,
  GW2Item,
} from '../types/gw2';
import Tooltip from './Tooltip';
import SkillPicker from './SkillPicker';
import SearchableDropdown from './SearchableDropdown';
import ItemIconBox from './ItemIconBox';
import { STAT_COMBOS, INFUSION_IDS, RUNE_IDS, RELIC_IDS, SIGIL_IDS, TWO_HANDED_WEAPONS, PROFESSION_WEAPONS, type StatCombo, type GameMode } from '../types/gw2';
import { resolveSkillMode, resolveTraitMode } from '../lib/modeUtils';

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

// Evoker specialization ID
const EVOKER_SPEC_ID = 80;

// Familiar skill IDs for Evoker with friendly names
const FAMILIAR_NAMES: Record<number, string> = {
  76585: 'Fox',        // Conflagration
  76811: 'Otter',      // Buoyant Deluge
  77089: 'Hare',       // Lightning Blitz
  76707: 'Toad',       // Seismic Impact
};

const EVOKER_FAMILIARS = [76585, 76811, 77089, 76707];

// Revenant elite spec IDs
const HERALD_SPEC_ID = 52;
const RENEGADE_SPEC_ID = 63;
const VINDICATOR_SPEC_ID = 69;
const CONDUIT_SPEC_ID = 79;

// Legend friendly names
const LEGEND_NAMES: Record<string, string> = {
  'Legend1': 'Glint',
  'Legend2': 'Shiro',
  'Legend3': 'Jalis',
  'Legend4': 'Mallyx',
  'Legend5': 'Kalla',
  'Legend6': 'Ventari',
  'Legend7': 'Alliance',
  'Legend8': 'Razah',
};

// Core legends (available to all Revenants)
const CORE_LEGENDS = ['Legend2', 'Legend3', 'Legend4', 'Legend6'];

// Elite spec exclusive legends
const ELITE_LEGENDS: Record<number, string> = {
  [HERALD_SPEC_ID]: 'Legend1',     // Glint
  [RENEGADE_SPEC_ID]: 'Legend5',   // Kalla
  [VINDICATOR_SPEC_ID]: 'Legend7', // Alliance
  [CONDUIT_SPEC_ID]: 'Legend8',    // Razah
};

// Amalgam specialization ID
const AMALGAM_SPEC_ID = 75;

// Morph skill IDs for Amalgam (F2-F4 slots)
const AMALGAM_MORPHS = [
  76798, // Defensive Protocol: Cleanse
  76959, // Defensive Protocol: Protect
  77163, // Defensive Protocol: Thorns
  76927, // Offensive Protocol: Demolish
  76806, // Offensive Protocol: Obliterate
  76815, // Offensive Protocol: Pierce
  77103, // Offensive Protocol: Shred
];

// Skill Bar Content (without wrapper)
function SkillBarContent() {
  const { profession, skills, traits, setSkill, gameMode, professionMechanics, setProfessionMechanic } = useBuildStore();
  const [availableSkills, setAvailableSkills] = useState<GW2SkillWithModes[]>([]);
  const [specs, setSpecs] = useState<GW2Specialization[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [legendPickerOpen, setLegendPickerOpen] = useState<'legend1' | 'legend2' | null>(null);
  const [morphPickerOpen, setMorphPickerOpen] = useState<'slot2' | 'slot3' | 'slot4' | null>(null);
  const [petPickerOpen, setPetPickerOpen] = useState<'pet1' | 'pet2' | null>(null);
  const [petSearchQuery, setPetSearchQuery] = useState('');
  const [legends, setLegends] = useState<any[]>([]);
  const [pets, setPets] = useState<any[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const legendDropdownRef = useRef<HTMLDivElement>(null);
  const legendButtonRef = useRef<HTMLButtonElement>(null);
  const morphDropdownRef = useRef<HTMLDivElement>(null);
  const morphButtonRef = useRef<HTMLButtonElement>(null);
  const petDropdownRef = useRef<HTMLDivElement>(null);
  const petButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (profession) {
      loadSkills();
      loadSpecs();
      if (profession === 'Revenant') {
        loadLegends();
      }
      if (profession === 'Engineer') {
        loadMorphSkills();
      }
      if (profession === 'Ranger') {
        loadPets();
      }
    }
  }, [profession]);

  const loadLegends = async () => {
    try {
      const base = import.meta.env.BASE_URL;
      const response = await fetch(`${base}data/legends.json`);
      const legendsData = await response.json();
      setLegends(legendsData);
    } catch (error) {
      console.error('Failed to load legends:', error);
    }
  };

  const loadMorphSkills = async () => {
    try {
      // Fetch morph skills directly from API since they're not in static data
      const morphSkillsPromises = AMALGAM_MORPHS.map(id =>
        fetch(`https://api.guildwars2.com/v2/skills/${id}`).then(r => r.json())
      );
      const morphSkills = await Promise.all(morphSkillsPromises);

      // Normalize and add to available skills
      const normalizedMorphs = morphSkills.map(skill => {
        const { description, facts, traited_facts, pve, pvp, wvw, ...rest } = skill;
        return {
          ...rest,
          modes: {
            default: { description, facts, traited_facts },
            pve: pve ? { description: pve.description || description, facts: pve.facts || facts, traited_facts: pve.traited_facts || traited_facts } : undefined,
            pvp: pvp ? { description: pvp.description || description, facts: pvp.facts || facts, traited_facts: pvp.traited_facts || traited_facts } : undefined,
            wvw: wvw ? { description: wvw.description || description, facts: wvw.facts || facts, traited_facts: wvw.traited_facts || traited_facts } : undefined,
          },
        };
      });

      // Add morph skills to available skills
      setAvailableSkills(prev => [...prev, ...normalizedMorphs]);
    } catch (error) {
      console.error('Failed to load morph skills:', error);
    }
  };

  const loadPets = async () => {
    try {
      const base = import.meta.env.BASE_URL;
      const response = await fetch(`${base}data/pets.json`);
      const petsData = await response.json();
      setPets(petsData);
    } catch (error) {
      console.error('Failed to load pets:', error);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsPickerOpen(false);
      }
      if (
        legendDropdownRef.current &&
        !legendDropdownRef.current.contains(event.target as Node) &&
        legendButtonRef.current &&
        !legendButtonRef.current.contains(event.target as Node)
      ) {
        setLegendPickerOpen(null);
      }
      if (
        morphDropdownRef.current &&
        !morphDropdownRef.current.contains(event.target as Node) &&
        morphButtonRef.current &&
        !morphButtonRef.current.contains(event.target as Node)
      ) {
        setMorphPickerOpen(null);
      }
      if (
        petDropdownRef.current &&
        !petDropdownRef.current.contains(event.target as Node) &&
        petButtonRef.current &&
        !petButtonRef.current.contains(event.target as Node)
      ) {
        setPetPickerOpen(null);
        setPetSearchQuery('');
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsPickerOpen(false);
        setLegendPickerOpen(null);
        setMorphPickerOpen(null);
        setPetPickerOpen(null);
        setPetSearchQuery('');
      }
    };

    if (isPickerOpen || legendPickerOpen || morphPickerOpen || petPickerOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isPickerOpen, legendPickerOpen, morphPickerOpen]);

  const loadSpecs = async () => {
    try {
      const allSpecs = await gw2Api.getSpecializations(profession!);
      setSpecs(allSpecs);
    } catch (error) {
      console.error('Failed to load specializations:', error);
    }
  };

  const loadSkills = async () => {
    setLoading(true);
    try {
      const allSkills = await gw2Api.getSkills(profession);


      // Filter out racial skills - they have multiple professions (8 base professions)
      // Regular profession skills only have 1 profession in the array
      // Also filter out skill flips/transforms - they don't have a slot field
      // Exception: Keep profession mechanic skills (familiars, morphs) even without slot field
      const filteredSkills = allSkills.filter(skill =>
        skill.professions.length === 1 && (skill.slot || AMALGAM_MORPHS.includes(skill.id) || EVOKER_FAMILIARS.includes(skill.id))
      );

      // Deduplicate skills by NAME + flip_skill combination to handle PvE/PvP versions
      // while keeping flip skill variants separate
      // Prefer skills without specialization (core skills) over those with specialization
      const skillsByKey = new Map<string, GW2SkillWithModes>();
      filteredSkills.forEach(skill => {
        // Create a unique key combining name and flip_skill status
        const key = `${skill.name}_${skill.flip_skill || 'none'}`;
        const existing = skillsByKey.get(key);
        if (!existing) {
          skillsByKey.set(key, skill);
        } else {
          // Prefer skills without specialization
          if (!skill.specialization && existing.specialization) {
            skillsByKey.set(key, skill);
          }
        }
      });
      const uniqueSkills = Array.from(skillsByKey.values());

      setAvailableSkills(uniqueSkills);
    } catch (error) {
      console.error('Failed to load skills:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSkillsForSlot = (slotType: string): GW2SkillWithModes[] => {
    // Get selected elite specializations (only elite specs, not core specs)
    const selectedEliteSpecs = [traits.spec1, traits.spec2, traits.spec3]
      .filter((id): id is number => typeof id === 'number')
      .filter(id => {
        const spec = specs.find(s => s.id === id);
        return spec && spec.elite;
      });

    const filteredSkills = availableSkills.filter((skill) => {
      if (skill.slot?.toLowerCase() !== slotType.toLowerCase()) return false;

      // For Elite slot: show core elites + elite spec elites that are selected
      if (slotType === 'Elite') {
        // No specialization = core elite, always show
        if (!skill.specialization) return true;

        // If specs haven't loaded yet, show all elites to avoid empty state
        if (specs.length === 0) return true;

        // Check if the skill's specialization is an elite spec
        const skillSpec = specs.find(s => s.id === skill.specialization);

        // If we can't find the spec in our list, show it (safety fallback)
        if (!skillSpec) return true;

        // If it's a core spec (not elite), always show it
        if (!skillSpec.elite) return true;

        // Elite spec skill - show if selected
        if (selectedEliteSpecs.includes(skill.specialization)) {
          return true;
        }

        return false;
      }

      // For other slots: filter by specialization
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
    const selectedSkillDetails = selectedSkill ? resolveSkillMode(selectedSkill, gameMode) : undefined;

    // Debug logging
    if (selectedSkill?.name === 'Well of Corruption') {
      console.log('Well of Corruption debug:', {
        gameMode,
        hasModes: !!selectedSkill.modes,
        hasWvw: !!selectedSkill.modes?.wvw,
        selectedSkillDetails,
        wvwRecharge: selectedSkillDetails?.facts?.find(f => f.type === 'Recharge')?.value
      });
    }

    return (
      <div key={slot} className="flex flex-col items-center gap-2">
        <span className="text-[10px] uppercase tracking-[0.3em] text-slate-500">{SLOT_LABELS[slot]}</span>
        {selectedSkill ? (
          <Tooltip
            title={selectedSkill.name}
            content={selectedSkillDetails?.description || ''}
            icon={selectedSkill.icon}
            facts={selectedSkillDetails?.facts}
            modeData={selectedSkill.modes}
          >
            <div>
              <SkillPicker
                skills={skillsForSlot}
                selectedSkillId={selectedSkillId}
                onSelect={(skillId) => setSkill(slot, skillId)}
                slotLabel={SLOT_LABELS[slot]}
                selectedSkill={selectedSkill}
                gameMode={gameMode}
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
            gameMode={gameMode}
          />
        )}
      </div>
    );
  };

  const hasEvokerFamiliar = profession === 'Elementalist' && (traits.spec3 === EVOKER_SPEC_ID || !!professionMechanics?.evokerFamiliar);
  const hasRevenantLegends = profession === 'Revenant' || !!professionMechanics?.revenantLegends;
  const hasAmalgamMorphs = (profession === 'Engineer' && [traits.spec1, traits.spec2, traits.spec3].includes(AMALGAM_SPEC_ID)) || !!professionMechanics?.amalgamMorphs;
  const hasRangerPet = profession === 'Ranger' || !!professionMechanics?.rangerPets;

  const handleSelectFamiliar = (skillId: number) => {
    setProfessionMechanic('evokerFamiliar', skillId);
    setIsPickerOpen(false);
  };

  const handleSelectLegend = (legendId: string, slot: 'legend1' | 'legend2') => {
    setProfessionMechanic('revenantLegends', {
      ...professionMechanics?.revenantLegends,
      [slot]: legendId,
    });

    // Auto-populate skills for legend 1
    if (slot === 'legend1') {
      const legend = legends.find(l => l.id === legendId);
      if (legend) {
        setSkill('heal', legend.heal);
        setSkill('utility1', legend.utilities[0]);
        setSkill('utility2', legend.utilities[1]);
        setSkill('utility3', legend.utilities[2]);
        setSkill('elite', legend.elite);
      }
    }

    setLegendPickerOpen(null);
  };

  const handleSelectMorph = (skillId: number, slot: 'slot2' | 'slot3' | 'slot4') => {
    setProfessionMechanic('amalgamMorphs', {
      ...professionMechanics?.amalgamMorphs,
      [slot]: skillId,
    });
    setMorphPickerOpen(null);
  };

  const getAvailableLegends = (): string[] => {
    // Always include core legends
    const available = [...CORE_LEGENDS];

    // Check elite spec and add its legend
    const eliteSpecs = [traits.spec1, traits.spec2, traits.spec3].filter((id): id is number => typeof id === 'number');

    for (const specId of eliteSpecs) {
      const eliteLegend = ELITE_LEGENDS[specId];
      if (eliteLegend) {
        available.push(eliteLegend);
      }
    }

    return available;
  };

  const renderRevenantLegends = () => {
    if (!hasRevenantLegends || legends.length === 0) return null;

    const availableLegendIds = getAvailableLegends();
    const selectedLegend1 = professionMechanics?.revenantLegends?.legend1;
    const selectedLegend2 = professionMechanics?.revenantLegends?.legend2;

    const renderLegendSlot = (slot: 'legend1' | 'legend2', selectedLegendId?: string) => {
      const selectedLegend = legends.find(l => l.id === selectedLegendId);
      const swapSkill = selectedLegend ? availableSkills.find(s => s.id === selectedLegend.swap) : undefined;

      return (
        <div key={slot} className="flex flex-col items-center gap-2">
          <span className="text-[10px] uppercase tracking-[0.3em] text-slate-500">
            {slot === 'legend1' ? 'Legend 1' : 'Legend 2'}
          </span>
          <div className="relative">
            <button
              ref={legendPickerOpen === slot ? legendButtonRef : undefined}
              onClick={() => setLegendPickerOpen(slot)}
              className={`relative flex h-16 w-16 items-center justify-center rounded-xl border cursor-pointer transition ${
                swapSkill
                  ? 'border-yellow-400 bg-slate-900 hover:border-yellow-300'
                  : 'border-slate-700 bg-slate-900/50 hover:border-slate-600'
              }`}
            >
              {swapSkill ? (
                <Tooltip
                  title={LEGEND_NAMES[selectedLegendId!] || selectedLegendId || 'Legend'}
                  content={resolveSkillMode(swapSkill, gameMode).description || ''}
                  icon={swapSkill.icon}
                >
                  <img src={swapSkill.icon} alt={swapSkill.name} className="h-14 w-14 rounded-lg object-cover" />
                </Tooltip>
              ) : (
                <span className="text-[10px] text-slate-500">Empty</span>
              )}
            </button>

            {/* Legend Picker Dropdown */}
            {legendPickerOpen === slot && (
              <div
                ref={legendDropdownRef}
                className="absolute top-full left-1/2 -translate-x-1/2 z-50 mt-2 w-[320px] overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl"
              >
                {/* Header */}
                <div className="border-b border-slate-800 px-4 py-3">
                  <h3 className="text-sm font-semibold text-white">Select Legend</h3>
                </div>

                {/* Legends Grid */}
                <div className="p-3">
                  <div className="grid grid-cols-3 gap-2">
                    {availableLegendIds.map((legendId) => {
                      const legend = legends.find(l => l.id === legendId);
                      if (!legend) return null;

                      const isSelected = legendId === selectedLegendId;
                      const swapSkillForLegend = availableSkills.find(s => s.id === legend.swap);
                      const legendName = LEGEND_NAMES[legendId] || legendId;

                      if (!swapSkillForLegend) return null;

                      return (
                        <Tooltip
                          key={legendId}
                          title={legendName}
                          content={resolveSkillMode(swapSkillForLegend, gameMode).description || ''}
                          icon={swapSkillForLegend.icon}
                        >
                          <button
                            onClick={() => handleSelectLegend(legendId, slot)}
                            className={`group relative flex flex-col items-center gap-1 rounded-xl border-2 p-2 transition ${
                              isSelected
                                ? 'border-yellow-400 bg-yellow-400/15'
                                : 'border-slate-800 bg-slate-900/60 hover:border-slate-600 hover:bg-slate-900'
                            }`}
                          >
                            <div className="relative">
                              <div className="h-12 w-12 overflow-hidden rounded-lg border border-slate-700 bg-slate-950">
                                <img src={swapSkillForLegend.icon} alt={legendName} className="h-full w-full object-cover" />
                              </div>
                              {isSelected && (
                                <div className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-yellow-300 text-[10px] font-bold text-slate-900">
                                  ✓
                                </div>
                              )}
                            </div>
                            <div className={`w-full overflow-hidden text-ellipsis text-center text-[9px] font-medium leading-tight ${
                              isSelected ? 'text-yellow-200' : 'text-slate-300'
                            }`}>
                              {legendName}
                            </div>
                          </button>
                        </Tooltip>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    };

    return (
      <div className="flex gap-2 ml-auto">
        {renderLegendSlot('legend1', selectedLegend1)}
        {renderLegendSlot('legend2', selectedLegend2)}
      </div>
    );
  };

  const renderEvokerFamiliar = () => {
    if (!hasEvokerFamiliar) return null;

    const familiarSkills = availableSkills.filter((skill) => EVOKER_FAMILIARS.includes(skill.id));
    const selectedSkillId = professionMechanics?.evokerFamiliar;
    const selectedSkill = availableSkills.find((skill) => skill.id === selectedSkillId);
    const selectedSkillDetails = selectedSkill ? resolveSkillMode(selectedSkill, gameMode) : undefined;

    return (
      <div className="flex flex-col items-center gap-2 ml-auto">
        <span className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Familiar</span>
        <div className="relative">
          <button
            ref={buttonRef}
            onClick={() => setIsPickerOpen(!isPickerOpen)}
            className={`relative flex h-16 w-16 items-center justify-center rounded-xl border cursor-pointer transition ${
              selectedSkill
                ? 'border-yellow-400 bg-slate-900 hover:border-yellow-300'
                : 'border-slate-700 bg-slate-900/50 hover:border-slate-600'
            }`}
          >
            {selectedSkill ? (
              <Tooltip
                title={FAMILIAR_NAMES[selectedSkill.id] || selectedSkill.name}
                content={selectedSkillDetails?.description || ''}
                icon={selectedSkill.icon}
                facts={selectedSkillDetails?.facts}
                modeData={selectedSkill.modes}
              >
                <img src={selectedSkill.icon} alt={selectedSkill.name} className="h-14 w-14 rounded-lg object-cover" />
              </Tooltip>
            ) : (
              <span className="text-[10px] text-slate-500">Empty</span>
            )}
          </button>

          {/* Familiar Picker Dropdown */}
          {isPickerOpen && (
            <div
              ref={dropdownRef}
              className="absolute top-full left-1/2 -translate-x-1/2 z-50 mt-2 w-[320px] overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl"
            >
              {/* Header */}
              <div className="border-b border-slate-800 px-4 py-3">
                <h3 className="text-sm font-semibold text-white">Select Familiar</h3>
              </div>

              {/* Familiars Grid */}
              <div className="p-3">
                <div className="grid grid-cols-4 gap-2">
                  {familiarSkills.map((skill) => {
                    const isSelected = skill.id === selectedSkillId;
                    const modeDetails = resolveSkillMode(skill, gameMode);
                    const familiarName = FAMILIAR_NAMES[skill.id] || skill.name;

                    return (
                      <Tooltip
                        key={skill.id}
                        title={familiarName}
                        content={modeDetails?.description || ''}
                        icon={skill.icon}
                        facts={modeDetails?.facts}
                        modeData={skill.modes}
                      >
                        <button
                          onClick={() => handleSelectFamiliar(skill.id)}
                          className={`group relative flex flex-col items-center gap-1 rounded-xl border-2 p-2 transition ${
                            isSelected
                              ? 'border-yellow-400 bg-yellow-400/15'
                              : 'border-slate-800 bg-slate-900/60 hover:border-slate-600 hover:bg-slate-900'
                          }`}
                        >
                          <div className="relative">
                            <div className="h-12 w-12 overflow-hidden rounded-lg border border-slate-700 bg-slate-950">
                              <img src={skill.icon} alt={familiarName} className="h-full w-full object-cover" />
                            </div>
                            {isSelected && (
                              <div className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-yellow-300 text-[10px] font-bold text-slate-900">
                                ✓
                              </div>
                            )}
                          </div>
                          <div className={`w-full overflow-hidden text-ellipsis text-center text-[9px] font-medium leading-tight ${
                            isSelected ? 'text-yellow-200' : 'text-slate-300'
                          }`}>
                            {familiarName}
                          </div>
                        </button>
                      </Tooltip>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderRangerPet = (slot: 'pet1' | 'pet2') => {
    if (!hasRangerPet) return null;

    const selectedPetId = slot === 'pet1' ? professionMechanics?.rangerPets?.pet1 : professionMechanics?.rangerPets?.pet2;
    const selectedPet = pets.find((pet) => pet.id === selectedPetId);

    // Filter pets based on search query
    const filteredPets = pets.filter(pet => {
      if (!petSearchQuery) return true;
      const petName = pet.name.replace('Juvenile ', '').toLowerCase();
      return petName.includes(petSearchQuery.toLowerCase());
    });

    return (
      <div key={slot} className="flex flex-col items-center gap-1">
        <span className="text-[8px] uppercase tracking-[0.2em] text-slate-500">{slot === 'pet1' ? 'Pet 1' : 'Pet 2'}</span>
        <div className="relative">
          <button
            ref={petPickerOpen === slot ? petButtonRef : undefined}
            onClick={() => {
              setPetPickerOpen(slot);
              setPetSearchQuery('');
            }}
            className={`relative flex h-16 w-16 items-center justify-center rounded-xl border cursor-pointer transition ${
              selectedPet
                ? 'border-yellow-400 bg-slate-900 hover:border-yellow-300'
                : 'border-slate-700 bg-slate-900/50 hover:border-slate-600'
            }`}
          >
            {selectedPet ? (
              <Tooltip
                title={selectedPet.name}
                content={selectedPet.description || ''}
                icon={selectedPet.icon}
              >
                <img src={selectedPet.icon} alt={selectedPet.name} className="h-14 w-14 rounded-lg object-cover" />
              </Tooltip>
            ) : (
              <span className="text-[10px] text-slate-500">Empty</span>
            )}
          </button>

          {/* Pet Picker Dropdown */}
          {petPickerOpen === slot && (
            <div
              ref={petDropdownRef}
              className="absolute top-full left-1/2 -translate-x-1/2 z-50 mt-2 w-[480px] max-h-[500px] overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl"
            >
              {/* Header with Search */}
              <div className="border-b border-slate-800 px-4 py-3 space-y-2">
                <h3 className="text-sm font-semibold text-white">Select Pet</h3>
                <input
                  type="text"
                  placeholder="Search pets..."
                  value={petSearchQuery}
                  onChange={(e) => setPetSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
                  autoFocus
                />
              </div>

              {/* Pets Grid with Scroll */}
              <div className="p-3 max-h-[380px] overflow-y-auto">
                {filteredPets.length === 0 ? (
                  <div className="py-8 text-center text-sm text-slate-400">
                    No pets found matching "{petSearchQuery}"
                  </div>
                ) : (
                  <div className="grid grid-cols-5 gap-2">
                    {filteredPets.map((pet) => {
                      const isSelected = pet.id === selectedPetId;

                      return (
                        <Tooltip
                          key={pet.id}
                          title={pet.name}
                          content={pet.description || ''}
                          icon={pet.icon}
                        >
                          <button
                            onClick={() => {
                              setProfessionMechanic('rangerPets', {
                                ...professionMechanics?.rangerPets,
                                [slot]: pet.id,
                              });
                              setPetPickerOpen(null);
                              setPetSearchQuery('');
                            }}
                            className={`group relative flex flex-col items-center gap-1 rounded-xl border-2 p-2 transition ${
                              isSelected
                                ? 'border-yellow-400 bg-yellow-400/15'
                                : 'border-slate-800 bg-slate-900/60 hover:border-slate-600 hover:bg-slate-900'
                            }`}
                          >
                            <div className="relative">
                              <div className="h-12 w-12 overflow-hidden rounded-lg border border-slate-700 bg-slate-950">
                                <img src={pet.icon} alt={pet.name} className="h-full w-full object-cover" />
                              </div>
                              {isSelected && (
                                <div className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-yellow-300 text-[10px] font-bold text-slate-900">
                                  ✓
                                </div>
                              )}
                            </div>
                            <div className={`w-full overflow-hidden text-ellipsis text-center text-[9px] font-medium leading-tight ${
                              isSelected ? 'text-yellow-200' : 'text-slate-300'
                            }`}>
                              {pet.name.replace('Juvenile ', '')}
                            </div>
                          </button>
                        </Tooltip>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
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

  const renderAmalgamMorph = (slot: 'slot2' | 'slot3' | 'slot4') => {
    if (!hasAmalgamMorphs) return null;

    const slotLabel = slot === 'slot2' ? 'F2' : slot === 'slot3' ? 'F3' : 'F4';
    const morphSkills = availableSkills.filter(s => AMALGAM_MORPHS.includes(s.id));
    const selectedMorphId = professionMechanics?.amalgamMorphs?.[slot];
    const selectedMorph = availableSkills.find(s => s.id === selectedMorphId);
    const selectedMorphDetails = selectedMorph ? resolveSkillMode(selectedMorph, gameMode) : undefined;

    return (
      <div key={slot} className="flex flex-col items-center gap-1">
        <span className="text-[8px] uppercase tracking-[0.2em] text-slate-500">{slotLabel}</span>
        <div className="relative">
          <button
            ref={morphPickerOpen === slot ? morphButtonRef : undefined}
            onClick={() => setMorphPickerOpen(slot)}
            className={`relative flex h-10 w-10 items-center justify-center rounded-lg border cursor-pointer transition ${
              selectedMorph
                ? 'border-yellow-400 bg-slate-900 hover:border-yellow-300'
                : 'border-slate-700 bg-slate-900/50 hover:border-slate-600'
            }`}
          >
            {selectedMorph ? (
              <Tooltip
                title={selectedMorph.name}
                content={selectedMorphDetails?.description || ''}
                icon={selectedMorph.icon}
                facts={selectedMorphDetails?.facts}
                modeData={selectedMorph.modes}
              >
                <img src={selectedMorph.icon} alt={selectedMorph.name} className="h-8 w-8 rounded-md object-cover" />
              </Tooltip>
            ) : (
              <span className="text-[8px] text-slate-500">Empty</span>
            )}
          </button>

          {/* Morph Picker Dropdown */}
          {morphPickerOpen === slot && (
            <div
              ref={morphDropdownRef}
              className="absolute top-full left-1/2 -translate-x-1/2 z-50 mt-2 w-[320px] overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl"
            >
              {/* Header */}
              <div className="border-b border-slate-800 px-4 py-3">
                <h3 className="text-sm font-semibold text-white">Select Morph</h3>
              </div>

              {/* Morphs Grid */}
              <div className="p-3">
                <div className="grid grid-cols-3 gap-2">
                  {morphSkills.map((skill) => {
                    const isSelected = skill.id === selectedMorphId;
                    const modeDetails = resolveSkillMode(skill, gameMode);

                    return (
                      <Tooltip
                        key={skill.id}
                        title={skill.name}
                        content={modeDetails?.description || ''}
                        icon={skill.icon}
                        facts={modeDetails?.facts}
                        modeData={skill.modes}
                      >
                        <button
                          onClick={() => handleSelectMorph(skill.id, slot)}
                          className={`group relative flex flex-col items-center gap-1 rounded-xl border-2 p-2 transition ${
                            isSelected
                              ? 'border-yellow-400 bg-yellow-400/15'
                              : 'border-slate-800 bg-slate-900/60 hover:border-slate-600 hover:bg-slate-900'
                          }`}
                        >
                          <div className="relative">
                            <div className="h-12 w-12 overflow-hidden rounded-lg border border-slate-700 bg-slate-950">
                              <img src={skill.icon} alt={skill.name} className="h-full w-full object-cover" />
                            </div>
                            {isSelected && (
                              <div className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-yellow-300 text-[10px] font-bold text-slate-900">
                                ✓
                              </div>
                            )}
                          </div>
                          <div className={`w-full overflow-hidden text-ellipsis text-center text-[9px] font-medium leading-tight ${
                            isSelected ? 'text-yellow-200' : 'text-slate-300'
                          }`}>
                            {skill.name.replace('Offensive Protocol: ', '').replace('Defensive Protocol: ', '')}
                          </div>
                        </button>
                      </Tooltip>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // If Amalgam morphs are active, show morphs on same line, right-aligned
  if (hasAmalgamMorphs) {
    return (
      <div className="flex gap-4">
        {renderSkillSlot('heal')}
        {renderSkillSlot('utility1')}
        {renderSkillSlot('utility2')}
        {renderSkillSlot('utility3')}
        {renderSkillSlot('elite')}
        <div className="flex gap-2 ml-auto">
          {renderAmalgamMorph('slot2')}
          {renderAmalgamMorph('slot3')}
          {renderAmalgamMorph('slot4')}
        </div>
      </div>
    );
  }

  const renderRangerPets = () => {
    if (!hasRangerPet) return null;

    return (
      <div className="flex gap-2 ml-auto">
        {renderRangerPet('pet1')}
        {renderRangerPet('pet2')}
      </div>
    );
  };

  return (
    <div className="flex gap-4">
      {renderSkillSlot('heal')}
      {renderSkillSlot('utility1')}
      {renderSkillSlot('utility2')}
      {renderSkillSlot('utility3')}
      {renderSkillSlot('elite')}
      {renderRevenantLegends()}
      {renderEvokerFamiliar()}
      {renderRangerPets()}
    </div>
  );
}

// Trait Panel Content (without wrapper)
function TraitPanelContent() {
  const { profession, traits, setSpecialization, setTrait, gameMode } = useBuildStore();
  const [specs, setSpecs] = useState<GW2Specialization[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profession) {
      loadSpecializations();
    }
  }, [profession]);

  const loadSpecializations = async () => {
    if (!profession) return;
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
              gameMode={gameMode}
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
  gameMode?: GameMode;
  onTraitSelect: (tier: 0 | 1 | 2, traitId: number | null) => void;
}

function TraitSelector({ specId, selectedChoices, gameMode, onTraitSelect }: TraitSelectorProps) {
  const [traits, setTraits] = useState<GW2TraitWithModes[]>([]);
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
  const minorTraits = traits.filter(t => spec.minor_traits.includes(t.id)).sort((a, b) => a.tier - b.tier);

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
            const traitDetails = resolveTraitMode(trait, gameMode);

            return (
              <Tooltip
                key={trait.id}
                title={trait.name}
                content={traitDetails?.description || ''}
                icon={trait.icon}
                facts={traitDetails?.facts}
                modeData={trait.modes}
              >
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

      {/* Minor Traits Section */}
      {minorTraits.length > 0 && (
        <>
          {/* Separator */}
          <div className="flex items-center gap-2 pt-2">
            <div className="flex-1 border-t border-slate-800/40" />
            <div className="rounded-lg bg-slate-900/70 px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-slate-400">
              Minor
            </div>
            <div className="flex-1 border-t border-slate-800/40" />
          </div>

          {/* Minor Traits Grid */}
          <div className="flex justify-center gap-3 pt-1">
            {minorTraits.map((trait) => {
              const traitDetails = resolveTraitMode(trait, gameMode);

              return (
                <Tooltip
                  key={trait.id}
                  title={trait.name}
                  content={traitDetails?.description || ''}
                  icon={trait.icon}
                  facts={traitDetails?.facts}
                  modeData={trait.modes}
                >
                  <div className="relative flex h-12 w-12 items-center justify-center rounded-xl border-2 border-slate-800 bg-slate-900/40">
                    <div className="h-10 w-10 overflow-hidden rounded-lg border border-slate-700 bg-slate-900">
                      <img src={trait.icon} alt={trait.name} className="h-full w-full object-cover" />
                    </div>
                  </div>
                </Tooltip>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// Equipment Panel Content (without wrapper)
function EquipmentPanelContent() {
  const { profession, equipment, updateEquipment, applyStatToCategory, runeId, setRuneId, relicId, setRelicId } = useBuildStore();
  const [bulkStat, setBulkStat] = useState<StatCombo>('Berserker');
  const [bulkInfusion, setBulkInfusion] = useState<number | undefined>(INFUSION_IDS[0]);
  const [overwriteStats, setOverwriteStats] = useState(false);
  const [overwriteInfusions, setOverwriteInfusions] = useState(false);
  const [runes, setRunes] = useState<GW2Item[]>([]);
  const [relics, setRelics] = useState<GW2Item[]>([]);
  const [sigils, setSigils] = useState<GW2Item[]>([]);
  const [infusions, setInfusions] = useState<GW2Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    setLoading(true);
    try {
      // Fetch all runes, relics, sigils, and infusions using static ID lists
      const [runeItems, relicItems, sigilItems, infusionItems] = await Promise.all([
        gw2Api.getItems(RUNE_IDS),
        gw2Api.getItems(RELIC_IDS),
        gw2Api.getItems(SIGIL_IDS),
        gw2Api.getItems(INFUSION_IDS)
      ]);

      // Sort by name for better UX
      const sortedRunes = runeItems.sort((a, b) => a.name.localeCompare(b.name));
      const sortedRelics = relicItems.sort((a, b) => a.name.localeCompare(b.name));
      const sortedSigils = sigilItems.sort((a, b) => a.name.localeCompare(b.name));
      const sortedInfusions = infusionItems.sort((a, b) => a.name.localeCompare(b.name));

      setRunes(sortedRunes);
      setRelics(sortedRelics);
      setSigils(sortedSigils);
      setInfusions(sortedInfusions);
    } catch (error) {
      console.error('Failed to load items:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedRune = runes.find(r => r.id === runeId);
  const selectedRelic = relics.find(r => r.id === relicId);

  // Helper function to get infusion count for a slot
  const getInfusionCountForSlot = (slot: string, weaponType?: string): number => {
    if (slot === 'Ring1' || slot === 'Ring2') return 3;
    if (slot === 'Backpack') return 2;
    if (slot === 'Amulet') return 0; // Enrichment (greyed out)
    if (slot === 'MainHand1' || slot === 'MainHand2') {
      return weaponType && TWO_HANDED_WEAPONS.includes(weaponType as any) ? 2 : 1;
    }
    // Armor and other trinkets
    return 1;
  };

  // Helper function to render infusion slots
  const renderInfusionSlots = (item: typeof equipment[0]) => {
    const count = getInfusionCountForSlot(item.slot, item.weaponType);
    const isAmulet = item.slot === 'Amulet';

    const slots = [];
    for (let i = 1; i <= count; i++) {
      const infusionKey = `infusion${i}` as 'infusion1' | 'infusion2' | 'infusion3';
      slots.push(
        <ItemIconBox
          key={`${item.slot}-${infusionKey}`}
          itemId={item[infusionKey]}
          items={infusions}
          onSelect={(id) => updateEquipment(item.slot, { [infusionKey]: id })}
          disabled={loading}
          size="xs"
          getItemLabel={(item) => item.name.replace(' WvW Infusion', ' Infusion')}
        />
      );
    }

    // Add greyed out enrichment slot for amulet
    if (isAmulet) {
      slots.push(
        <ItemIconBox
          key={`${item.slot}-enrichment`}
          items={[]}
          onSelect={() => {}}
          disabled={true}
          size="xs"
          placeholder="⬟"
        />
      );
    }

    return <>{slots}</>;
  };

  const armorItems = equipment.filter(e =>
    ['Helm', 'Shoulders', 'Coat', 'Gloves', 'Leggings', 'Boots'].includes(e.slot)
  );
  // Reorder trinkets: backpack, accessories, rings, then amulet at bottom
  const trinketOrder = ['Backpack', 'Accessory1', 'Accessory2', 'Ring1', 'Ring2', 'Amulet'];
  const trinketItems = trinketOrder
    .map(slot => equipment.find(e => e.slot === slot))
    .filter(Boolean) as typeof equipment;

  // Helper function to apply stats with overwrite logic
  const handleApplyStats = (category: 'armor' | 'trinkets' | 'weapons' | 'all') => {
    if (overwriteStats) {
      // Overwrite mode: apply to all items regardless of current value
      applyStatToCategory(category, bulkStat);
    } else {
      // Non-overwrite mode: only apply to items that are still default (Berserker)
      const slotsToUpdate = (() => {
        switch (category) {
          case 'armor': return armorItems.filter(e => e.stat === 'Berserker').map(e => e.slot);
          case 'trinkets': return trinketItems.filter(e => e.stat === 'Berserker').map(e => e.slot);
          case 'weapons': return equipment.filter(e => ['MainHand1', 'OffHand1', 'MainHand2', 'OffHand2'].includes(e.slot) && e.stat === 'Berserker').map(e => e.slot);
          case 'all': return equipment.filter(e => e.stat === 'Berserker').map(e => e.slot);
        }
      })();

      slotsToUpdate.forEach(slot => {
        updateEquipment(slot, { stat: bulkStat });
      });
    }
  };

  // Helper function to apply infusions with overwrite logic to ALL infusion slots
  const handleApplyInfusions = (category: 'armor' | 'trinkets' | 'weapons' | 'all') => {
    const itemsToUpdate = (() => {
      switch (category) {
        case 'armor': return armorItems;
        case 'trinkets': return trinketItems;
        case 'weapons': return equipment.filter(e => ['MainHand1', 'OffHand1', 'MainHand2', 'OffHand2'].includes(e.slot));
        case 'all': return equipment;
      }
    })();

    itemsToUpdate.forEach(item => {
      const updates: Record<string, number | undefined> = {};
      const infusionCount = getInfusionCountForSlot(item.slot, item.weaponType);

      for (let i = 1; i <= infusionCount; i++) {
        const infusionKey = `infusion${i}` as 'infusion1' | 'infusion2' | 'infusion3';
        // Apply if overwrite is enabled OR if the slot is empty
        if (overwriteInfusions || !item[infusionKey]) {
          updates[infusionKey] = bulkInfusion;
        }
      }

      if (Object.keys(updates).length > 0) {
        updateEquipment(item.slot, updates);
      }
    });
  };

  // Render armor/trinket slot with horizontal layout: stat on left, infusions on right
  const renderEquipmentSlot = (item: typeof equipment[0]) => {
    return (
      <div key={item.slot} className="rounded-lg border border-slate-800 bg-slate-900/60 p-2">
        {/* Single row: Slot label, stat selection, and infusions */}
        <div className="flex items-center gap-2">
          <div className="w-10 text-[8px] font-medium uppercase tracking-wider text-slate-400">
            {item.slot.replace('Shoulders', 'Shoulder').replace('Backpack', 'Back').replace('Accessory1', 'Acc').replace('Accessory2', 'Acc').replace('1', '').replace('2', '')}
          </div>
          <div className="flex-1">
            <select
              value={item.stat}
              onChange={(event) => updateEquipment(item.slot, { stat: event.target.value as StatCombo })}
              className="w-full rounded border border-slate-700 bg-slate-950/70 px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-slate-500"
            >
              {STAT_COMBOS.map((stat) => (
                <option key={stat} value={stat}>
                  {stat}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-1">
            {renderInfusionSlots(item)}
          </div>
        </div>
      </div>
    );
  };

  // NEW: Render a weapon slot with vertical layout
  const renderWeaponSlot = (item: typeof equipment[0]) => {
    const isOffHand = item.slot.includes('OffHand');
    const mainHandSlot = item.slot === 'OffHand1' ? 'MainHand1' : item.slot === 'OffHand2' ? 'MainHand2' : null;
    const mainHandWeapon = mainHandSlot ? equipment.find(e => e.slot === mainHandSlot)?.weaponType : null;
    const isMainHandTwoHanded = mainHandWeapon && TWO_HANDED_WEAPONS.includes(mainHandWeapon);

    if (isOffHand && isMainHandTwoHanded) {
      return (
        <div key={item.slot} className="rounded-lg border border-slate-800 bg-slate-900/60 p-2 text-center text-xs text-slate-400 italic">
          Two-handed weapon equipped
        </div>
      );
    }

    const isTwoHanded = item.weaponType && TWO_HANDED_WEAPONS.includes(item.weaponType);
    const availableWeapons = profession ? (PROFESSION_WEAPONS as any)[profession] || [] : [];
    const slotWeapons = isOffHand
      ? availableWeapons.filter((w: string) => ['Focus', 'Shield', 'Torch', 'Warhorn'].includes(w))
      : availableWeapons;

    return (
      <div key={item.slot} className="rounded-lg border border-slate-800 bg-slate-900/60 p-2">
        {/* Top row: Weapon type and stat selection */}
        <div className="flex items-center gap-2 mb-1.5">
          <div className="flex-1">
            <select
              value={item.weaponType || ''}
              onChange={(e) => {
                const weaponType = e.target.value || undefined;
                const newIsTwoHanded = weaponType && TWO_HANDED_WEAPONS.includes(weaponType as any);
                const wasOffHand = isOffHand;

                if (!wasOffHand) {
                  // Main-hand weapon change
                  const offHandSlot = item.slot === 'MainHand1' ? 'OffHand1' : 'OffHand2';
                  const offHandItem = equipment.find(e => e.slot === offHandSlot);

                  if (newIsTwoHanded && offHandItem) {
                    // Switching to 2h: merge off-hand sigils/infusions into main-hand
                    updateEquipment(item.slot, {
                      weaponType: weaponType as any,
                      sigil2Id: offHandItem.sigil1Id || item.sigil2Id,
                      infusion2: offHandItem.infusion1 || item.infusion2,
                    });
                    // Clear off-hand
                    updateEquipment(offHandSlot, {
                      weaponType: undefined,
                      sigil1Id: undefined,
                      infusion1: undefined,
                    });
                  } else if (!newIsTwoHanded && isTwoHanded) {
                    // Switching from 2h to 1h: keep only first sigil/infusion
                    updateEquipment(item.slot, {
                      weaponType: weaponType as any,
                      sigil2Id: undefined,
                      infusion2: undefined,
                    });
                  } else {
                    // Normal 1h to 1h change
                    updateEquipment(item.slot, {
                      weaponType: weaponType as any,
                    });
                  }
                } else {
                  // Off-hand weapon change
                  updateEquipment(item.slot, {
                    weaponType: weaponType as any,
                  });
                }
              }}
              className="w-full rounded border border-slate-700 bg-slate-950/70 px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-slate-500"
            >
              <option value="">Select Weapon</option>
              {slotWeapons.map((weapon: string) => (
                <option key={weapon} value={weapon}>
                  {weapon}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <select
              value={item.stat}
              onChange={(e) => updateEquipment(item.slot, { stat: e.target.value as StatCombo })}
              className="w-full rounded border border-slate-700 bg-slate-950/70 px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-slate-500"
            >
              {STAT_COMBOS.map((stat) => (
                <option key={stat} value={stat}>{stat}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Bottom row: Sigils and Infusions - fixed height */}
        <div className="flex gap-1 items-center h-6">
          <div className="flex gap-1 justify-end flex-1">
            <ItemIconBox
              itemId={item.sigil1Id}
              items={sigils}
              onSelect={(id) => updateEquipment(item.slot, { sigil1Id: id })}
              disabled={loading}
              size="xs"
            />
            {/* Second sigil for 2h weapons only */}
            {!isOffHand && isTwoHanded && (
              <ItemIconBox
                itemId={item.sigil2Id}
                items={sigils}
                onSelect={(id) => updateEquipment(item.slot, { sigil2Id: id })}
                disabled={loading}
                size="xs"
              />
            )}
          </div>
          <div className="w-px h-6 bg-slate-700 mx-1"></div>
          <div className="flex gap-1 flex-1">
            {renderInfusionSlots(item)}
          </div>
        </div>
      </div>
    );
  };

  // NEW: Render a weapon set (two weapons side by side)
  const renderWeaponSet = (setNumber: 1 | 2) => {
    const mainHand = equipment.find(w => w.slot === `MainHand${setNumber}`);
    const offHand = equipment.find(w => w.slot === `OffHand${setNumber}`);

    if (!mainHand || !offHand) return null;

    return (
      <div className="space-y-2">
        {renderWeaponSlot(mainHand)}
        {renderWeaponSlot(offHand)}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* WEAPONS SECTION */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <h3 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-400">Weapons</h3>
        <div className="flex gap-4 items-center">
          {/* Weapon Set 1 */}
          <div className="flex-1">
            {renderWeaponSet(1)}
          </div>

          {/* Weapon Swap Icon */}
          <div className="flex-shrink-0">
            <div className="h-12 w-12 rounded-full border-2 border-slate-700 bg-slate-900/80 flex items-center justify-center">
              <span className="text-xl">⇄</span>
            </div>
          </div>

          {/* Weapon Set 2 */}
          <div className="flex-1">
            {renderWeaponSet(2)}
          </div>
        </div>
      </div>

      {/* ARMOR & TRINKETS SECTION */}
      <div className="grid grid-cols-2 gap-4">
        {/* Armor (Left Column) */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <h3 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-400">Armor</h3>
          <div className="space-y-2">
            {armorItems.map(item => renderEquipmentSlot(item))}
          </div>
        </div>

        {/* Trinkets (Right Column) */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <h3 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-400">Trinkets</h3>
          <div className="space-y-2">
            {trinketItems.map(item => renderEquipmentSlot(item))}
          </div>
        </div>
      </div>

      {/* RUNE & RELIC SECTION */}
      <div className="grid grid-cols-2 gap-4">
        {/* Rune (Left) */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <h3 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-400">Rune</h3>
          <div className="flex gap-2">
            <SearchableDropdown
              items={runes}
              selectedId={runeId}
              onSelect={setRuneId}
              getItemId={(rune) => rune.id}
              getItemLabel={(rune) => rune.name.replace('Superior Rune of the ', '').replace('Superior Rune of ', '')}
              placeholder="Select Rune"
              disabled={loading}
            />
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

        {/* Relic (Right) */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <h3 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-400">Relic</h3>
          <div className="flex gap-2">
            <SearchableDropdown
              items={relics}
              selectedId={relicId}
              onSelect={setRelicId}
              getItemId={(relic) => relic.id}
              getItemLabel={(relic) => relic.name.replace('Relic of the ', '').replace('Relic of ', '')}
              placeholder="Select Relic"
              disabled={loading}
            />
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

      {/* BULK TOOLS SECTION (Bottom) */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-400">Bulk apply</h3>

        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-slate-500">Stats</p>
            <SearchableDropdown
              items={STAT_COMBOS.map(stat => ({ id: stat, name: stat }))}
              selectedId={bulkStat}
              onSelect={(id) => setBulkStat(id as StatCombo)}
              getItemId={(item) => item.id}
              getItemLabel={(item) => item.name}
              placeholder="Select Stat Combo"
              disabled={loading}
            />
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={overwriteStats}
                onChange={(e) => setOverwriteStats(e.target.checked)}
                className="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500"
              />
              <span>Overwrite</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => handleApplyStats('armor')}
                className="rounded-lg border border-slate-700 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-200 transition hover:border-slate-500"
              >
                Armor Stats
              </button>
              <button
                onClick={() => handleApplyStats('trinkets')}
                className="rounded-lg border border-slate-700 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-200 transition hover:border-slate-500"
              >
                Trinket Stats
              </button>
              <button
                onClick={() => handleApplyStats('weapons')}
                className="rounded-lg border border-slate-700 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-200 transition hover:border-slate-500"
              >
                Weapons
              </button>
              <button
                onClick={() => handleApplyStats('all')}
                className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-200 transition hover:border-emerald-400 hover:bg-emerald-500/20"
              >
                All
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-slate-500">Infusions</p>
            <SearchableDropdown
              items={infusions}
              selectedId={bulkInfusion}
              onSelect={(id) => setBulkInfusion(id)}
              getItemId={(item) => item.id}
              getItemLabel={(item) => item.name.replace(' WvW Infusion', ' Infusion')}
              placeholder="Select Infusion"
              disabled={loading}
            />
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={overwriteInfusions}
                onChange={(e) => setOverwriteInfusions(e.target.checked)}
                className="rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-indigo-500"
              />
              <span>Overwrite</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => handleApplyInfusions('armor')}
                className="rounded-lg border border-slate-700 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-200 transition hover:border-slate-500"
              >
                Armor Stats
              </button>
              <button
                onClick={() => handleApplyInfusions('trinkets')}
                className="rounded-lg border border-slate-700 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-200 transition hover:border-slate-500"
              >
                Trinket Stats
              </button>
              <button
                onClick={() => handleApplyInfusions('weapons')}
                className="rounded-lg border border-slate-700 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-200 transition hover:border-slate-500"
              >
                Weapons
              </button>
              <button
                onClick={() => handleApplyInfusions('all')}
                className="rounded-lg border border-indigo-500/40 bg-indigo-500/10 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-200 transition hover:border-indigo-400 hover:bg-indigo-500/20"
              >
                All
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
