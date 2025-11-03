import { create } from 'zustand';
import type { BuildData, Profession, Equipment, StatCombo, InfusionType, ArmorSlot, TrinketSlot, WeaponSlot, GameMode } from '../types/gw2';

interface BuildStore extends Omit<BuildData, 'profession'> {
  profession: Profession | undefined;
  // Actions
  setProfession: (profession: Profession) => void;
  setGameMode: (mode: GameMode) => void;
  updateEquipment: (slot: string, updates: Partial<Equipment>) => void;
  applyStatToCategory: (category: 'armor' | 'trinkets' | 'weapons' | 'all', stat: StatCombo) => void;
  applyInfusionToCategory: (category: 'armor' | 'trinkets' | 'weapons' | 'all', infusion: InfusionType) => void;
  setSkill: (slot: keyof BuildData['skills'], skillId: number) => void;
  setSpecialization: (specSlot: 1 | 2 | 3, specId: number) => void;
  setTrait: (specSlot: 1 | 2 | 3, tier: 0 | 1 | 2, traitId: number | null) => void;
  setRuneId: (runeId: number | undefined) => void;
  setRelicId: (relicId: number | undefined) => void;
  loadBuild: (build: BuildData) => void;
  resetBuild: () => void;
}

const ARMOR_SLOTS: ArmorSlot[] = ['Helm', 'Shoulders', 'Coat', 'Gloves', 'Leggings', 'Boots'];
const TRINKET_SLOTS: TrinketSlot[] = ['Backpack', 'Accessory1', 'Accessory2', 'Amulet', 'Ring1', 'Ring2'];
const WEAPON_SLOTS: WeaponSlot[] = ['MainHand1', 'OffHand1', 'MainHand2', 'OffHand2'];

const initialEquipment: Equipment[] = [
  ...ARMOR_SLOTS.map(slot => ({ slot, stat: 'Berserker' as StatCombo })),
  ...TRINKET_SLOTS.map(slot => ({ slot, stat: 'Berserker' as StatCombo })),
  ...WEAPON_SLOTS.map(slot => ({ slot, stat: 'Berserker' as StatCombo })),
];

const initialBuild: Partial<BuildData> = {
  profession: undefined,
  gameMode: 'PvE',
  equipment: initialEquipment,
  skills: {},
  traits: {},
};

export const useBuildStore = create<BuildStore>((set) => ({
  ...initialBuild,
  profession: undefined,
  gameMode: 'PvE',
  equipment: initialEquipment,
  skills: {},
  traits: {},

  setProfession: (profession) =>
    set({ profession, skills: {}, traits: {} }),

  setGameMode: (gameMode) =>
    set({ gameMode }),

  updateEquipment: (slot, updates) =>
    set((state) => ({
      equipment: state.equipment.map((item) =>
        item.slot === slot ? { ...item, ...updates } : item
      ),
    })),

  applyStatToCategory: (category, stat) =>
    set((state) => {
      let slotsToUpdate: string[] = [];

      switch (category) {
        case 'armor':
          slotsToUpdate = ARMOR_SLOTS;
          break;
        case 'trinkets':
          slotsToUpdate = TRINKET_SLOTS;
          break;
        case 'weapons':
          slotsToUpdate = WEAPON_SLOTS;
          break;
        case 'all':
          slotsToUpdate = [...ARMOR_SLOTS, ...TRINKET_SLOTS, ...WEAPON_SLOTS];
          break;
      }

      return {
        equipment: state.equipment.map((item) =>
          slotsToUpdate.includes(item.slot) ? { ...item, stat } : item
        ),
      };
    }),

  applyInfusionToCategory: (category, infusion) =>
    set((state) => {
      let slotsToUpdate: string[] = [];

      switch (category) {
        case 'armor':
          slotsToUpdate = ARMOR_SLOTS;
          break;
        case 'trinkets':
          slotsToUpdate = TRINKET_SLOTS;
          break;
        case 'weapons':
          slotsToUpdate = WEAPON_SLOTS;
          break;
        case 'all':
          slotsToUpdate = [...ARMOR_SLOTS, ...TRINKET_SLOTS, ...WEAPON_SLOTS];
          break;
      }

      return {
        equipment: state.equipment.map((item) =>
          slotsToUpdate.includes(item.slot)
            ? { ...item, infusion1: infusion }
            : item
        ),
      };
    }),

  setSkill: (slot, skillId) =>
    set((state) => ({
      skills: { ...state.skills, [slot]: skillId },
    })),

  setSpecialization: (specSlot, specId) =>
    set((state) => {
      const key = `spec${specSlot}` as const;
      const choicesKey = `spec${specSlot}Choices` as const;
      return {
        traits: {
          ...state.traits,
          [key]: specId,
          [choicesKey]: [null, null, null],
        },
      };
    }),

  setTrait: (specSlot, tier, traitId) =>
    set((state) => {
      const choicesKey = `spec${specSlot}Choices` as const;
      const currentChoices = state.traits[choicesKey] || [null, null, null];
      const newChoices = [...currentChoices] as [
        number | null,
        number | null,
        number | null
      ];
      newChoices[tier] = traitId;

      return {
        traits: {
          ...state.traits,
          [choicesKey]: newChoices,
        },
      };
    }),

  setRuneId: (runeId) => set({ runeId }),

  setRelicId: (relicId) => set({ relicId }),

  loadBuild: (build) => set(build),

  resetBuild: () => set(initialBuild),
}));
