#!/usr/bin/env node

/**
 * Parse GW2 Wiki wikitext infoboxes to extract competitive split data
 */

/**
 * Parse a wikitext infobox (skill or trait)
 * @param {string} wikitext - Raw wikitext content
 * @returns {object|null} Parsed infobox parameters
 */
export function parseInfobox(wikitext) {
  // Match {{Skill infobox ... }} or {{Trait infobox ... }}
  const infoboxMatch = wikitext.match(/\{\{(?:Skill|Trait) infobox\s*([\s\S]*?)\n\}\}/);
  if (!infoboxMatch) return null;

  const infoboxContent = infoboxMatch[1];
  const params = {};

  let currentKey = null;
  let currentValue = [];
  const lines = infoboxContent.split('\n');

  for (const line of lines) {
    // Check if this is a new parameter line
    const paramMatch = line.match(/^\|\s*([^=]+?)\s*=\s*(.*)$/);

    if (paramMatch) {
      // Save previous parameter if exists
      if (currentKey !== null) {
        params[currentKey] = currentValue.join('\n').trim();
      }

      // Start new parameter
      currentKey = paramMatch[1].trim();
      currentValue = [paramMatch[2]];
    } else if (currentKey !== null) {
      // Continuation of previous parameter
      currentValue.push(line);
    }
  }

  // Save last parameter
  if (currentKey !== null) {
    params[currentKey] = currentValue.join('\n').trim();
  }

  return params;
}

/**
 * Parse skill facts from wikitext
 * @param {string} factsText - The value of the "facts" parameter
 * @returns {object} Facts grouped by game mode
 */
export function parseSkillFacts(factsText) {
  if (!factsText) return {};

  const facts = { default: [], pve: [], pvp: [], wvw: [] };

  // Match {{skill fact|...}} patterns
  const factPattern = /\{\{skill fact\|([^}]+)\}\}/g;
  let match;

  while ((match = factPattern.exec(factsText)) !== null) {
    const factParams = parseFactParams(match[1]);
    const rawGameMode = factParams['game mode'];

    // Normalize game mode (lowercase, trim)
    let gameMode = 'default';
    if (rawGameMode) {
      const normalized = rawGameMode.toLowerCase().trim();
      if (normalized === 'pve' || normalized === 'pvp' || normalized === 'wvw') {
        gameMode = normalized;
      }
    }

    const fact = buildFactObject(factParams);
    if (fact) {
      facts[gameMode].push(fact);
    }
  }

  return facts;
}

/**
 * Parse parameters from a skill fact
 * @param {string} paramString - The parameter string from {{skill fact|...}}
 * @returns {object} Parsed parameters
 */
function parseFactParams(paramString) {
  const params = { _positional: [] };
  const parts = paramString.split('|');

  for (const part of parts) {
    const trimmed = part.trim();
    const eqIndex = trimmed.indexOf('=');

    if (eqIndex !== -1) {
      // Named parameter: key=value
      const key = trimmed.substring(0, eqIndex).trim();
      const value = trimmed.substring(eqIndex + 1).trim();
      params[key] = value;
    } else {
      // Positional parameter
      params._positional.push(trimmed);
    }
  }

  return params;
}

/**
 * Build a fact object from parsed parameters
 * @param {object} params - Parsed fact parameters
 * @returns {object|null} Fact object compatible with GW2 API format
 */
function buildFactObject(params) {
  const pos = params._positional;

  // First positional is usually the fact type/name
  const factName = pos[0];
  if (!factName) return null;

  const fact = { text: factName };

  // Map common fact types
  const factTypeLower = factName.toLowerCase();

  if (factTypeLower === 'recharge') {
    fact.type = 'Recharge';
    fact.value = parseFloat(pos[1] || params.value || 0);
  } else if (factTypeLower === 'range') {
    fact.type = 'Range';
    fact.value = parseInt(pos[1] || params.value || 0, 10);
  } else if (factTypeLower === 'radius') {
    fact.type = 'Radius';
    fact.value = parseInt(pos[1] || params.value || 0, 10);
  } else if (factTypeLower === 'damage') {
    fact.type = 'Damage';
    fact.hit_count = parseInt(params.strikes || 1, 10);
    fact.dmg_multiplier = parseFloat(params.coefficient || 0);
  } else if (factTypeLower === 'duration') {
    fact.type = 'Duration';
    fact.duration = parseFloat(pos[1] || params.value || 0);
  } else if (factTypeLower === 'targets') {
    fact.type = 'Number';
    fact.text = 'Number of Targets';
    fact.value = parseInt(pos[1] || params.value || 0, 10);
  } else {
    // For buffs/conditions, first positional is the buff name
    // Check if this is a linked skill (PrefixedBuff)
    if (params['linked skill']) {
      fact.type = 'PrefixedBuff';
      fact.status = factName;
      fact.duration = parseFloat(pos[1] || 0);
      fact.prefix = {
        status: params['linked skill'],
      };

      if (params.stacks) {
        fact.apply_count = parseInt(params.stacks, 10);
      }
    } else {
      // Regular buff
      fact.type = 'Buff';
      fact.status = factName;
      fact.duration = parseFloat(pos[1] || 0);

      if (params.stacks) {
        fact.apply_count = parseInt(params.stacks, 10);
      }
    }
  }

  return fact;
}

/**
 * Extract mode-specific overrides from infobox params
 * @param {object} params - Parsed infobox parameters
 * @returns {object} Mode overrides { pve, pvp, wvw }
 */
export function extractModeOverrides(params) {
  const overrides = {};

  // Helper to create override for a mode
  const addOverride = (mode, factType, value) => {
    if (!overrides[mode]) {
      overrides[mode] = { facts: [] };
    }
    overrides[mode].facts.push({ type: factType, value });
  };

  // Check for recharge overrides
  const baseRecharge = parseFloat(params.recharge);

  if (params['recharge wvw']) {
    const wvwRecharge = parseFloat(params['recharge wvw']);
    if (wvwRecharge !== baseRecharge) {
      addOverride('wvw', 'Recharge', wvwRecharge);
    }
  }

  if (params['recharge pvp']) {
    const pvpRecharge = parseFloat(params['recharge pvp']);
    if (pvpRecharge !== baseRecharge) {
      addOverride('pvp', 'Recharge', pvpRecharge);
    }
  }

  // Check for activation overrides
  const baseActivation = parseFloat(params.activation);

  if (params['activation wvw']) {
    const wvwActivation = parseFloat(params['activation wvw']);
    if (wvwActivation !== baseActivation) {
      if (!overrides.wvw) overrides.wvw = { facts: [] };
      // Activation is not a fact in the API, but we can note it
    }
  }

  if (params['activation pvp']) {
    const pvpActivation = parseFloat(params['activation pvp']);
    if (pvpActivation !== baseActivation) {
      if (!overrides.pvp) overrides.pvp = { facts: [] };
    }
  }

  // Check for range overrides
  const baseRange = parseInt(params.range, 10);

  if (params['range wvw']) {
    const wvwRange = parseInt(params['range wvw'], 10);
    if (wvwRange !== baseRange) {
      addOverride('wvw', 'Range', wvwRange);
    }
  }

  if (params['range pvp']) {
    const pvpRange = parseInt(params['range pvp'], 10);
    if (pvpRange !== baseRange) {
      addOverride('pvp', 'Range', pvpRange);
    }
  }

  return overrides;
}

/**
 * Parse skill IDs from the id parameter
 * @param {string} idParam - Comma-separated skill IDs
 * @returns {number[]} Array of skill IDs
 */
export function parseSkillIds(idParam) {
  if (!idParam) return [];

  return idParam
    .split(',')
    .map(id => parseInt(id.trim(), 10))
    .filter(id => !isNaN(id));
}

/**
 * Main function to extract competitive split data from wikitext
 * @param {string} wikitext - Raw wikitext
 * @returns {object|null} Structured competitive split data
 */
export function extractCompetitiveSplits(wikitext) {
  const infobox = parseInfobox(wikitext);
  if (!infobox) return null;

  const skillIds = parseSkillIds(infobox.id);
  const facts = parseSkillFacts(infobox.facts);
  const overrides = extractModeOverrides(infobox);

  // Merge facts from parsed skill facts with overrides
  ['pve', 'pvp', 'wvw'].forEach(mode => {
    if (facts[mode] && facts[mode].length > 0) {
      if (!overrides[mode]) {
        overrides[mode] = { facts: [] };
      }
      overrides[mode].facts.push(...facts[mode]);
    }
  });

  return {
    ids: skillIds,
    split: infobox.split,
    overrides,
  };
}
