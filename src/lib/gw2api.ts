import type {
  GW2Skill,
  GW2SkillModeData,
  GW2SkillWithModes,
  GW2Trait,
  GW2TraitModeData,
  GW2TraitWithModes,
  GW2Specialization,
  GW2ItemStat,
  GW2Item,
} from '../types/gw2';
import {
  mergeModeData,
  mergeSkillModeOverrides,
  type SkillModeOverrideInfo,
} from './modeMerging';

const API_BASE = 'https://api.guildwars2.com/v2';
const CACHE_DURATION = 1000 * 60 * 60 * 24; // 24 hours

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class GW2ApiClient {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private staticData: Record<string, any> = {};
  private staticDataLoaded = false;
  private skillOverrideLookup: Map<number, SkillModeOverrideInfo> = new Map();
  private processedSplitProfessions: Set<string> = new Set();
  private hasCompetitiveSplits = false;

  private normalizeSkill(skill: GW2Skill): GW2SkillWithModes {
    const { description, facts, traited_facts, pve, pvp, wvw, ...rest } = skill;
    const defaultMode: GW2SkillModeData = {
      description,
      facts,
      traited_facts,
    };

    const normalized = {
      ...rest,
      modes: {
        default: defaultMode,
        pve: pve ? mergeModeData(defaultMode, pve) : undefined,
        pvp: pvp ? mergeModeData(defaultMode, pvp) : undefined,
        wvw: wvw ? mergeModeData(defaultMode, wvw) : undefined,
      },
    };

    // Debug logging for Well of Corruption
    if (skill.name === 'Well of Corruption') {
      console.log('Normalizing Well of Corruption:', {
        hasWvwInput: !!wvw,
        wvwInputRecharge: wvw?.facts?.find((f: any) => f.type === 'Recharge')?.value,
        hasWvwOutput: !!normalized.modes.wvw,
        wvwOutputRecharge: normalized.modes.wvw?.facts?.find(f => f.type === 'Recharge')?.value,
      });
    }

    return normalized;
  }

  private normalizeTrait(trait: GW2Trait): GW2TraitWithModes {
    const { description, facts, traited_facts, pve, pvp, wvw, ...rest } = trait;
    const defaultMode: GW2TraitModeData = {
      description,
      facts,
      traited_facts,
    };

    return {
      ...rest,
      modes: {
        default: defaultMode,
        pve: pve ? mergeModeData(defaultMode, pve) : undefined,
        pvp: pvp ? mergeModeData(defaultMode, pvp) : undefined,
        wvw: wvw ? mergeModeData(defaultMode, wvw) : undefined,
      },
    };
  }

  private async loadStaticData(): Promise<void> {
    if (this.staticDataLoaded) return;

    try {
      const base = import.meta.env.BASE_URL;
      const [metadata, skills, specializations, traits, items] = await Promise.all([
        fetch(`${base}data/metadata.json`).then(r => r.ok ? r.json() : null),
        fetch(`${base}data/skills.json`).then(r => r.ok ? r.json() : null),
        fetch(`${base}data/specializations.json`).then(r => r.ok ? r.json() : null),
        fetch(`${base}data/traits.json`).then(r => r.ok ? r.json() : null),
        fetch(`${base}data/items.json`).then(r => r.ok ? r.json() : null),
      ]);

      if (metadata) {
        this.hasCompetitiveSplits = metadata.withCompetitiveSplits === true;
        console.log(`📊 Competitive splits: ${this.hasCompetitiveSplits ? 'enabled' : 'disabled'}`);
      }
      if (skills) this.staticData.skills = skills;
      if (specializations) this.staticData.specializations = specializations;
      if (traits) this.staticData.traits = traits;
      if (items) this.staticData.items = items;

      this.staticDataLoaded = true;
      console.log('✅ Static data loaded successfully');
    } catch (error) {
      console.warn('⚠️  Failed to load static data, falling back to API:', error);
      this.staticDataLoaded = true; // Mark as loaded to avoid retrying
    }
  }

  private async fetchWithCache<T>(endpoint: string): Promise<T> {
    const cacheKey = endpoint;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }

    try {
      const response = await fetch(`${API_BASE}${endpoint}`);
      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }
      const data = await response.json();

      this.cache.set(cacheKey, { data, timestamp: Date.now() });
      this.saveToLocalStorage();

      return data;
    } catch (error) {
      // If fetch fails, try to return stale cache
      if (cached) {
        console.warn('Using stale cache due to fetch error:', error);
        return cached.data;
      }
      throw error;
    }
  }

  private saveToLocalStorage() {
    try {
      const cacheData = Array.from(this.cache.entries());
      localStorage.setItem('gw2-api-cache', JSON.stringify(cacheData));
    } catch (e) {
      console.warn('Failed to save cache to localStorage:', e);
    }
  }

  private loadFromLocalStorage() {
    try {
      const cached = localStorage.getItem('gw2-api-cache');
      if (cached) {
        const cacheData = JSON.parse(cached);
        this.cache = new Map(cacheData);
      }
    } catch (e) {
      console.warn('Failed to load cache from localStorage:', e);
    }
  }

  constructor() {
    this.loadFromLocalStorage();
  }

  private registerSkillOverrides(
    lookup: Map<number, SkillModeOverrideInfo>
  ) {
    for (const [overrideId, info] of lookup.entries()) {
      const existing = this.skillOverrideLookup.get(overrideId);
      if (existing) {
        const mergedModes = Array.from(
          new Set([...existing.modes, ...info.modes])
        ) as SkillModeOverrideInfo['modes'];

        this.skillOverrideLookup.set(overrideId, {
          baseId: info.baseId,
          modes: mergedModes,
        });
      } else {
        this.skillOverrideLookup.set(overrideId, info);
      }
    }
  }

  private async resolveOverrideSkill(
    info: SkillModeOverrideInfo
  ): Promise<GW2SkillWithModes> {
    const baseSkill = await this.getSkill(info.baseId);
    const primaryMode = info.modes[0];

    if (!primaryMode) {
      return baseSkill;
    }

    const primaryData = baseSkill.modes[primaryMode] ?? baseSkill.modes.default;

    return {
      ...baseSkill,
      modes: {
        ...baseSkill.modes,
        default: primaryData,
      },
    };
  }

  // Fetch a single skill by ID
  async getSkill(id: number): Promise<GW2SkillWithModes> {
    // Load static data to check if we have competitive splits
    await this.loadStaticData();

    // Only use override lookup if we don't have competitive splits
    if (!this.hasCompetitiveSplits) {
      const cachedOverride = this.skillOverrideLookup.get(id);
      if (cachedOverride) {
        return this.resolveOverrideSkill(cachedOverride);
      }
    }

    const skill = await this.fetchWithCache<GW2Skill>(`/skills/${id}`);
    const normalized = this.normalizeSkill(skill);

    const profession = normalized.professions?.[0];
    if (profession && !this.processedSplitProfessions.has(profession)) {
      await this.getSkills(profession);
      // Only check for refreshed overrides if we don't have competitive splits
      if (!this.hasCompetitiveSplits) {
        const refreshedOverride = this.skillOverrideLookup.get(id);
        if (refreshedOverride) {
          return this.resolveOverrideSkill(refreshedOverride);
        }
      }
    }

    return normalized;
  }

  // Fetch all skills for a profession
  async getSkills(profession?: string): Promise<GW2SkillWithModes[]> {
    // Try to load from static data first
    await this.loadStaticData();

    if (this.staticData.skills && profession) {
      const skills = this.staticData.skills[profession];
      if (skills) {
        console.log(`📦 Loaded ${skills.length} ${profession} skills from static data`);
        const normalized = skills.map((skill: GW2Skill) => this.normalizeSkill(skill));

        // Only merge skill mode overrides if we don't have wiki-scraped competitive splits
        // (merging breaks the wiki-scraped data)
        if (!this.hasCompetitiveSplits) {
          const { skills: mergedSkills, overrideLookup } = mergeSkillModeOverrides(normalized);
          this.registerSkillOverrides(overrideLookup);
          this.processedSplitProfessions.add(profession);
          return mergedSkills;
        }

        this.processedSplitProfessions.add(profession);
        return normalized;
      }
    }

    // Fall back to API if static data not available
    console.log(`🌐 Fetching skills from API for ${profession || 'all professions'}`);
    const allSkillIds = await this.fetchWithCache<number[]>('/skills');

    // Fetch in batches of 200 (API limit)
    const skills: GW2SkillWithModes[] = [];
    for (let i = 0; i < allSkillIds.length; i += 200) {
      const batch = allSkillIds.slice(i, i + 200);
      const batchSkills = await this.fetchWithCache<GW2Skill[]>(
        `/skills?ids=${batch.join(',')}`
      );
      skills.push(...batchSkills.map(skill => this.normalizeSkill(skill)));
    }

    // Only merge skill mode overrides if we don't have wiki-scraped competitive splits
    let finalSkills = skills;
    if (!this.hasCompetitiveSplits) {
      const { skills: mergedSkills, overrideLookup } = mergeSkillModeOverrides(skills);
      this.registerSkillOverrides(overrideLookup);
      finalSkills = mergedSkills;
    }

    if (profession) {
      this.processedSplitProfessions.add(profession);
      // Case-insensitive profession filter
      const profLower = profession.toLowerCase();
      return finalSkills.filter(s =>
        s.professions && s.professions.some(p => p.toLowerCase() === profLower)
      );
    }

    finalSkills.forEach(skill => {
      skill.professions?.forEach(prof => this.processedSplitProfessions.add(prof));
    });

    return finalSkills;
  }

  // Fetch a single trait by ID
  async getTrait(id: number): Promise<GW2TraitWithModes> {
    // Try to load from static data first
    await this.loadStaticData();

    if (this.staticData.traits) {
      const trait = this.staticData.traits.find((t: GW2Trait) => t.id === id);
      if (trait) {
        return this.normalizeTrait(trait);
      }
    }

    // Fall back to API if not in static data
    const trait = await this.fetchWithCache<GW2Trait>(`/traits/${id}`);
    return this.normalizeTrait(trait);
  }

  // Fetch traits for a specialization
  async getTraits(specializationId: number): Promise<GW2TraitWithModes[]> {
    // Try to load from static data first
    await this.loadStaticData();

    const spec = await this.getSpecialization(specializationId);
    const traitIds = [...spec.minor_traits, ...spec.major_traits];

    if (this.staticData.traits) {
      const traits = this.staticData.traits.filter((t: GW2Trait) =>
        traitIds.includes(t.id)
      );
      if (traits.length === traitIds.length) {
        console.log(`📦 Loaded ${traits.length} traits from static data for spec ${specializationId}`);
        return traits.map((trait: GW2Trait) => this.normalizeTrait(trait));
      }
    }

    // Fall back to API if static data not available or incomplete
    console.log(`🌐 Fetching traits from API for spec ${specializationId}`);
    const traits = await this.fetchWithCache<GW2Trait[]>(
      `/traits?ids=${traitIds.join(',')}`
    );

    return traits.map(trait => this.normalizeTrait(trait));
  }

  // Fetch all specializations for a profession
  async getSpecializations(profession?: string): Promise<GW2Specialization[]> {
    // Try to load from static data first
    await this.loadStaticData();

    if (this.staticData.specializations) {
      const specs = this.staticData.specializations;
      console.log(`📦 Loaded ${specs.length} specializations from static data`);

      if (profession) {
        return specs.filter((s: GW2Specialization) => s.profession === profession);
      }
      return specs;
    }

    // Fall back to API if static data not available
    console.log(`🌐 Fetching specializations from API`);
    const allSpecIds = await this.fetchWithCache<number[]>('/specializations');
    const specs = await this.fetchWithCache<GW2Specialization[]>(
      `/specializations?ids=${allSpecIds.join(',')}`
    );

    if (profession) {
      return specs.filter(s => s.profession === profession);
    }
    return specs;
  }

  // Fetch single specialization
  async getSpecialization(id: number): Promise<GW2Specialization> {
    return await this.fetchWithCache<GW2Specialization>(`/specializations/${id}`);
  }

  // Fetch item stats
  async getItemStats(): Promise<GW2ItemStat[]> {
    const allStatIds = await this.fetchWithCache<number[]>('/itemstats');
    return await this.fetchWithCache<GW2ItemStat[]>(
      `/itemstats?ids=${allStatIds.join(',')}`
    );
  }

  // Fetch items (runes, relics) by IDs
  async getItems(itemIds: readonly number[]): Promise<GW2Item[]> {
    // Try to load from static data first
    await this.loadStaticData();

    if (this.staticData.items) {
      const items = this.staticData.items.filter((item: GW2Item) =>
        itemIds.includes(item.id)
      );
      if (items.length === itemIds.length) {
        console.log(`📦 Loaded ${items.length} items from static data`);
        return items;
      }
    }

    // Fall back to API if static data not available or incomplete
    console.log(`🌐 Fetching items from API`);
    const idsString = itemIds.join(',');
    return await this.fetchWithCache<GW2Item[]>(`/items?ids=${idsString}`);
  }

  // Fetch a single item by ID
  async getItem(itemId: number): Promise<GW2Item> {
    return await this.fetchWithCache<GW2Item>(`/items/${itemId}`);
  }

  // Clear cache
  clearCache() {
    this.cache.clear();
    localStorage.removeItem('gw2-api-cache');
  }
}

// Export singleton instance
export const gw2Api = new GW2ApiClient();
