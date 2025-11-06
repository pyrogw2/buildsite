# Build Encoder V6 Implementation Notes

## Changes Made

### 1. Optimizations Implemented
- **Sparse Equipment**: Only non-default equipment slots are encoded (default = Berserker stats, no upgrades)
- **Bitflags for Optional Fields**: Skills, traits, runes/relics only encoded if present
- **Profession-Specific Mechanics**: Only relevant mechanics for the selected profession are encoded
- **Bit-Packing**: Slot+stat indices packed into 2 bytes, trait choices packed into 1 byte (2 bits each)
- **Deduplicated STATS Array**: Removed duplicate "Sinister" and "Wanderer" entries
- **Legend Enum**: Revenant legends use byte indices instead of strings (8 bytes → 1 byte per legend)

### 2. Version 6 Encoding Format

```
Version byte (1): 6
Profession+Mode (1): [prof[2:0], mode[1:0]]
Equipment count (1): Number of non-default slots
For each equipment:
  If stat is known:
    Slot+Stat packed (2): [stat[5:4], 00, slot[3:0]], [stat[3:0], 0000]
  Else:
    Slot (1) + 0xFF marker (1) + stat string
  Weapon type (1): index+1 or 0
  Upgrade bitflags (1): [inf3, inf2, inf1, sigil2, sigil1]
  Upgrade IDs (VarInt each, only if flagged)

Skill bitflags (1): [elite, util3, util2, util1, heal]
Skill IDs (VarInt each, only if flagged)

Spec bitflags (1): [spec3, spec2, spec1]
For each spec (only if flagged):
  Spec ID (VarInt)
  Trait choices packed (1): [choice2[1:0], choice1[1:0], choice0[1:0]]

Rune+Relic bitflags (1): [relic, rune]
Rune ID (VarInt, only if flagged)
Relic ID (VarInt, only if flagged)

Profession Mechanics (varies by profession):
  Elementalist: has_familiar (1) + familiar_id (VarInt if flagged)
  Revenant: legend1_idx (1) + legend2_idx (1)
  Engineer: morph_flags (1) + morph_ids (VarInt each if flagged)
  Ranger: pet_flags (1) + pet_ids (VarInt each if flagged)
  Other: nothing
```

### 3. Expected Size Reduction

**Example Build (typical full build with all slots):**
- V5: ~160-200 characters
- V6: ~50-80 characters
- **Reduction: 60-75%**

**Empty Build (all Berserker, no skills/traits):**
- V5: ~120-140 characters
- V6: ~15-25 characters
- **Reduction: 85-90%**

## Testing Checklist

### Backward Compatibility
- [ ] V5 links still decode correctly
- [ ] V4 links still decode correctly
- [ ] V3 links still decode correctly
- [ ] V2 links still decode correctly
- [ ] V1 (JSON) links still decode correctly

### V6 Encoding/Decoding
- [ ] Empty build (all defaults) encodes/decodes
- [ ] Partial build (some equipment) encodes/decodes
- [ ] Full build (all slots + upgrades) encodes/decodes
- [ ] Profession mechanics (Ranger pets, Revenant legends, etc.) encode/decode
- [ ] Skills and traits encode/decode correctly
- [ ] Runes and relics encode/decode correctly

### Size Verification
- [ ] V6 links are 50-75% shorter than V5
- [ ] Empty builds are minimal size
- [ ] Full builds with infusions are still significantly smaller

### Edge Cases
- [ ] Unknown stat names (not in STATS array) fall back to string encoding
- [ ] Unknown weapon types fall back to string encoding
- [ ] Missing equipment slots default to Berserker
- [ ] Null/undefined values handled correctly
- [ ] All 9 professions work correctly

## Manual Test URLs

### Test 1: Original V5 URL (should still decode)
```
https://pyrogw2.github.io/builds/?build=eNpj5RJgYGQAgm8XmRgYGBFMJgSTGcFkQTBZEUxuNSgTxONEiHMhmGxgJhCwMyLUAhEHKpeHUfD_fsblBxihhvHCtPExCi45hCTBD5M4dJ1l5m2WtXrL9Q7eZGG7xfeEbza_2i--Zv4-Fu99QmuFngk9OslyeQobUOnrWyxtN1j-32BhYAAAhHBAzA
```
Length: 243 characters (just the build param: 189 characters)

### Test 2: Create a new build and check V6 URL length
1. Open the app
2. Create a build (e.g., power Necromancer with Viper gear)
3. Copy the share URL
4. Verify the build parameter is ~50-80 characters (vs 160-200 for V5)

### Test 3: Edge cases
- Create empty build (all defaults) → should be very short (~15-25 chars)
- Create Revenant with legends → verify legends encode/decode
- Create Ranger with pets → verify pets encode/decode
- Use uncommon stat combo not in STATS array → verify fallback works

## Files Modified
- `src/lib/buildEncoder.ts` - Main changes
  - Deduplicated STATS array
  - Added REVENANT_LEGENDS array
  - Added V6 helper functions (bit-packing, bitflags)
  - Updated `encodeBuild()` to use V6 format
  - Added V6 decoder in `decodeBuild()`
  - Kept all V1-V5 decoders for backward compatibility
