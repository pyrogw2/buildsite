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

## TypeScript Style Guidelines

### 1. Type Usage Patterns

#### `unknown` vs `any`
- **Prefer `unknown`** for error handling and data from external sources
- **Avoid `any`** except when absolutely necessary (marked as warnings in ESLint)
- Use type guards to narrow `unknown` to specific types

```typescript
// ✅ Good: Use unknown for error handling
function handleError(error: unknown) {
  if (error instanceof Error) {
    console.error(error.message);
  } else if (typeof error === 'string') {
    console.error(error);
  }
}

// ❌ Avoid: Any type
function processData(data: any) {
  return data.value; // No type safety
}
```

#### Generic Constraints and Usage
- Use proper generic constraints with `extends`
- Prefer specific generic types over loose constraints
- Use utility types (`Partial<T>`, `Required<T>`, etc.) appropriately

```typescript
// ✅ Good: Proper generic constraints
interface Repository<T extends { id: number }> {
  findById(id: number): Promise<T | null>;
  save(entity: T): Promise<T>;
}

// ✅ Good: Utility types
function updateEquipment(slot: string, updates: Partial<Equipment>) {
  // Implementation
}
```

#### Interface Definitions vs Type Aliases
- **Use interfaces** for object shapes that might be extended
- **Use type aliases** for unions, primitives, and complex computed types
- **Prefer interfaces** for public APIs and component props

```typescript
// ✅ Good: Interface for extensible object shapes
interface Equipment {
  slot: ArmorSlot | WeaponSlot | TrinketSlot;
  stat: StatCombo;
  weaponType?: WeaponType;
}

// ✅ Good: Type alias for unions and computed types
type SkillSlot = 'heal' | 'utility1' | 'utility2' | 'utility3' | 'elite';
type AttributeKey = 'Power' | 'Toughness' | 'Vitality' | /* ... */;
```

#### Type Assertions
- **Prefer type guards** over type assertions when possible
- Use `as` sparingly and only when you're certain of the type
- Use `const` assertions for immutable literals

```typescript
// ✅ Good: Type guard
function isGW2Item(item: unknown): item is GW2Item {
  return typeof item === 'object' && item !== null && 'id' in item && 'name' in item;
}

// ⚠️ Acceptable: Type assertion when certain
const element = document.getElementById('tooltip') as HTMLDivElement;

// ✅ Good: Const assertion for literals
const PROFESSIONS = ['Guardian', 'Warrior', 'Engineer'] as const;
```

### 2. Explicit Typing Requirements

#### Function Signatures
- **Always declare explicit parameter and return types** for exported functions
- Use explicit types for complex parameters even if TypeScript can infer them
- Document function intent through types

```typescript
// ✅ Good: Explicit function signature
export function calculateStats(
  buildData: BuildData,
  runeItem: GW2Item | null,
  sigilItems: Map<number, GW2Item>,
  allTraits: GW2TraitWithModes[],
  allSpecs: GW2Specialization[],
  allSkills: GW2Skill[]
): CalculatedStats {
  // Implementation
}

// ✅ Good: Explicit types for clarity
export function mergeModeData<T>(
  defaultMode: T,
  overrideMode?: Partial<T>
): T {
  return { ...defaultMode, ...overrideMode };
}
```

#### Object Typing
- **Use interfaces or type aliases** for all object literals
- Avoid implicit object types in function parameters
- Define types for complex data structures

```typescript
// ✅ Good: Explicit object typing
interface StatSourceBreakdown {
  base: Partial<BaseAttributes>;
  equipment: Partial<BaseAttributes>;
  infusions: Partial<BaseAttributes>;
  runes: Partial<BaseAttributes>;
  sigils: Partial<BaseAttributes>;
  traits: Partial<BaseAttributes>;
  skills: Partial<BaseAttributes>;
  percentageBonuses: DirectPercentageBonuses;
}

// ✅ Good: Typed function parameters
function processEquipment(equipment: Equipment[]): Partial<BaseAttributes> {
  // Implementation
}
```

#### Array Typing
- **Always specify element types** for arrays
- Use readonly arrays for immutable data
- Prefer specific types over generic arrays

```typescript
// ✅ Good: Specific array types
const ARMOR_SLOTS: ArmorSlot[] = ['Helm', 'Shoulders', 'Coat', 'Gloves', 'Leggings', 'Boots'];
const PASSIVE_STAT_TRAITS: readonly number[] = [1801, 2028, 325, /* ... */];

// ✅ Good: Typed array parameters
function filterSkillsBySlot(skills: GW2SkillWithModes[], slot: string): GW2SkillWithModes[] {
  return skills.filter(skill => skill.slot?.toLowerCase() === slot.toLowerCase());
}
```

#### Event Handler Typing
- **Use proper React event types** for event handlers
- Specify event target types when accessing properties
- Use generic event types for custom components

```typescript
// ✅ Good: Proper event typing
const handleStatChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
  const newStat = event.target.value as StatCombo;
  updateEquipment(slot, { stat: newStat });
};

const handleSkillSelect = (skillId: number) => {
  setSkill(slot, skillId);
};
```

### 3. Anti-Patterns to Avoid

#### Implicit `any` Usage
- **Never rely on implicit `any`** - always provide explicit types
- Configure ESLint to warn about implicit any
- Use `noImplicitAny: true` in tsconfig

```typescript
// ❌ Bad: Implicit any
function processItems(items) { // items is any[]
  return items.map(item => item.name); // No type safety
}

// ✅ Good: Explicit typing
function processItems(items: GW2Item[]): string[] {
  return items.map(item => item.name);
}
```

#### Unsafe Type Assertions
- **Avoid assertions without proper validation**
- Don't use `any` to bypass type checking
- Prefer type guards over assertions

```typescript
// ❌ Bad: Unsafe assertion
const data = JSON.parse(response) as BuildData; // Could be anything

// ✅ Good: Safe parsing with validation
function parseBuildData(json: string): BuildData | null {
  try {
    const data = JSON.parse(json);
    if (isValidBuildData(data)) {
      return data;
    }
    return null;
  } catch {
    return null;
  }
}
```

#### Missing Type Annotations
- **Don't rely solely on type inference** for public APIs
- Always type exported functions and interfaces
- Add types for complex internal functions

```typescript
// ❌ Bad: Missing return type
export function calculateCritChance(precision: number) {
  return 5 + (precision - 1000) / 21; // What's the return type?
}

// ✅ Good: Explicit return type
export function calculateCritChance(precision: number): number {
  return 5 + (precision - 1000) / 21;
}
```

#### Poor Error Handling Patterns
- **Don't use `any` for caught errors**
- Use proper error type guards
- Handle specific error types appropriately

```typescript
// ❌ Bad: Any error type
try {
  await apiCall();
} catch (error: any) {
  console.log(error.message); // Might not exist
}

// ✅ Good: Proper error handling
try {
  await apiCall();
} catch (error) {
  if (error instanceof Error) {
    console.error(error.message);
  } else if (typeof error === 'string') {
    console.error(error);
  } else {
    console.error('Unknown error occurred', error);
  }
}
```

### 4. Type Safety Practices

#### Strict Null Checks
- **Enable strict null checks** in tsconfig.json
- Use optional chaining (`?.`) and nullish coalescing (`??`)
- Define nullable types explicitly

```typescript
// ✅ Good: Strict null checking
interface SkillSelection {
  heal?: number;
  utility1?: number;
  utility2?: number;
  utility3?: number;
  elite?: number;
}

// ✅ Good: Optional chaining
const skillName = selectedSkill?.name ?? 'No skill selected';
```

#### Type Narrowing Techniques
- **Use type guards** for runtime type checking
- Leverage discriminated unions for complex types
- Use `in` operator and `typeof` for basic checks

```typescript
// ✅ Good: Type guard function
function isEquipment(item: unknown): item is Equipment {
  return typeof item === 'object' && 
         item !== null && 
         'slot' in item && 
         'stat' in item;
}

// ✅ Good: Discriminated union
type LoadingState = 
  | { status: 'loading' }
  | { status: 'success'; data: BuildData }
  | { status: 'error'; error: string };

function handleState(state: LoadingState) {
  switch (state.status) {
    case 'loading':
      // state is { status: 'loading' }
      break;
    case 'success':
      // state.data is available
      console.log(state.data.profession);
      break;
    case 'error':
      // state.error is available
      console.error(state.error);
      break;
  }
}
```

#### Proper Error Handling with Type Guards
- **Create specific error types** for different error scenarios
- Use error codes or types for programmatic handling
- Implement proper error boundaries

```typescript
// ✅ Good: Specific error types
class GW2ApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly endpoint: string
  ) {
    super(message);
  }
}

class ValidationError extends Error {
  constructor(
    message: string,
    public readonly field: string,
    public readonly value: unknown
  ) {
    super(message);
  }
}

// ✅ Good: Error handling with type guards
function handleApiError(error: unknown): never {
  if (error instanceof GW2ApiError) {
    if (error.statusCode === 404) {
      throw new Error(`Resource not found: ${error.endpoint}`);
    }
    throw error;
  }
  throw new Error('Unexpected error occurred');
}
```

#### Consistent Naming Conventions
- **Use PascalCase** for types, interfaces, and enums
- **Use camelCase** for variables and functions
- **Use UPPER_SNAKE_CASE** for constants
- **Use descriptive names** that indicate type and purpose

```typescript
// ✅ Good: Consistent naming
interface BuildData {
  profession: Profession;
  gameMode: GameMode;
  equipment: Equipment[];
}

const DEFAULT_PROFESSION: Profession = 'Guardian';

function calculateDerivedStats(attributes: BaseAttributes): DerivedStats {
  // Implementation
}
```

### 5. Code Examples

#### Preferred Function Signatures
```typescript
// ✅ Good: Complete function signature with documentation
/**
 * Calculates all stats for a build including base attributes and derived stats
 * @param buildData - Complete build data with equipment, skills, traits
 * @param runeItem - Rune item data if equipped
 * @param sigilItems - Map of sigil item IDs to item data
 * @param allTraits - All available traits for stat calculations
 * @param allSpecs - All specializations for trait data
 * @param allSkills - All skills for passive bonuses
 * @returns Complete calculated stats with source breakdown
 */
export function calculateStats(
  buildData: BuildData,
  runeItem: GW2Item | null,
  sigilItems: Map<number, GW2Item>,
  allTraits: GW2TraitWithModes[],
  allSpecs: GW2Specialization[],
  allSkills: GW2Skill[]
): CalculatedStats;
```

#### Object Typing Examples
```typescript
// ✅ Good: Complex object typing with nested structures
interface StatSourceBreakdown {
  readonly base: Partial<BaseAttributes>;
  readonly equipment: Partial<BaseAttributes>;
  readonly infusions: Partial<BaseAttributes>;
  readonly runes: Partial<BaseAttributes>;
  readonly sigils: Partial<BaseAttributes>;
  readonly traits: Partial<BaseAttributes>;
  readonly skills: Partial<BaseAttributes>;
  readonly percentageBonuses: DirectPercentageBonuses;
}

// ✅ Good: Generic utility type
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
```

#### Error Handling Patterns
```typescript
// ✅ Good: Comprehensive error handling
async function fetchWithCache<T>(endpoint: string): Promise<T> {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`);
    if (!response.ok) {
      throw new GW2ApiError(
        `API request failed: ${response.statusText}`,
        response.status,
        endpoint
      );
    }
    return await response.json();
  } catch (error) {
    if (error instanceof GW2ApiError) {
      throw error; // Re-throw known errors
    }
    
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new NetworkError(`Network error fetching ${endpoint}`, error);
    }
    
    throw new Error(`Unexpected error fetching ${endpoint}: ${error}`);
  }
}
```

#### Generic Type Usage Examples
```typescript
// ✅ Good: Generic repository pattern
interface Repository<T extends { id: number }> {
  findById(id: number): Promise<T | null>;
  findAll(): Promise<T[]>;
  save(entity: T): Promise<T>;
  delete(id: number): Promise<boolean>;
}

// ✅ Good: Generic utility functions
function createLookupMap<T extends { id: number }>(items: T[]): Map<number, T> {
  return new Map(items.map(item => [item.id, item]));
}

// ✅ Good: Generic event handler
function createEventHandler<T = void>() {
  const listeners: Array<(data: T) => void> = [];
  
  return {
    subscribe: (listener: (data: T) => void) => {
      listeners.push(listener);
      return () => {
        const index = listeners.indexOf(listener);
        if (index > -1) listeners.splice(index, 1);
      };
    },
    emit: (data: T) => {
      listeners.forEach(listener => listener(data));
    }
  };
}
```

### 6. Quality Standards

#### Zero Lint Warnings Commitment
- **All code must pass ESLint with zero warnings**
- Use `npm run lint` to verify before committing
- Fix all `@typescript-eslint/no-explicit-any` warnings
- Address unused variables and imports

#### Production-Ready Code Quality Requirements
- **Strict TypeScript configuration** with no implicit any
- **Comprehensive type coverage** for all public APIs
- **Proper error handling** with typed error scenarios
- **Consistent code formatting** and style

#### Type Safety Maintenance Guidelines
- **Review new dependencies** for TypeScript support
- **Update type definitions** when adding new features
- **Maintain strict null checks** across the codebase
- **Regular lint audits** to catch type safety regressions

#### Code Review Checklist
- [ ] All functions have explicit parameter and return types
- [ ] No `any` types (except in specific, justified cases)
- [ ] Proper error handling with typed errors
- [ ] Consistent naming conventions
- [ ] Zero ESLint warnings
- [ ] Type guards used for runtime type checking
- [ ] Interfaces used for extensible object shapes
- [ ] Generic types properly constrained

## Development Workflow

1. **Write types first** - Define interfaces and types before implementation
2. **Enable strict mode** - Use `noImplicitAny: true` and `strictNullChecks: true`
3. **Lint continuously** - Run `npm run lint` during development
4. **Test type safety** - Verify types catch actual errors at runtime
5. **Review and refactor** - Improve type definitions as the codebase evolves

This commitment to type safety ensures robust, maintainable code that catches errors at compile-time rather than runtime, providing better developer experience and more reliable software.
