# GW2 Wiki Scraping Guide

## Overview

The official GW2 API doesn't provide competitive split data (PvP/WvW balance changes). This data must be scraped from the GW2 Wiki's edit pages, which contain structured wikitext with game mode-specific values.

## Wiki URLs

### Skills
```
https://wiki.guildwars2.com/index.php?title={Skill_Name}&action=edit
```
Example: `https://wiki.guildwars2.com/index.php?title=Well_of_Corruption&action=edit`

### Traits
```
https://wiki.guildwars2.com/index.php?title={Trait_Name}&action=edit
```
Example: `https://wiki.guildwars2.com/index.php?title=New_Genes&action=edit`

## Wiki Format Structure

### Skill Infobox Format

```wikitext
{{Skill infobox
| split = pve, wvw, pvp
| description = ...
| facts =
{{skill fact|damage|strikes=6|weapon=utility|coefficient=3.0|game mode = pve}}
{{skill fact|damage|strikes=6|weapon=utility|coefficient=1.68|game mode = wvw}}
{{skill fact|damage|strikes=6|weapon=utility|coefficient=2.7|game mode = pvp}}
{{skill fact|targets|5}}
{{skill fact|radius|240}}
| recharge = 32
| recharge wvw = 40
| recharge pvp = 32
| id = 10545, 10671
}}
```

### Trait Infobox Format

```wikitext
{{Trait infobox
| split = pve, wvw pvp
| description = ...
| facts =
{{skill fact|Alacrity|6|game mode=pve}}
{{skill fact|Might|6|stacks=3}}
{{skill fact|Protection|4|linked skill=Defensive Protocol: Protect}}
| id = 2387
}}
```

## Key Patterns

### 1. Split Modes Declaration

```wikitext
| split = pve, wvw, pvp
```
- Indicates which game modes have different values
- Can be:
  - `pve, wvw, pvp` - All three modes differ
  - `pve, wvw pvp` - PvE differs, but WvW and PvP are the same
  - `pve pvp, wvw` - PvE and PvP same, WvW differs
  - Not present - All modes use the same values

### 2. Mode-Specific Facts

Facts can have `game mode = {mode}` parameter:

```wikitext
{{skill fact|damage|coefficient=3.0|game mode = pve}}
{{skill fact|damage|coefficient=1.68|game mode = wvw}}
{{skill fact|damage|coefficient=2.7|game mode = pvp}}
```

**Without game mode parameter** = applies to all modes (unless overridden)

### 3. Mode-Specific Properties

Top-level properties can have mode suffixes:

```wikitext
| recharge = 32          # Default (PvE)
| recharge wvw = 40      # WvW override
| recharge pvp = 32      # PvP override (same as default)
```

Common mode-specific properties:
- `recharge`, `recharge wvw`, `recharge pvp`
- `activation`, `activation wvw`, `activation pvp`
- `range`, `range wvw`, `range pvp`

### 4. Skill IDs

```wikitext
| id = 10545, 10671
```
- Comma-separated list of skill IDs
- Multiple IDs indicate variants (elite spec versions, etc.)
- Our system needs to map these correctly

## Data Mapping Strategy

### Our Current Data Structure

```typescript
interface GW2Skill {
  id: number;
  name: string;
  description: string;
  facts?: GW2Fact[];
  // Mode-specific overrides
  pve?: { description?: string; facts?: GW2Fact[] };
  pvp?: { description?: string; facts?: GW2Fact[] };
  wvw?: { description?: string; facts?: GW2Fact[] };
}

interface GW2Fact {
  type: string;
  text?: string;
  value?: number;
  duration?: number;
  // etc.
}
```

### Parsing Strategy

1. **Extract base values** - Properties without mode suffixes
2. **Extract mode-specific overrides** - Properties with `wvw` or `pvp` suffixes
3. **Parse facts** - Group by `game mode` parameter
4. **Merge with API data** - Wiki only provides CHANGES, API has full data

### Example Transformation

**Wiki Data:**
```wikitext
| recharge = 32
| recharge wvw = 40
```

**Our Data Structure:**
```json
{
  "id": 10545,
  "name": "Well of Corruption",
  "facts": [
    { "type": "Recharge", "value": 32 }
  ],
  "wvw": {
    "facts": [
      { "type": "Recharge", "value": 40 }
    ]
  }
}
```

## Parsing Implementation Plan

### Step 1: Fetch Wiki Edit Pages

```javascript
async function fetchWikiEditPage(skillName) {
  const url = `https://wiki.guildwars2.com/index.php?title=${encodeURIComponent(skillName)}&action=edit`;
  const response = await fetch(url);
  const html = await response.text();

  // Extract wikitext from textarea
  const match = html.match(/<textarea[^>]*id="wpTextbox1"[^>]*>([\s\S]*?)<\/textarea>/);
  return match ? match[1] : null;
}
```

### Step 2: Parse Wikitext Infobox

```javascript
function parseSkillInfobox(wikitext) {
  // Find {{Skill infobox ... }}
  const infoboxMatch = wikitext.match(/\{\{Skill infobox\s*([\s\S]*?)\n\}\}/);
  if (!infoboxMatch) return null;

  const infoboxContent = infoboxMatch[1];

  // Parse key-value pairs
  const params = {};
  const lines = infoboxContent.split('\n');

  for (const line of lines) {
    const match = line.match(/^\|\s*([^=]+?)\s*=\s*(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      params[key] = value;
    }
  }

  return params;
}
```

### Step 3: Parse Skill Facts

```javascript
function parseSkillFacts(factsText) {
  // Match {{skill fact|...}} patterns
  const factMatches = factsText.matchAll(/\{\{skill fact\|([^}]+)\}\}/g);

  const facts = { default: [], pve: [], pvp: [], wvw: [] };

  for (const match of factMatches) {
    const params = parseFactParams(match[1]);
    const gameMode = params['game mode'] || 'default';

    const fact = buildFactObject(params);
    facts[gameMode].push(fact);
  }

  return facts;
}

function parseFactParams(paramString) {
  const params = {};
  const parts = paramString.split('|');

  for (const part of parts) {
    const [key, value] = part.split('=').map(s => s.trim());
    if (value) {
      params[key] = value;
    } else {
      // Positional parameter
      if (!params._positional) params._positional = [];
      params._positional.push(key);
    }
  }

  return params;
}
```

### Step 4: Build Mode Overrides

```javascript
function buildModeOverrides(params) {
  const overrides = { pve: null, pvp: null, wvw: null };

  // Check for mode-specific recharge
  if (params['recharge wvw']) {
    overrides.wvw = { facts: [{ type: 'Recharge', value: parseInt(params['recharge wvw']) }] };
  }

  if (params['recharge pvp']) {
    overrides.pvp = { facts: [{ type: 'Recharge', value: parseInt(params['recharge pvp']) }] };
  }

  // Similar for other properties...

  return overrides;
}
```

### Step 5: Merge with API Data

```javascript
async function enrichSkillWithWikiData(apiSkill) {
  const wikitext = await fetchWikiEditPage(apiSkill.name);
  if (!wikitext) return apiSkill;

  const infobox = parseSkillInfobox(wikitext);
  if (!infobox) return apiSkill;

  const overrides = buildModeOverrides(infobox);
  const wikiFacts = parseSkillFacts(infobox.facts || '');

  // Merge overrides into API skill data
  const enrichedSkill = { ...apiSkill };

  if (overrides.pve) enrichedSkill.pve = mergeDeep(apiSkill.pve, overrides.pve);
  if (overrides.pvp) enrichedSkill.pvp = mergeDeep(apiSkill.pvp, overrides.pvp);
  if (overrides.wvw) enrichedSkill.wvw = mergeDeep(apiSkill.wvw, overrides.wvw);

  return enrichedSkill;
}
```

## Edge Cases & Gotchas

### 1. Name Mismatches

Wiki page names may differ from API skill names:
- Spaces vs underscores
- Special characters encoded differently
- Redirect pages

**Solution**: Build a mapping file or use wiki search API

### 2. Split Logic Ambiguity

```wikitext
| split = pve, wvw pvp
```

This means:
- PvE has unique values
- WvW and PvP share the SAME values (different from PvE)

**Not**:
- Three separate sets of values

Parse the split parameter to understand groupings.

### 3. Missing Mode-Specific Overrides

If wiki shows `| recharge wvw = 40` but NOT `| recharge pvp = X`:
- PvP uses the **default** value, not the WvW value
- Only explicitly specified overrides should be applied

### 4. Trait Linked Skills

```wikitext
{{skill fact|Protection|4|linked skill=Defensive Protocol: Protect}}
```

The `linked skill` parameter indicates a PrefixedBuff type - we're already handling this correctly.

### 5. Multiple Skill IDs

```wikitext
| id = 10545, 10671
```

- The wiki page describes ALL variants
- Our static data has separate entries per ID
- Need to apply the SAME competitive split data to all IDs listed

### 6. Fact Overriding

Mode-specific facts can:
- **Replace** a default fact (same type, different value)
- **Add** a new fact (only exists in that mode)

Example:
```wikitext
{{skill fact|damage|coefficient=3.0}}                    # Default
{{skill fact|damage|coefficient=1.68|game mode = wvw}}   # WvW replacement
```

The WvW mode should have `coefficient=1.68`, not both values.

## Implementation Checklist

- [ ] Write wikitext parser for skill/trait infoboxes
- [ ] Handle positional vs named parameters in `{{skill fact}}`
- [ ] Parse mode-specific property suffixes (`recharge wvw`, etc.)
- [ ] Build fact objects with correct types
- [ ] Merge wiki data with API data (wiki overrides API)
- [ ] Handle name mismatches between wiki and API
- [ ] Cache wiki responses (they rarely change)
- [ ] Add fallback if wiki scraping fails (use API only)
- [ ] Update `fetch-static-data.js` to call wiki scraper
- [ ] Test with known splits (Well of Corruption 32s→40s WvW)

## Rate Limiting

The GW2 Wiki doesn't have strict rate limits but be respectful:
- Batch requests with delays (500ms between requests)
- Cache results locally
- Only scrape when updating static data (not runtime)
- Consider downloading wiki database dumps instead

## Testing Plan

Test with known competitive splits:

### Skills
- **Well of Corruption** (Necromancer): 32s PvE/PvP, 40s WvW
- **Hammer of Wisdom** (Guardian): Different damage coefficients per mode

### Traits
- **New Genes** (Engineer): Alacrity only in PvE
- Any trait with mode-specific values

## File Structure

```
scripts/
  fetch-static-data.js       # Main script (already exists)
  wiki-scraper.js            # NEW: Wiki scraping logic
  wiki-parser.js             # NEW: Wikitext parsing
  wiki-mappings.json         # NEW: Name mappings (wiki ↔ API)

public/data/
  skills.json                # Output with competitive splits
  traits.json                # Output with competitive splits
  wiki-cache/                # NEW: Cached wiki responses
```

## Next Steps

1. Create `scripts/wiki-parser.js` - Parse wikitext infoboxes
2. Create `scripts/wiki-scraper.js` - Fetch and process wiki pages
3. Update `scripts/fetch-static-data.js` - Integrate wiki scraper
4. Test with Well of Corruption
5. Validate all competitive splits are working
6. Update UI to show mode selector actually works!
