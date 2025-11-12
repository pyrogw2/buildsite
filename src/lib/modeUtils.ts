import type {
  GameMode,
  ModeBundle,
  ModeKey,
  GW2SkillWithModes,
  GW2SkillModeData,
  GW2TraitWithModes,
  GW2TraitModeData,
  GW2Fact,
} from '../types/gw2';

// Extended type for mode data with facts
interface ModeDataWithFacts {
  facts?: GW2Fact[];
  [key: string]: unknown;
}

export const gameModeToKey = (gameMode?: GameMode): ModeKey => {
  switch (gameMode) {
    case 'PvE':
      return 'pve';
    case 'PvP':
      return 'pvp';
    case 'WvW':
      return 'wvw';
    default:
      return 'default';
  }
};

export const resolveMode = <T>(bundle: ModeBundle<T>, gameMode?: GameMode): T => {
  const key = gameModeToKey(gameMode);
  if (key === 'default') {
    return bundle.default;
  }
  const result = bundle[key] ?? bundle.default;

  // Debug logging
  const resultWithFacts = result as ModeDataWithFacts;
  if (resultWithFacts?.facts?.some((f: GW2Fact) => f.type === 'Recharge')) {
    const recharge = resultWithFacts.facts.find((f: GW2Fact) => f.type === 'Recharge')?.value;
    const bundleHasWvw = !!bundle.wvw;
    const wvwWithFacts = bundle.wvw as ModeDataWithFacts;
    const wvwRecharge = wvwWithFacts?.facts?.find((f: GW2Fact) => f.type === 'Recharge')?.value;
    if (recharge === 32 || recharge === 40) {
      console.log('resolveMode debug:', { key, bundleHasWvw, wvwRecharge, resultRecharge: recharge });
    }
  }

  return result;
};

export const resolveSkillMode = (
  skill: GW2SkillWithModes,
  gameMode?: GameMode
): GW2SkillModeData => resolveMode(skill.modes, gameMode);

export const resolveTraitMode = (
  trait: GW2TraitWithModes,
  gameMode?: GameMode
): GW2TraitModeData => resolveMode(trait.modes, gameMode);
