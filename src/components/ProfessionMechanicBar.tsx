import { useState, useEffect, useRef } from 'react';
import { useBuildStore } from '../store/buildStore';
import { gw2Api } from '../lib/gw2api';
import type { GW2SkillWithModes } from '../types/gw2';
import { resolveSkillMode } from '../lib/modeUtils';
import Tooltip from './Tooltip';

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

export default function ProfessionMechanicBar() {
  const { profession, professionMechanics, setProfessionMechanic, gameMode, traits } = useBuildStore();
  const [availableSkills, setAvailableSkills] = useState<GW2SkillWithModes[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (hasSelectableMechanics()) {
      loadProfessionSkills();
    }
  }, [profession, traits]);

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
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsPickerOpen(false);
      }
    };

    if (isPickerOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isPickerOpen]);

  const loadProfessionSkills = async () => {
    setLoading(true);
    try {
      const allSkills = await gw2Api.getSkills(profession);
      // Filter for profession mechanic skills
      const professionSkills = allSkills.filter((skill) => skill.type === 'Profession');
      setAvailableSkills(professionSkills);
    } catch (error) {
      console.error('Failed to load profession skills:', error);
    } finally {
      setLoading(false);
    }
  };

  // Check if current build has selectable mechanics
  const hasSelectableMechanics = () => {
    // Evoker: Check if spec3 is Evoker (ID 80)
    if (profession === 'Elementalist' && traits.spec3 === EVOKER_SPEC_ID) {
      return true;
    }
    // TODO: Add other professions as they are implemented
    // Amalgam (Engineer), Revenant, Ranger
    return false;
  };

  const handleSelectFamiliar = (skillId: number) => {
    setProfessionMechanic('evokerFamiliar', skillId);
    setIsPickerOpen(false);
  };

  if (!hasSelectableMechanics() || !profession) {
    return null;
  }

  const renderEvokerFamiliar = () => {
    const familiarSkills = availableSkills.filter((skill) => EVOKER_FAMILIARS.includes(skill.id));
    const selectedSkillId = professionMechanics?.evokerFamiliar;
    const selectedSkill = availableSkills.find((skill) => skill.id === selectedSkillId);
    const selectedSkillDetails = selectedSkill ? resolveSkillMode(selectedSkill, gameMode) : undefined;

    return (
      <div className="flex items-center gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3 shadow-[0_18px_40px_-32px_rgba(14,22,40,1)]">
        <div className="flex flex-col items-center gap-1">
          <span className="text-[10px] uppercase tracking-[0.3em] text-slate-500">F5</span>
          <div className="relative">
            <button
              ref={buttonRef}
              onClick={() => setIsPickerOpen(!isPickerOpen)}
              className={`relative flex h-14 w-14 items-center justify-center rounded-xl border cursor-pointer transition ${
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
                  <img src={selectedSkill.icon} alt={selectedSkill.name} className="h-12 w-12 rounded-lg object-cover" />
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

        <div className="flex-1">
          <div className="text-xs font-semibold text-slate-200">
            {selectedSkill ? FAMILIAR_NAMES[selectedSkill.id] || selectedSkill.name : 'Select a familiar'}
          </div>
          <div className="mt-1 text-[10px] text-slate-400">
            Click the icon to choose your familiar
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <section className="rounded-3xl border border-slate-800/80 bg-slate-900/70 p-6 shadow-[0_18px_50px_-28px_rgba(14,22,40,1)]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.35em] text-slate-500">Profession Mechanic</p>
            <h2 className="mt-2 text-lg font-semibold text-white">Familiar</h2>
          </div>
          <span className="text-xs text-slate-500">Loading…</span>
        </div>
        <div className="mt-6">
          <div className="h-16 rounded-2xl bg-slate-800/60" />
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
          <p className="text-[11px] uppercase tracking-[0.35em] text-slate-500">Profession Mechanic</p>
          <h2 className="mt-2 text-lg font-semibold text-white">Familiar</h2>
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
        <div className="mt-6">
          {renderEvokerFamiliar()}
        </div>
      )}
    </section>
  );
}
