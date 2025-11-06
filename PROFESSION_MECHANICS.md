# Profession Mechanics Implementation

## Overview
This document tracks the implementation of selectable profession mechanics (F-key skills) for professions where these are customizable.

## Implementation Status

### Phase 1: Evoker Familiars ✅ COMPLETED
- [x] Data research (familiar skill IDs)
- [x] Type definitions
- [x] State management
- [x] UI component (ProfessionMechanicBar)
- [x] Layout integration
- [x] Build encoding
- [x] Build export
- [x] Testing (basic - UI works, needs live testing)

### Phase 2: Amalgam Morph Skills ⏳ PLANNED
- [ ] Extend types for morph skills
- [ ] UI updates for 3-choice selection
- [ ] F1 derivation from heal skill
- [ ] Testing

### Phase 3: Revenant Legends ⏳ PLANNED
- [ ] Fetch /v2/legends API data
- [ ] Extend types for dual legend selection
- [ ] Legend filtering by elite spec
- [ ] Dynamic F1-F5 skill mapping
- [ ] Testing

### Phase 4: Ranger Pets ⏳ PLANNED
- [ ] Fetch /v2/pets API data
- [ ] Extend types for pet selection
- [ ] Pet grouping/organization
- [ ] Pet skill mapping
- [ ] Testing

---

## Technical Notes

### Evoker Familiars
**Available Familiars:**
- Fox (Fire) - F5: Conflagration (ID: 76585)
- Otter (Water) - F5: Buoyant Deluge (ID: 76811)
- Hare (Lightning) - F5: Lightning Blitz (ID: 77089)
- Toad (Earth) - F5: Seismic Impact (ID: 76707)

**Skill IDs:** Confirmed ✅

**Implementation Details:**
- Selection stored in `professionMechanics.evokerFamiliar`
- Only F5 slot used
- Clickable icon box with grid picker (4 options)
- Only shows when Evoker (spec3 === 80) is selected
- Uses friendly familiar names: Fox, Otter, Hare, Toad

---

## Data Mapping

### Familiar Skill IDs
(To be populated during research phase)

---

## Testing Checklist

### Per Profession
- [ ] Selection persists in state
- [ ] URL encoding/decoding works
- [ ] Discord export shows correct skill
- [ ] Profession switching clears mechanics
- [ ] Mode-specific data displays correctly
- [ ] Tooltips work properly

---

## Known Issues
(None yet)

---

Last Updated: 2025-11-06
