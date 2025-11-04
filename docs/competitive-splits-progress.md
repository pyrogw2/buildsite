# Competitive Splits - Progress Summary

## What We've Built

### 1. Tooltip System Enhancement ✅

**Location**: `src/components/Tooltip.tsx`

- Shows skill/trait facts with icons (buffs, conditions, stats)
- Displays facts for the currently selected game mode (PvE/PvP/WvW)
- Handles different fact types:
  - Regular buffs: `Alacrity (6s)`
  - Prefixed buffs: `Defensive Protocol: Protect`
  - Stats: `Damage Reduced: 20%`
  - Recharge times: `Recharge: 32s`
- Removed verbose descriptions for compactness
- Auto-positioning to stay within viewport
- Scrollable for long tooltips

### 2. Data Flow Working ✅

**Files Modified**:
- `src/components/BuildEditor.tsx` - Passes facts and modeData to tooltips
- `src/types/gw2.ts` - Type definitions for mode bundles
- `src/lib/modeUtils.ts` - Resolves correct mode data
- `src/lib/modeMerging.ts` - Merges competitive split variants

**How It Works**:
1. API loads skills/traits with `modes: { default, pve?, pvp?, wvw? }` structure
2. Game mode selector (PvE/PvP/WvW buttons) updates global state
3. `resolveSkillMode()` / `resolveTraitMode()` returns facts for selected mode
4. Tooltip displays mode-specific facts
5. Switching modes updates all tooltips automatically

### 3. Type System ✅

```typescript
interface GW2SkillWithModes {
  id: number;
  name: string;
  // ...other props
  modes: ModeBundle<GW2SkillModeData>;
}

interface ModeBundle<T> {
  default: T;  // Base values (usually PvE)
  pve?: T;     // PvE-specific overrides
  pvp?: T;     // PvP-specific overrides
  wvw?: T;     // WvW-specific overrides
}

interface GW2SkillModeData {
  description?: string;
  facts?: GW2Fact[];      // The actual stats
  traited_facts?: GW2Fact[];
}
```

## What's Missing 🔴

### The Data Source Problem

**Current State**:
- Static data (`public/data/skills.json`) has NO mode-specific overrides
- All skills show the same values for PvE/PvP/WvW
- GW2 API (`/v2/skills`, `/v2/traits`) doesn't expose competitive splits
- Example: Well of Corruption shows 32s in all modes, but it's 40s in WvW

**Why**:
The official GW2 API doesn't provide competitive split data. This information only exists:
1. In-game (different per mode)
2. On the GW2 Wiki (scraped from game by community)
3. In third-party databases (hardcoded/maintained)

## The Solution: Wiki Scraping

See `docs/wiki-scraping-guide.md` for full details.

### Quick Overview

The GW2 Wiki edit pages contain structured data:

```wikitext
{{Skill infobox
| recharge = 32
| recharge wvw = 40      # ← This is what we need!
| recharge pvp = 32
}}
```

### Implementation Plan

1. **Parse wiki edit pages** - Extract wikitext infoboxes
2. **Build override data** - Map mode-specific values to our structure
3. **Merge with API data** - Enrich static data with competitive splits
4. **Update static files** - Write to `public/data/skills.json`
5. **Test** - Verify Well of Corruption shows 40s in WvW mode

### Files to Create

```
scripts/wiki-parser.js       # Parse {{Skill infobox}} wikitext
scripts/wiki-scraper.js      # Fetch wiki pages for all skills/traits
scripts/wiki-mappings.json   # Map API names ↔ Wiki page names
```

### Files to Update

```
scripts/fetch-static-data.js # Add wiki scraping step
```

## Testing Checklist

Once wiki scraping is implemented:

- [ ] Well of Corruption shows 32s in PvE mode
- [ ] Well of Corruption shows 40s in WvW mode
- [ ] Well of Corruption shows 32s in PvP mode
- [ ] Switching modes updates tooltip instantly
- [ ] Hammer of Wisdom shows different damage per mode
- [ ] New Genes trait shows Alacrity only in PvE mode
- [ ] All facts have correct icons
- [ ] Tooltips stay within viewport

## Known Good Test Cases

### Skills

**Well of Corruption** (Necromancer):
- PvE: 32s recharge
- PvP: 32s recharge
- WvW: 40s recharge ← Different!

**Hammer of Wisdom** (Guardian):
- Different damage coefficients per mode

### Traits

**New Genes** (Engineer Amalgam):
- PvE: Grants Alacrity (6s)
- PvP/WvW: No Alacrity

## PR Status

**Branch**: `codex/add-competitive-split-skills-and-traits`

**What's Complete**:
- UI displays facts correctly ✅
- Mode resolution logic works ✅
- Tooltip rendering works ✅
- Type system supports splits ✅

**What's Needed**:
- Wiki scraper to populate actual competitive split data ⚠️

## Next Steps

1. Build wiki scraper (see `wiki-scraping-guide.md`)
2. Run `node scripts/fetch-static-data.js` to regenerate with competitive splits
3. Test with Well of Corruption
4. Commit updated static data files
5. Merge PR!
