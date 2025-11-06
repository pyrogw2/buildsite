import { useState, useEffect, useCallback } from 'react';
import { useBuildStore } from '../store/buildStore';
import { gw2Api } from '../lib/gw2api';
import type { GW2SkillWithModes, GW2TraitWithModes, GW2Specialization, SkillSelection } from '../types/gw2';
import { resolveSkillMode, resolveTraitMode } from '../lib/modeUtils';
import Tooltip from './Tooltip';

type SkillSlot = keyof SkillSelection;

const SKILL_SLOT_ORDER: SkillSlot[] = [
  'heal',
  'utility1',
  'utility2',
  'utility3',
  'elite',
];

const SKILL_LABELS: Record<SkillSlot, string> = {
  heal: 'Heal',
  utility1: 'Utility 1',
  utility2: 'Utility 2',
  utility3: 'Utility 3',
  elite: 'Elite',
};

export default function BuildPreview() {
  const { skills, traits, gameMode } = useBuildStore();
  const [skillData, setSkillData] = useState<Record<string, GW2SkillWithModes>>({});
  const [traitData, setTraitData] = useState<Record<number, GW2TraitWithModes>>({});
  const [specData, setSpecData] = useState<Record<number, GW2Specialization>>({});
  const [loading, setLoading] = useState(false);

  const loadBuildData = useCallback(async () => {
    setLoading(true);
    try {
      // Load skill data
      const skillPromises = SKILL_SLOT_ORDER.map(async (slot) => {
        const skillId = skills[slot];
        if (skillId) {
          const skill = await gw2Api.getSkill(skillId);
          return [slot, skill] as const;
        }
        return null;
      });

      const skillResults = await Promise.all(skillPromises);
      const newSkillData: Record<string, GW2SkillWithModes> = {};
      skillResults.forEach((result) => {
        if (result) {
          newSkillData[result[0]] = result[1];
        }
      });
      setSkillData(newSkillData);

      // Load trait and spec data
      const specIds = [traits.spec1, traits.spec2, traits.spec3].filter(Boolean) as number[];
      const traitIds: number[] = [];

      [traits.spec1Choices, traits.spec2Choices, traits.spec3Choices].forEach((choices) => {
        if (choices) {
          choices.forEach((traitId) => {
            if (traitId) traitIds.push(traitId);
          });
        }
      });

      const [specs, traitsResult] = await Promise.all([
        Promise.all(specIds.map((id) => gw2Api.getSpecialization(id))),
        Promise.all(traitIds.map((id) => gw2Api.getTrait(id))),
      ]);

      const newSpecData: Record<number, GW2Specialization> = {};
      specs.forEach((spec) => {
        newSpecData[spec.id] = spec;
      });
      setSpecData(newSpecData);

      const newTraitData: Record<number, GW2TraitWithModes> = {};
      traitsResult.forEach((trait) => {
        newTraitData[trait.id] = trait;
      });
      setTraitData(newTraitData);
    } catch (error) {
      console.error('Failed to load build data:', error);
    } finally {
      setLoading(false);
    }
  }, [skills, traits]);

  useEffect(() => {
    loadBuildData();
  }, [loadBuildData]);

  const hasSkills = SKILL_SLOT_ORDER.some((slot) => skills[slot]);
  const hasTraits = [traits.spec1, traits.spec2, traits.spec3].some(Boolean);

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-800/80 bg-slate-950/80 p-6">
        <div className="flex items-center justify-center py-12 text-sm text-slate-400">
          Loading preview...
        </div>
      </div>
    );
  }

  if (!hasSkills && !hasTraits) {
    return (
      <div className="rounded-3xl border border-slate-800/80 bg-slate-950/80 p-6">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-base font-medium text-slate-200">No selections yet</p>
          <p className="mt-1 max-w-sm text-sm text-slate-400">
            Choose skills or traits on the left to see them previewed here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Skills Preview */}
      {hasSkills && (
        <div className="rounded-3xl border border-slate-800/80 bg-slate-950/80 p-6">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-400">
            Skills
          </h3>
          <div className="grid grid-cols-5 gap-3">
            {SKILL_SLOT_ORDER.map((slot) => {
              const skill = skillData[slot];
              const skillDetails = skill ? resolveSkillMode(skill, gameMode) : undefined;
              return (
                <div key={slot} className="flex flex-col items-center">
                  <div className="text-[10px] uppercase tracking-wide text-slate-500 mb-2">
                    {SKILL_LABELS[slot]}
                  </div>
                  {skill ? (
                    <Tooltip title={skill.name} content={skillDetails?.description || ''} icon={skill.icon}>
                      <div className="relative group cursor-pointer">
                        <div className="h-16 w-16 overflow-hidden rounded-xl border-2 border-slate-700 bg-slate-900 transition group-hover:border-yellow-400">
                          <img
                            src={skill.icon}
                            alt={skill.name}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      </div>
                    </Tooltip>
                  ) : (
                    <div className="h-16 w-16 rounded-xl border-2 border-dashed border-slate-800 bg-slate-900/50 flex items-center justify-center">
                      <span className="text-xs text-slate-600">Empty</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Traits Preview */}
      {hasTraits && (
        <div className="rounded-3xl border border-slate-800/80 bg-slate-950/80 p-6">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-400">
            Specializations
          </h3>
          <div className="space-y-4">
            {[1, 2, 3].map((slotNum) => {
              const specId = traits[`spec${slotNum}` as keyof typeof traits] as number | undefined;
              const choices = traits[`spec${slotNum}Choices` as keyof typeof traits] as [number | null, number | null, number | null] | undefined;

              if (!specId) return null;

              const spec = specData[specId];
              if (!spec) return null;

              return (
                <div key={slotNum} className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <img src={spec.icon} alt={spec.name} className="h-8 w-8 rounded-lg" />
                    <div>
                      <div className="text-sm font-semibold text-white">{spec.name}</div>
                      {spec.elite && (
                        <div className="text-xs text-yellow-400">Elite Specialization</div>
                      )}
                    </div>
                  </div>

                  {choices && (
                    <div className="flex gap-2">
                      {choices.map((traitId, idx) => {
                        if (!traitId) return (
                          <div key={idx} className="h-12 w-12 rounded-lg border-2 border-dashed border-slate-800 bg-slate-900/50" />
                        );

                        const trait = traitData[traitId];
                        if (!trait) return null;

                        const traitDetails = resolveTraitMode(trait, gameMode);

                        return (
                          <Tooltip key={traitId} title={trait.name} content={traitDetails?.description || ''} icon={trait.icon}>
                            <div className="relative group cursor-pointer">
                              <div className="h-12 w-12 overflow-hidden rounded-lg border-2 border-yellow-400 bg-slate-900 transition group-hover:border-yellow-300">
                                <img
                                  src={trait.icon}
                                  alt={trait.name}
                                  className="h-full w-full object-cover"
                                />
                              </div>
                            </div>
                          </Tooltip>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
