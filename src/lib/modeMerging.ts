import type {
  GW2SkillModeData,
  GW2SkillWithModes,
  ModeKey,
} from '../types/gw2';

export type NonDefaultMode = Exclude<ModeKey, 'default'>;

export interface SkillModeOverrideInfo {
  baseId: number;
  modes: NonDefaultMode[];
}

export interface SkillModeMergeResult {
  skills: GW2SkillWithModes[];
  overrideLookup: Map<number, SkillModeOverrideInfo>;
}

const LEVEL_PATTERN = /Level\s+\d/;

const buildGroupKey = (skill: GW2SkillWithModes): string => {
  const professions = skill.professions?.slice().sort();
  const categories = skill.categories ? [...skill.categories].sort() : undefined;
  return JSON.stringify({
    name: skill.name,
    professions,
    slot: skill.slot,
    type: skill.type,
    weapon_type: skill.weapon_type,
    categories,
    description: skill.modes.default?.description ?? '',
    flip_skill: skill.flip_skill,
  });
};

const hasSubskillsOrTransforms = (skill: GW2SkillWithModes): boolean => {
  if (skill.subskills && skill.subskills.length > 0) {
    return true;
  }

  if (skill.transform_skill || skill.bundle_skill) {
    return true;
  }

  return false;
};

const hasLevelFacts = (skill: GW2SkillWithModes): boolean => {
  const facts = skill.modes.default?.facts ?? [];
  return facts.some(fact => typeof fact.text === 'string' && LEVEL_PATTERN.test(fact.text));
};

const isCompetitiveCandidate = (skill: GW2SkillWithModes): boolean => {
  if (!skill.professions || skill.professions.length === 0) {
    return false;
  }

  if (hasSubskillsOrTransforms(skill)) {
    return false;
  }

  if (hasLevelFacts(skill)) {
    return false;
  }

  return true;
};

const assignModes = (
  overrides: GW2SkillWithModes[]
): Array<{ skill: GW2SkillWithModes; modes: NonDefaultMode[] }> => {
  if (overrides.length === 0) {
    return [];
  }

  if (overrides.length === 1) {
    return [
      {
        skill: overrides[0],
        modes: ['pvp', 'wvw'],
      },
    ];
  }

  const assignments: Array<{ skill: GW2SkillWithModes; modes: NonDefaultMode[] }> = [];

  assignments.push({ skill: overrides[0], modes: ['pvp'] });
  assignments.push({ skill: overrides[1], modes: ['wvw'] });

  for (const extra of overrides.slice(2)) {
    assignments.push({ skill: extra, modes: ['pvp', 'wvw'] });
  }

  return assignments;
};

export const mergeModeData = (
  base: GW2SkillModeData,
  override?: GW2SkillModeData | null
): GW2SkillModeData => {
  if (!override) {
    return base;
  }

  return {
    ...base,
    ...override,
    description: override.description ?? base.description,
    facts: override.facts ?? base.facts,
    traited_facts: override.traited_facts ?? base.traited_facts,
  };
};

const mergeSkillModeOverride = (
  baseSkill: GW2SkillWithModes,
  overrideSkill: GW2SkillWithModes,
  mode: NonDefaultMode
): GW2SkillWithModes => {
  const baseMode = baseSkill.modes[mode] ?? baseSkill.modes.default;

  return {
    ...baseSkill,
    modes: {
      ...baseSkill.modes,
      [mode]: mergeModeData(baseMode, overrideSkill.modes.default),
    },
  };
};

export const mergeSkillModeOverrides = (
  skills: GW2SkillWithModes[]
): SkillModeMergeResult => {
  const skillMap = new Map<number, GW2SkillWithModes>();
  skills.forEach(skill => {
    skillMap.set(skill.id, skill);
  });

  const groups = new Map<string, GW2SkillWithModes[]>();
  for (const skill of skills) {
    const key = buildGroupKey(skill);
    const group = groups.get(key);
    if (group) {
      group.push(skill);
    } else {
      groups.set(key, [skill]);
    }
  }

  const overrideLookup = new Map<number, SkillModeOverrideInfo>();

  for (const group of groups.values()) {
    if (group.length < 2) {
      continue;
    }

    const candidates = group.filter(isCompetitiveCandidate);
    if (candidates.length < 2) {
      continue;
    }

    const sorted = [...candidates].sort((a, b) => a.id - b.id);
    const baseSkill = sorted[0];
    const overrides = sorted.slice(1);

    let mergedBase = skillMap.get(baseSkill.id);
    if (!mergedBase) {
      continue;
    }

    const assignments = assignModes(overrides);
    for (const { skill: override, modes } of assignments) {
      const overrideEntry = skillMap.get(override.id);
      if (!overrideEntry) {
        continue;
      }

      for (const mode of modes) {
        mergedBase = mergeSkillModeOverride(mergedBase, overrideEntry, mode);
      }

      const existing = overrideLookup.get(override.id);
      const mergedModes = existing
        ? (Array.from(new Set([...existing.modes, ...modes])) as NonDefaultMode[])
        : modes;

      overrideLookup.set(override.id, {
        baseId: baseSkill.id,
        modes: mergedModes,
      });

      skillMap.delete(override.id);
    }

    skillMap.set(baseSkill.id, mergedBase);
  }

  return {
    skills: Array.from(skillMap.values()),
    overrideLookup,
  };
};
