import { Buffer } from 'buffer';
import { encodeBuildTemplate, decodeBuildTemplate } from 'gw2buildlink';
import type { BuildTemplateInput, DecodedBuildTemplate } from 'gw2buildlink';
import type { BuildData } from '../types/gw2';

// Make Buffer available globally for gw2buildlink
if (typeof window !== 'undefined') {
  (window as any).Buffer = Buffer;
}

/**
 * Convert our BuildData format to gw2buildlink's BuildTemplateInput format
 */
export function buildDataToBuildTemplate(build: BuildData): BuildTemplateInput {
  // Convert specializations - we need to pass trait IDs, not choice positions
  // The library will handle resolving them through our API client
  const specializations: BuildTemplateInput['specializations'] = [
    build.traits.spec1 ? {
      id: build.traits.spec1,
      traits: build.traits.spec1Choices || [undefined, undefined, undefined],
    } : undefined,
    build.traits.spec2 ? {
      id: build.traits.spec2,
      traits: build.traits.spec2Choices || [undefined, undefined, undefined],
    } : undefined,
    build.traits.spec3 ? {
      id: build.traits.spec3,
      traits: build.traits.spec3Choices || [undefined, undefined, undefined],
    } : undefined,
  ];

  // Convert skills - provide both terrestrial and aquatic
  // Use terrestrial skills for aquatic if no aquatic-specific skills are set
  const skills: BuildTemplateInput['skills'] = {
    terrestrial: {
      heal: build.skills.heal,
      utilities: [
        build.skills.utility1,
        build.skills.utility2,
        build.skills.utility3,
      ],
      elite: build.skills.elite,
    },
    aquatic: {
      heal: build.skills.heal,
      utilities: [
        build.skills.utility1,
        build.skills.utility2,
        build.skills.utility3,
      ],
      elite: build.skills.elite,
    },
  };

  const template: BuildTemplateInput = {
    profession: build.profession,
    specializations,
    skills,
  };

  console.log('Converting BuildData to BuildTemplateInput:', template);
  return template;
}

/**
 * Convert gw2buildlink's DecodedBuildTemplate back to our BuildData format
 */
export function buildTemplateToBuildData(
  decoded: DecodedBuildTemplate,
  gameMode: BuildData['gameMode'] = 'PvE'
): BuildData {
  // Convert profession - handle both string name and id
  const professionName = decoded.profession.name || decoded.profession.id;
  const profession = professionName.charAt(0).toUpperCase() + professionName.slice(1) as BuildData['profession'];

  // Convert skills - use terrestrial skills by default
  const skills: BuildData['skills'] = {};

  console.log('Processing skills from decoded template:', decoded.skills);

  if (decoded.skills?.terrestrial) {
    console.log('Terrestrial skills found:', decoded.skills.terrestrial);

    if (decoded.skills.terrestrial.heal?.skillId) {
      skills.heal = decoded.skills.terrestrial.heal.skillId;
      console.log('Set heal skill:', skills.heal, decoded.skills.terrestrial.heal.name);
    }

    if (decoded.skills.terrestrial.utilities) {
      const utils = decoded.skills.terrestrial.utilities;
      if (utils[0]?.skillId) {
        skills.utility1 = utils[0].skillId;
        console.log('Set utility1:', skills.utility1, utils[0].name);
      }
      if (utils[1]?.skillId) {
        skills.utility2 = utils[1].skillId;
        console.log('Set utility2:', skills.utility2, utils[1].name);
      }
      if (utils[2]?.skillId) {
        skills.utility3 = utils[2].skillId;
        console.log('Set utility3:', skills.utility3, utils[2].name);
      }
    }

    if (decoded.skills.terrestrial.elite?.skillId) {
      skills.elite = decoded.skills.terrestrial.elite.skillId;
      console.log('Set elite skill:', skills.elite, decoded.skills.terrestrial.elite.name);
    }
  }

  console.log('Final skills object:', skills);

  // Convert traits
  const traits: BuildData['traits'] = {};

  if (decoded.specializations && Array.isArray(decoded.specializations)) {
    decoded.specializations.forEach((spec, index) => {
      if (!spec || !spec.id) return;

      const specNum = (index + 1) as 1 | 2 | 3;
      const specKey = `spec${specNum}` as const;
      const choicesKey = `spec${specNum}Choices` as const;

      traits[specKey] = spec.id;

      if (spec.traits && Array.isArray(spec.traits)) {
        traits[choicesKey] = [
          spec.traits[0]?.traitId || null,
          spec.traits[1]?.traitId || null,
          spec.traits[2]?.traitId || null,
        ];
      }
    });
  }

  // Create default equipment (we don't have equipment in chat codes)
  const equipment: BuildData['equipment'] = [];

  // Add default armor
  const armorSlots = ['Helm', 'Shoulders', 'Coat', 'Gloves', 'Leggings', 'Boots'] as const;
  armorSlots.forEach(slot => {
    equipment.push({ slot, stat: 'Berserker' });
  });

  // Add default trinkets
  const trinketSlots = ['Backpack', 'Accessory1', 'Accessory2', 'Amulet', 'Ring1', 'Ring2'] as const;
  trinketSlots.forEach(slot => {
    equipment.push({ slot, stat: 'Berserker' });
  });

  // Add weapons based on the decoded weapons if available
  const weaponSlots = ['MainHand1', 'OffHand1', 'MainHand2', 'OffHand2'] as const;
  weaponSlots.forEach(slot => {
    equipment.push({ slot, stat: 'Berserker' });
  });

  return {
    profession,
    gameMode,
    equipment,
    skills,
    traits,
  };
}

/**
 * Export build as GW2 chat code
 */
export async function exportToChatCode(build: BuildData): Promise<string> {
  try {
    console.log('Exporting build to chat code:', build);
    const { LocalGw2ApiClient } = await import('./gw2buildlinkApiClient');
    const api = new LocalGw2ApiClient();

    const template = buildDataToBuildTemplate(build);
    console.log('Calling encodeBuildTemplate with:', template);

    const chatCode = await encodeBuildTemplate(template, { api });
    console.log('Generated chat code:', chatCode);

    return chatCode;
  } catch (error) {
    console.error('Error in exportToChatCode:', error);
    throw error;
  }
}

/**
 * Import build from GW2 chat code
 */
export async function importFromChatCode(
  chatCode: string,
  gameMode: BuildData['gameMode'] = 'PvE'
): Promise<BuildData> {
  try {
    console.log('Attempting to decode chat code:', chatCode);

    // Use our custom API client to avoid CORS issues
    const { LocalGw2ApiClient } = await import('./gw2buildlinkApiClient');
    const api = new LocalGw2ApiClient();

    const decoded = await decodeBuildTemplate(chatCode, { api });
    console.log('Decoded build template:', decoded);
    const buildData = buildTemplateToBuildData(decoded, gameMode);
    console.log('Converted to BuildData:', buildData);
    return buildData;
  } catch (error) {
    console.error('Error details in importFromChatCode:', error);
    throw error;
  }
}
