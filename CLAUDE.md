# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GW2 Build Editor - A Guild Wars 2 build editor built with React, TypeScript, Tailwind CSS, and Zustand. Supports all 9 professions with complete equipment, traits, skills, and competitive split data (PvE/PvP/WvW mode-specific skill/trait variants).

## Essential Commands

### Development
```bash
npm run dev              # Start Vite dev server (default: localhost:5173)
npm run build            # TypeScript compile + Vite production build
npm run preview          # Preview production build locally
npm run lint             # ESLint check
npm test                 # Run Vitest tests
```

### Data Management
```bash
# Fetch static data from GW2 API (saves to public/data/)
npm run update-data

# Enrich with competitive split data from GW2 Wiki (slow, ~5-7 minutes)
npm run update-data -- --with-wiki

# Re-enrich existing data with wiki splits (no API calls)
npm run update-data -- --wiki-only

# Filter by profession (speeds up wiki scraping for testing)
npm run update-data -- --with-wiki --profession=Necromancer
```

## Architecture

### State Management (Zustand)
**Central store:** `src/store/buildStore.ts`
- Single source of truth for entire build state
- Actions for equipment, skills, traits, profession selection
- Bulk apply operations for stats/infusions across categories

### Data Flow & Caching
**API Client:** `src/lib/gw2api.ts`
1. **Static data** (skills, traits, specializations, items) loaded from `public/data/*.json` on startup
2. **Dynamic data** (itemstats, misc API calls) fetched from GW2 API with in-memory + localStorage cache (24hr TTL)
3. **Competitive splits:** Skills/traits have mode-specific data (`pve`, `pvp`, `wvw` overrides) merged with default values

**Mode merging logic:** `src/lib/modeMerging.ts` and `src/lib/modeUtils.ts`
- Skills/traits store mode data in normalized format: `{ modes: { default, pve?, pvp?, wvw? } }`
- When displaying, merge mode-specific overrides with defaults based on current `gameMode`

### Build Encoding
**Encoder:** `src/lib/buildEncoder.ts`
- Compresses build JSON with pako (deflate)
- Encodes to URL-safe base64
- Used for shareable URLs and Discord export

**Export:** `src/lib/buildExport.ts`
- Formats builds as Discord markdown with profession emoji, gear summary, trait names

### Static Data Generation
**Script:** `scripts/fetch-static-data.js` (Node ESM)
- Fetches all skills, traits, specs, items from GW2 API
- **With `--with-wiki`:** Scrapes GW2 Wiki to enrich with competitive split data
  - Uses `scripts/wiki-scraper.js` with parallel workers (9 professions + 10 trait batches)
  - Staggered starts (100ms between workers) to avoid overwhelming wiki server
  - Takes ~5-7 minutes for full data generation
- Outputs to `public/data/`: `skills.json`, `traits.json`, `specializations.json`, `items.json`, `metadata.json`

### Components Structure
**Main layout:** `src/App.tsx`
- Left sidebar: Profession + game mode selector
- Center: Skills + traits panel
- Right: Stats summary + gear summary

**Key components:**
- `BuildEditor.tsx` - Equipment panel with bulk apply tools, weapon/armor/trinket configuration
- `TraitPanel.tsx` - Specialization + trait selection (3 specs, 3 tiers each)
- `SkillBar.tsx` - Heal/utilities/elite skill selection
- `StatsPanel.tsx` - Attribute display with derived stats (crit%, armor, HP, etc.) + gear summary
- `Tooltip.tsx` - Reusable tooltip for skills/traits/items with mode-specific data display

### Type Definitions
**Main types:** `src/types/gw2.ts`
- `BuildData` - Complete build state structure
- `GW2SkillWithModes`, `GW2TraitWithModes` - Normalized skill/trait with mode variants
- `Equipment`, `StatCombo`, `InfusionType` - Equipment-related types
- `GameMode` - `'PvE' | 'PvP' | 'WvW'`

### Stat Calculations
**Tables:** `src/lib/statTables.ts`
- Hardcoded stat values for ascended armor, trinkets, weapons (3-stat, 4-stat, 9-stat combos)
- Used by `StatsPanel.tsx` to calculate total attributes

**Formulas:**
- Crit Chance: `4 + (Precision - 1000) / 21`
- Crit Damage: `150 + Ferocity / 15`
- Condition Duration: `Expertise / 15` (capped at 100%)
- Boon Duration: `Concentration / 15` (capped at 100%)
- Effective Power: `Power × (1 + CritChance × (CritDamage - 1))`
- Effective HP: `HP × (1 + Armor / 1000)`

## Important Patterns

### Competitive Split Handling
When adding/modifying skills or traits:
1. Check if `pve`, `pvp`, `wvw` properties exist on raw API data
2. Use `mergeModeData()` to combine with default mode
3. Store in normalized `modes` structure
4. Use `getModeData()` from `modeUtils.ts` to retrieve correct mode data for display

### Equipment Slots
- Armor: `Helm`, `Shoulders`, `Coat`, `Gloves`, `Leggings`, `Boots`
- Trinkets: `Backpack`, `Accessory1`, `Accessory2`, `Amulet`, `Ring1`, `Ring2`
- Weapons: `MainHand1`, `OffHand1`, `MainHand2`, `OffHand2`
- Two-handed weapons occupy MainHand slot, OffHand disabled

### Wiki Icon URLs
Attribute icons use GW2 Wiki URLs:
- Format: `https://wiki.guildwars2.com/images/{hash}/{filename}.png`
- Examples: `/images/2/23/Power.png`, `/images/3/35/Toughness.png`

## Testing Notes
- Test data generation with `--profession=Necromancer` to avoid full 5-7 minute scrape
- Use `--wiki-only` to re-scrape wiki data without re-fetching from API
- Check `public/data/metadata.json` for `withCompetitiveSplits: true` to verify wiki enrichment
