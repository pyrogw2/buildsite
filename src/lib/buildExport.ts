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
 * Note: This is a placeholder - actual GW2 chat codes use a specific binary format
 */
export function generateChatLink(_build: BuildData): string {
  // GW2 chat links are complex binary structures
  // For now, we'll return a placeholder
  // A full implementation would need to encode the build according to GW2's chat link spec
  return '[Build Template Code - Not yet implemented]';
}

/**
 * Generate a text summary of the build
 */
export function generateTextSummary(build: BuildData): string {
  const lines: string[] = [];

  lines.push(`=== ${build.profession} Build ===`);
  lines.push('');

  // Equipment
  lines.push('EQUIPMENT:');
  build.equipment.forEach(item => {
    const parts: string[] = [item.slot, item.stat];
    if (item.upgrade) parts.push(item.upgrade);
    if (item.infusion1) parts.push(item.infusion1);
    lines.push(`  ${parts.join(' - ')}`);
  });
  lines.push('');

  if (build.relicId) {
    lines.push(`RELIC: ${build.relicId}`);
    lines.push('');
  }

  return lines.join('\n');
}
