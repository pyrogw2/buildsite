#!/usr/bin/env node

import { extractCompetitiveSplits } from './wiki-parser.js';

const WIKI_BASE = 'https://wiki.guildwars2.com/index.php';

/**
 * Fetch the edit page for a skill/trait from the wiki
 * @param {string} name - The skill/trait name
 * @returns {Promise<string|null>} The wikitext content
 */
async function fetchWikiEditPage(name) {
  // Convert spaces to underscores for wiki URLs
  const pageName = name.replace(/ /g, '_');
  const url = `${WIKI_BASE}?title=${encodeURIComponent(pageName)}&action=edit`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'GW2BuildSite/1.0 (https://github.com/your-repo; data collection for build editor)',
      },
    });
    if (!response.ok) {
      return null;
    }

    const html = await response.text();

    // Extract wikitext from the textarea with id="wpTextbox1"
    const match = html.match(/<textarea[^>]*id="wpTextbox1"[^>]*>([\s\S]*?)<\/textarea>/);
    if (!match) {
      return null;
    }

    // Decode HTML entities
    let wikitext = match[1];
    wikitext = wikitext
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/&amp;/g, '&');

    return wikitext;
  } catch (error) {
    console.error(`  ⚠️  Failed to fetch wiki page for "${name}":`, error.message);
    return null;
  }
}

/**
 * Scrape competitive split data for a skill
 * @param {object} skill - Skill object from GW2 API
 * @returns {Promise<object|null>} Competitive split data
 */
export async function scrapeSkillSplits(skill) {
  const wikitext = await fetchWikiEditPage(skill.name);
  if (!wikitext) return null;

  const splits = extractCompetitiveSplits(wikitext);
  if (!splits || Object.keys(splits.overrides).length === 0) {
    return null;
  }

  return splits;
}

/**
 * Scrape competitive split data for a trait
 * @param {object} trait - Trait object from GW2 API
 * @returns {Promise<object|null>} Competitive split data
 */
export async function scrapeTraitSplits(trait) {
  const wikitext = await fetchWikiEditPage(trait.name);
  if (!wikitext) return null;

  const splits = extractCompetitiveSplits(wikitext);
  if (!splits || Object.keys(splits.overrides).length === 0) {
    return null;
  }

  return splits;
}

/**
 * Enrich skills with competitive split data from wiki
 * @param {object[]} skills - Array of skills from GW2 API
 * @param {object} options - Options { delay, logProgress }
 * @returns {Promise<object[]>} Enriched skills
 */
export async function enrichSkillsWithSplits(skills, options = {}) {
  const { delay = 500, logProgress = true } = options;

  const enrichedSkills = [];
  const splitsMap = new Map(); // Map skill names to their splits

  for (let i = 0; i < skills.length; i++) {
    const skill = skills[i];

    if (logProgress && i % 10 === 0) {
      console.log(`  Processing skill ${i + 1}/${skills.length}...`);
    }

    // Check if we already have splits for this skill name
    if (!splitsMap.has(skill.name)) {
      const splits = await scrapeSkillSplits(skill);
      splitsMap.set(skill.name, splits);

      // Be nice to the wiki server
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    const splits = splitsMap.get(skill.name);

    // Merge splits into skill
    const enrichedSkill = { ...skill };

    if (splits && splits.overrides) {
      if (splits.overrides.pve) {
        enrichedSkill.pve = mergeOverride(skill, splits.overrides.pve);
      }
      if (splits.overrides.pvp) {
        enrichedSkill.pvp = mergeOverride(skill, splits.overrides.pvp);
      }
      if (splits.overrides.wvw) {
        enrichedSkill.wvw = mergeOverride(skill, splits.overrides.wvw);
      }

      // Handle mode-exclusive facts: if a mode has exclusive facts but other split modes don't have overrides,
      // create overrides for those modes that exclude the exclusive facts
      if (splits.split && splits.split.includes(',')) {
        const splitModes = splits.split.split(',').map(m => m.trim().toLowerCase());

        // Check if PvE has exclusive facts
        if (splits.overrides.pve && splits.overrides.pve.facts) {
          const pveFactStatuses = new Set(
            splits.overrides.pve.facts.map(f => f.status).filter(Boolean)
          );

          // Create WvW/PvP overrides that exclude PvE-only facts
          if (splitModes.includes('wvw') || splitModes.includes('wvw pvp')) {
            if (!enrichedSkill.wvw && skill.facts) {
              enrichedSkill.wvw = {
                facts: skill.facts.filter(f => !pveFactStatuses.has(f.status))
              };
            }
          }
          if (splitModes.includes('pvp') || splitModes.includes('wvw pvp')) {
            if (!enrichedSkill.pvp && skill.facts) {
              enrichedSkill.pvp = {
                facts: skill.facts.filter(f => !pveFactStatuses.has(f.status))
              };
            }
          }
        }
      }
    }

    enrichedSkills.push(enrichedSkill);
  }

  return enrichedSkills;
}

/**
 * Enrich traits with competitive split data from wiki
 * @param {object[]} traits - Array of traits from GW2 API
 * @param {object} options - Options { delay, logProgress }
 * @returns {Promise<object[]>} Enriched traits
 */
export async function enrichTraitsWithSplits(traits, options = {}) {
  const { delay = 500, logProgress = true } = options;

  const enrichedTraits = [];
  const splitsMap = new Map();

  for (let i = 0; i < traits.length; i++) {
    const trait = traits[i];

    if (logProgress && i % 10 === 0) {
      console.log(`  Processing trait ${i + 1}/${traits.length}...`);
    }

    if (!splitsMap.has(trait.name)) {
      const splits = await scrapeTraitSplits(trait);
      splitsMap.set(trait.name, splits);

      await new Promise(resolve => setTimeout(resolve, delay));
    }

    const splits = splitsMap.get(trait.name);

    const enrichedTrait = { ...trait };

    if (splits && splits.overrides) {
      if (splits.overrides.pve) {
        enrichedTrait.pve = mergeOverride(trait, splits.overrides.pve);
      }
      if (splits.overrides.pvp) {
        enrichedTrait.pvp = mergeOverride(trait, splits.overrides.pvp);
      }
      if (splits.overrides.wvw) {
        enrichedTrait.wvw = mergeOverride(trait, splits.overrides.wvw);
      }

      // Handle mode-exclusive facts: if a mode has exclusive facts but other split modes don't have overrides,
      // create overrides for those modes that exclude the exclusive facts
      if (splits.split && splits.split.includes(',')) {
        const splitModes = splits.split.split(',').map(m => m.trim().toLowerCase());

        // Check if PvE has exclusive facts
        if (splits.overrides.pve && splits.overrides.pve.facts) {
          const pveFactStatuses = new Set(
            splits.overrides.pve.facts.map(f => f.status).filter(Boolean)
          );

          // Create WvW/PvP overrides that exclude PvE-only facts
          if (splitModes.includes('wvw') || splitModes.includes('wvw pvp')) {
            if (!enrichedTrait.wvw && trait.facts) {
              enrichedTrait.wvw = {
                facts: trait.facts.filter(f => !pveFactStatuses.has(f.status))
              };
            }
          }
          if (splitModes.includes('pvp') || splitModes.includes('wvw pvp')) {
            if (!enrichedTrait.pvp && trait.facts) {
              enrichedTrait.pvp = {
                facts: trait.facts.filter(f => !pveFactStatuses.has(f.status))
              };
            }
          }
        }
      }
    }

    enrichedTraits.push(enrichedTrait);
  }

  return enrichedTraits;
}

/**
 * Merge wiki override into skill/trait data
 * @param {object} base - Base skill/trait from API
 * @param {object} override - Override data from wiki
 * @returns {object} Merged override
 */
function mergeOverride(base, override) {
  const merged = { ...override };

  // If override has facts, we need to merge them with base facts
  if (override.facts && override.facts.length > 0) {
    const baseFacts = base.facts || [];
    const overrideFacts = override.facts;

    // Start with base facts
    const mergedFacts = [...baseFacts];

    // Apply overrides (replace facts of the same type)
    for (const overrideFact of overrideFacts) {
      // Match by type, and optionally by text if both have text defined
      const existingIndex = mergedFacts.findIndex(f => {
        if (f.type !== overrideFact.type) return false;
        // If either fact has no text, match by type only
        if (!f.text || !overrideFact.text) return true;
        // If both have text, they must match (case-insensitive)
        return f.text.toLowerCase() === overrideFact.text.toLowerCase();
      });

      if (existingIndex !== -1) {
        // Replace existing fact, preserving text if override doesn't have it
        mergedFacts[existingIndex] = {
          ...mergedFacts[existingIndex],
          ...overrideFact,
          text: overrideFact.text || mergedFacts[existingIndex].text,
        };
      } else {
        // Add new fact
        mergedFacts.push(overrideFact);
      }
    }

    merged.facts = mergedFacts;
  }

  return merged;
}

/**
 * Get statistics on competitive splits found
 * @param {object[]} items - Array of skills or traits
 * @returns {object} Statistics
 */
export function getSplitStats(items) {
  let totalItems = items.length;
  let itemsWithPve = 0;
  let itemsWithPvp = 0;
  let itemsWithWvw = 0;

  for (const item of items) {
    if (item.pve) itemsWithPve++;
    if (item.pvp) itemsWithPvp++;
    if (item.wvw) itemsWithWvw++;
  }

  return {
    total: totalItems,
    withPve: itemsWithPve,
    withPvp: itemsWithPvp,
    withWvw: itemsWithWvw,
    withAnySplit: new Set([...items.filter(i => i.pve || i.pvp || i.wvw)]).size,
  };
}
