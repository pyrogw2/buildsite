import type {
  GameMode,
  ModeBundle,
  ModeKey,
  GW2SkillWithModes,
  GW2SkillModeData,
  GW2TraitWithModes,
  GW2TraitModeData,
} from '../types/gw2';

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
  if ((result as any)?.facts?.some((f: any) => f.type === 'Recharge')) {
    const recharge = (result as any).facts.find((f: any) => f.type === 'Recharge')?.value;
    const bundleHasWvw = !!bundle.wvw;
    const wvwRecharge = (bundle.wvw as any)?.facts?.find((f: any) => f.type === 'Recharge')?.value;
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
