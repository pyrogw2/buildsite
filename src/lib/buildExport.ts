import type { BuildData } from '../types/gw2';
import { gw2Api } from './gw2api';

/**
 * Generate Discord markdown for a build
 */
export async function generateDiscordMarkdown(build: BuildData, shareUrl: string): Promise<string> {
  try {
    const lines: string[] = [];

    // Header
    lines.push(`**${build.profession} Build**`);
    lines.push('');

    // Equipment summary
    const statCounts = new Map<string, number>();
    build.equipment.forEach(item => {
      statCounts.set(item.stat, (statCounts.get(item.stat) || 0) + 1);
    });

    lines.push('**Equipment:**');
    statCounts.forEach((count, stat) => {
      lines.push(`- ${count}x ${stat}`);
    });

    if (build.relicId) {
      lines.push(`- Relic: ${build.relicId}`);
    }
    lines.push('');

    // Specializations
    lines.push('**Specializations:**');
    for (let i = 1; i <= 3; i++) {
      const specId = build.traits[`spec${i}` as keyof typeof build.traits];
      if (specId && typeof specId === 'number') {
        try {
          const spec = await gw2Api.getSpecialization(specId);
          lines.push(`- ${spec.name}`);
        } catch (error) {
          lines.push(`- Spec ${specId}`);
        }
      }
    }
    lines.push('');

    // Profession Mechanics
    const hasMechanics = build.professionMechanics && (
      build.professionMechanics.evokerFamiliar ||
      build.professionMechanics.revenantLegends ||
      build.professionMechanics.amalgamMorphs ||
      build.professionMechanics.rangerPets
    );

    if (hasMechanics) {
      lines.push('**Profession Mechanics:**');

      // Evoker Familiar
      if (build.professionMechanics?.evokerFamiliar) {
        try {
          const skills = await gw2Api.getSkills(build.profession);
          const familiar = skills.find(s => s.id === build.professionMechanics?.evokerFamiliar);
          if (familiar) {
            lines.push(`- F5 Familiar: ${familiar.name}`);
          } else {
            lines.push(`- F5 Familiar: Skill ID ${build.professionMechanics.evokerFamiliar}`);
          }
        } catch (error) {
          lines.push(`- F5 Familiar: Skill ID ${build.professionMechanics.evokerFamiliar}`);
        }
      }

      // Revenant Legends
      if (build.professionMechanics?.revenantLegends) {
        const legendNames: Record<string, string> = {
          'Legend1': 'Glint',
          'Legend2': 'Shiro',
          'Legend3': 'Jalis',
          'Legend4': 'Mallyx',
          'Legend5': 'Kalla',
          'Legend6': 'Ventari',
          'Legend7': 'Alliance',
          'Legend8': 'Razah',
        };
        if (build.professionMechanics.revenantLegends.legend1) {
          const name = legendNames[build.professionMechanics.revenantLegends.legend1] || build.professionMechanics.revenantLegends.legend1;
          lines.push(`- Legend 1: ${name}`);
        }
        if (build.professionMechanics.revenantLegends.legend2) {
          const name = legendNames[build.professionMechanics.revenantLegends.legend2] || build.professionMechanics.revenantLegends.legend2;
          lines.push(`- Legend 2: ${name}`);
        }
      }

      // Amalgam Morphs
      if (build.professionMechanics?.amalgamMorphs) {
        try {
          // Fetch morph skills directly from API (not in static data)
          const morphIds = [
            build.professionMechanics.amalgamMorphs.slot2,
            build.professionMechanics.amalgamMorphs.slot3,
            build.professionMechanics.amalgamMorphs.slot4,
          ].filter(Boolean);

          const morphSkillsPromises = morphIds.map(id =>
            fetch(`https://api.guildwars2.com/v2/skills/${id}`).then(r => r.json())
          );
          const morphSkills = await Promise.all(morphSkillsPromises);

          if (build.professionMechanics.amalgamMorphs.slot2) {
            const morph = morphSkills.find((s: any) => s.id === build.professionMechanics?.amalgamMorphs?.slot2);
            const name = morph ? morph.name : `Skill ID ${build.professionMechanics.amalgamMorphs.slot2}`;
            lines.push(`- F2 Morph: ${name}`);
          }
          if (build.professionMechanics.amalgamMorphs.slot3) {
            const morph = morphSkills.find((s: any) => s.id === build.professionMechanics?.amalgamMorphs?.slot3);
            const name = morph ? morph.name : `Skill ID ${build.professionMechanics.amalgamMorphs.slot3}`;
            lines.push(`- F3 Morph: ${name}`);
          }
          if (build.professionMechanics.amalgamMorphs.slot4) {
            const morph = morphSkills.find((s: any) => s.id === build.professionMechanics?.amalgamMorphs?.slot4);
            const name = morph ? morph.name : `Skill ID ${build.professionMechanics.amalgamMorphs.slot4}`;
            lines.push(`- F4 Morph: ${name}`);
          }
        } catch (error) {
          if (build.professionMechanics.amalgamMorphs.slot2) {
            lines.push(`- F2 Morph: Skill ID ${build.professionMechanics.amalgamMorphs.slot2}`);
          }
          if (build.professionMechanics.amalgamMorphs.slot3) {
            lines.push(`- F3 Morph: Skill ID ${build.professionMechanics.amalgamMorphs.slot3}`);
          }
          if (build.professionMechanics.amalgamMorphs.slot4) {
            lines.push(`- F4 Morph: Skill ID ${build.professionMechanics.amalgamMorphs.slot4}`);
          }
        }
      }

      // Ranger Pets
      if (build.professionMechanics?.rangerPets) {
        try {
          const base = import.meta.env.BASE_URL;
          const response = await fetch(`${base}data/pets.json`);
          const pets = await response.json();

          if (build.professionMechanics.rangerPets.pet1) {
            const pet = pets.find((p: any) => p.id === build.professionMechanics?.rangerPets?.pet1);
            const name = pet ? pet.name.replace('Juvenile ', '') : `Pet ID ${build.professionMechanics.rangerPets.pet1}`;
            lines.push(`- Pet 1: ${name}`);
          }
          if (build.professionMechanics.rangerPets.pet2) {
            const pet = pets.find((p: any) => p.id === build.professionMechanics?.rangerPets?.pet2);
            const name = pet ? pet.name.replace('Juvenile ', '') : `Pet ID ${build.professionMechanics.rangerPets.pet2}`;
            lines.push(`- Pet 2: ${name}`);
          }
        } catch (error) {
          if (build.professionMechanics.rangerPets.pet1) {
            lines.push(`- Pet 1: Pet ID ${build.professionMechanics.rangerPets.pet1}`);
          }
          if (build.professionMechanics.rangerPets.pet2) {
            lines.push(`- Pet 2: Pet ID ${build.professionMechanics.rangerPets.pet2}`);
          }
        }
      }

      lines.push('');
    }

    // Skills
    if (Object.keys(build.skills).length > 0) {
      lines.push('**Skills:**');
      const skillEntries = Object.entries(build.skills);
      for (const [slot, skillId] of skillEntries) {
        if (skillId) {
          lines.push(`- ${slot}: Skill ID ${skillId}`);
        }
      }
      lines.push('');
    }

    // Share link
    lines.push(`**Build Link:** ${shareUrl}`);

    return lines.join('\n');
  } catch (error) {
    console.error('Failed to generate Discord markdown:', error);
    throw error;
  }
}

/**
 * Generate in-game chat link (template code)
 */
export async function generateChatLink(build: BuildData): Promise<string> {
  try {
    const { exportToChatCode } = await import('./chatCodeConverter');
    return await exportToChatCode(build);
  } catch (error) {
    console.error('Failed to generate chat code:', error);
    throw new Error('Failed to generate chat code: ' + (error instanceof Error ? error.message : String(error)));
  }
}

/**
 * Generate a text summary of the build
 */
export function generateTextSummary(build: BuildData): string {
  const lines: string[] = [];

  lines.push(`=== ${build.profession} Build ===`);
  lines.push('');

  // Infusion ID to name mapping
  const infusionNames: Record<number, string> = {
    43254: 'Mighty Infusion',
    43255: 'Precise Infusion',
    43253: 'Malign Infusion',
    87218: 'Expertise Infusion',
    43251: 'Resilient Infusion',
    43252: 'Vital Infusion',
    43250: 'Healing Infusion',
    86986: 'Concentration Infusion',
  };

  // Equipment
  lines.push('EQUIPMENT:');
  build.equipment.forEach(item => {
    const parts: string[] = [item.slot, item.stat];
    if (item.upgrade) parts.push(item.upgrade);
    if (item.infusion1) parts.push(infusionNames[item.infusion1] || `Infusion ${item.infusion1}`);
    lines.push(`  ${parts.join(' - ')}`);
  });
  lines.push('');

  if (build.relicId) {
    lines.push(`RELIC: ${build.relicId}`);
    lines.push('');
  }

  return lines.join('\n');
}
