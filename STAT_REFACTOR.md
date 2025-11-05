# Stat Calculation Refactor

**Branch:** `feature/stat-calculation-refactor`
**Start Date:** 2025-11-05
**Status:** In Progress

## Overview

Comprehensive refactor of the stat calculation system to properly handle all stat sources including equipment, runes, sigils, traits, and skills with proper mode-specific support.

## Assumptions

- All characters are level 80
- All gear is ascended quality
- All runes and sigils are superior quality
- Only flat/passive bonuses (no conditional bonuses)
- Weapon Set 2 remains excluded from calculations

## Design Decisions

### What to Include
✅ Equipment stats (armor, weapons, trinkets)
✅ Infusion bonuses (+5 per infusion)
✅ Rune bonuses (6-piece set, flat + percentage)
✅ Sigil bonuses (flat only - see whitelist below)
✅ Trait bonuses (passive only, mode-specific)
✅ Skill bonuses (passive signets only, mode-specific)
✅ Shield armor bonus (+295 armor)
✅ Base health and armor by profession/weight class

### What to Exclude
❌ Conditional bonuses (weapon-specific, HP threshold, etc.)
❌ Stacking bonuses (Bloodlust, Intelligence, etc.)
❌ Active skill effects (only passive signets)
❌ Weapon Set 2 stats
❌ Consumables, boons, environmental effects

## Phase Progress

### ✅ Phase 1: Create New Stat Calculation Service (COMPLETED)
**File:** `src/lib/statCalculator.ts`

**Completed:**
- Created comprehensive type definitions:
  - `AttributeKey` - All 9 attribute types
  - `BaseAttributes` - Raw attribute values
  - `DerivedStats` - Calculated stats (crit chance, armor, HP, etc.)
  - `CalculatedStats` - Complete result with breakdown
  - `StatSourceBreakdown` - Where stats come from
- Implemented core calculation functions:
  - `calculateEquipmentStats()` - Equipment with 3/4/9-stat combos
  - `calculateInfusionStats()` - +5 infusion bonuses
  - `calculateRuneStats()` - Rune parsing (flat + percentage)
  - `calculateDerivedStats()` - All derived formulas
- Added utility functions:
  - `parseBonus()` - Parse "+25 Power" and "+10% Boon Duration"
  - `addAttributes()` - Combine attribute sources
- Implemented shield armor bonus check
- Comprehensive documentation and comments

**Key Implementation Notes:**
- Using `Concentration` as the internal attribute key (display as "BoonDuration")
- Percentage conversions: 15 per 1% for Expertise/Concentration/Ferocity
- Shield armor bonus: +295 (Ascended quality)
- Base attributes: Power/Precision/Toughness/Vitality = 1000, others = 0

### 🔄 Phase 2: Base Stats Implementation (IN PROGRESS)
**Status:** Already implemented in Phase 1

**Completed in Phase 1:**
- Base health from `BASE_HEALTH` constant
- Base armor from `BASE_ARMOR` and `PROFESSION_WEIGHT_CLASS`
- Shield defense bonus (+295 if shield in OffHand1)
- Attribute initialization with base values

**Nothing additional needed** - moving to Phase 3.

### ⏳ Phase 3: Equipment Stats (PENDING)
**Status:** Core logic implemented, needs integration testing

**Already Implemented:**
- Equipment stat calculation with 3-stat/4-stat/Celestial support
- Infusion bonuses
- Proper handling of two-handed weapons
- Weapon Set 2 exclusion

**Remaining:**
- Integration testing with StatsPanel
- Verify stat values match existing implementation

### ⏳ Phase 4: Runes & Sigils (PENDING)
**Status:** Runes implemented, sigils need whitelist

**Important Design Note:**
Some bonuses directly modify derived stats (percentages) rather than attributes:
- **Direct % bonuses:** "+7% Crit Chance" → adds to crit chance % directly
- **Attribute bonuses:** "+150 Concentration" → converts to ~10% boon duration via formula

The stat calculator handles both types via the `DirectPercentageBonuses` interface.

**Runes:**
- ✅ Parsing implemented
- ✅ Handles flat bonuses (+25 Power)
- ✅ Handles percentage bonuses (+10% Boon Duration → +150 Concentration)
- ⏳ Need to verify if any runes have direct % bonuses

**Sigils:**
- ⏳ Need to create whitelist separating:
  - Direct % bonuses (Accuracy: +7% crit chance)
  - Attribute bonuses (if any exist)
- ⏳ Implement parsing logic for both types
- ⏳ Test with known sigils

**Relics:**
- ⏳ Need to audit which relics provide flat stats
- ⏳ Implement parsing if any exist

**Sigil Whitelist (To Be Created):**
```
IMPORTANT: Some bonuses are direct percentage bonuses, NOT attribute bonuses!

Direct percentage bonuses (applied to derived stats):
- Sigil of Accuracy (+7% crit chance) → adds directly to crit chance %
- Sigil of Concentration (+10% boon duration) → adds directly to boon duration %
- [More to be identified during audit]

Attribute bonuses (converted to attributes):
- [To be identified during audit]

Exclude (conditional/stacking):
- Sigil of Bloodlust (stacking, kill-based)
- Sigil of Intelligence (proc-based)
- Sigil of Perception (conditional)
```

### ⏳ Phase 5: Trait Stat Bonuses (PENDING - MANUAL AUDIT REQUIRED)
**Status:** Stub implemented, needs trait audit

**Implementation Plan:**
1. Audit all traits across 9 professions
2. Identify traits with `AttributeAdjust` facts
3. Filter for passive/unconditional bonuses only
4. Create `STAT_AFFECTING_TRAITS` documentation
5. Implement parsing with mode-specific support

**Trait Parsing Logic:**
```typescript
// For each selected trait:
// 1. Get trait data
// 2. Get mode-specific facts using getModeData()
// 3. Filter facts for type: "AttributeAdjust"
// 4. Extract target (attribute name) and value
// 5. Apply to stats
```

**Known Trait Fact Structure:**
```json
{
  "type": "AttributeAdjust",
  "value": 120,
  "target": "Power"
}
```

### ⏳ Phase 6: Skill Stat Bonuses (PENDING - MANUAL AUDIT REQUIRED)
**Status:** Stub implemented, needs signet audit

**Implementation Plan:**
1. Audit all signets (primary source of passive skill bonuses)
2. Identify signets with passive `AttributeAdjust` facts
3. Create `STAT_AFFECTING_SKILLS` documentation
4. Implement parsing with mode-specific support

**Focus:** Only passive signet bonuses (not active effects)

### ⏳ Phase 7: Derived Stats (PENDING)
**Status:** Already implemented in Phase 1

**Formulas Implemented:**
- Health: `Base Health + (Vitality - 1000) × 10`
- Armor: `Base Armor + Toughness + Shield Bonus`
- Crit Chance: `4% + (Precision - 1000) / 21` (capped 0-100%)
- Crit Damage: `150% + Ferocity / 15`
- Condition Duration: `Expertise / 15` (capped 100%)
- Boon Duration: `Concentration / 15` (capped 100%)
- Effective Power: `Power × (1 + CritChance × (CritDamage - 1))`
- Effective HP: `HP × (1 + Armor / 1000)`

**Remaining:**
- Verify formulas match wiki documentation
- Integration testing

### ⏳ Phase 8: Integration & Testing (PENDING)
**Status:** Not started

**Tasks:**
- Update `StatsPanel.tsx` to use new `calculateStats()` function
- Remove old calculation logic
- Test with known builds (one per profession minimum)
- Verify mode switching (PvE/PvP/WvW) works correctly
- Compare results with old implementation
- Fix any discrepancies

### ⏳ Phase 9: Documentation (PENDING)
**Status:** Partial (code comments done)

**Remaining:**
- Document stat calculation order in README
- Create list of stat-affecting traits by profession
- Create list of stat-affecting signets
- Document sigil whitelist with rationale
- Update CLAUDE.md with new stat calculator info

## Important Constants & Values

### Attribute vs Derived Stat Terminology
**IMPORTANT:** There's a key distinction between attributes and derived stats:

**Attributes (stored/raw values):**
- Power → (no derived stat)
- **Precision** → derives Crit Chance %
- **Ferocity** → derives Crit Damage %
- **Expertise** → derives Condition Duration %
- **Concentration** → derives Boon Duration %
- Toughness → derives Armor
- Vitality → derives Health

**Formula for derived %:**
- Crit Chance % = 4 + (Precision - 1000) / 21
- Crit Damage % = 150 + Ferocity / 15
- Condition Duration % = Expertise / 15
- **Boon Duration % = Concentration / 15**

**Note:** The old StatsPanel.tsx code incorrectly used 'BoonDuration' as the attribute key. The new statCalculator.ts correctly uses 'Concentration' as the attribute and calculates Boon Duration % as the derived stat.

### Base Stats
- **Level 80 base attributes:**
  - Power: 1000
  - Precision: 1000
  - Toughness: 1000
  - Vitality: 1000
  - All others: 0

### Base Health by Profession
- **High (19,212 HP):** Warrior, Necromancer
- **Medium (15,922 HP):** Revenant, Engineer, Ranger, Mesmer
- **Low (11,645 HP):** Guardian, Thief, Elementalist

### Base Armor by Weight Class
- **Heavy (1,271):** Guardian, Warrior, Revenant
- **Medium (1,118):** Engineer, Ranger, Thief
- **Light (967):** Elementalist, Mesmer, Necromancer

### Equipment Bonuses
- **Shield:** +295 armor (Ascended)
- **Infusions:** +5 to specific stat
- **Runes:** Variable (6-piece set bonuses)
- **Sigils:** Variable (flat bonuses only)

### Stat Combo Types
- **3-stat:** Major stat gets higher value, 2 minor stats get lower value
- **4-stat:** First 2 stats are major, last 2 are minor
- **9-stat (Celestial):** All 9 stats get equal value

## Files Modified

### New Files
- `src/lib/statCalculator.ts` - Main stat calculation service

### Files to Modify
- `src/components/StatsPanel.tsx` - Update to use new calculator
- `src/types/gw2.ts` - May need to export more types

### Files to Create
- Documentation of stat-affecting traits (TBD format)
- Documentation of stat-affecting signets (TBD format)
- Sigil whitelist (TBD format)

## Testing Strategy

1. **Unit Tests (Future):**
   - Test each calculation function individually
   - Test bonus parsing
   - Test stat combining logic

2. **Integration Tests:**
   - Create known builds for each profession
   - Verify total stats match expected values
   - Test mode switching (PvE/PvP/WvW)

3. **Regression Tests:**
   - Compare results with old implementation
   - Ensure no existing functionality breaks

## Known Issues / TODOs

- [ ] Sigil whitelist needs to be created (Phase 4)
- [ ] Trait audit needs to be performed (Phase 5)
- [ ] Signet audit needs to be performed (Phase 6)
- [ ] Relic stat bonuses need investigation
- [ ] Force/Damage% bonuses need special handling (multiplicative, not additive)
- [ ] Consider exporting parseBonus() for external use/testing

## References

- [GW2 Wiki: Attribute Combinations](https://wiki.guildwars2.com/wiki/Attribute_combinations)
- [GW2 Wiki: Attributes](https://wiki.guildwars2.com/wiki/Attribute)
- Current implementation: `src/components/StatsPanel.tsx` (lines 165-306)

## Next Steps

1. ✅ Phase 1: Stat calculator service created
2. ⏭️ Phase 2: Already complete (base stats implemented in Phase 1)
3. ⏭️ Phase 3: Integration testing
4. ⏭️ Phase 4: Create sigil whitelist and implement parsing
5. ⏭️ Phase 5: Manual trait audit → implement trait parsing
6. ⏭️ Phase 6: Manual signet audit → implement skill parsing
7. ⏭️ Phase 7: Already complete (derived stats implemented in Phase 1)
8. ⏭️ Phase 8: Integration with StatsPanel and testing
9. ⏭️ Phase 9: Final documentation
