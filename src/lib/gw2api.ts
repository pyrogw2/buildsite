import type { GW2Skill, GW2Trait, GW2Specialization, GW2ItemStat, GW2Item } from '../types/gw2';

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

  private async loadStaticData(): Promise<void> {
    if (this.staticDataLoaded) return;

    try {
      const base = import.meta.env.BASE_URL;
      const [skills, specializations, traits, items] = await Promise.all([
        fetch(`${base}data/skills.json`).then(r => r.ok ? r.json() : null),
        fetch(`${base}data/specializations.json`).then(r => r.ok ? r.json() : null),
        fetch(`${base}data/traits.json`).then(r => r.ok ? r.json() : null),
        fetch(`${base}data/items.json`).then(r => r.ok ? r.json() : null),
      ]);

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

  // Fetch a single skill by ID
  async getSkill(id: number): Promise<GW2Skill> {
    return await this.fetchWithCache<GW2Skill>(`/skills/${id}`);
  }

  // Fetch all skills for a profession
  async getSkills(profession?: string): Promise<GW2Skill[]> {
    // Try to load from static data first
    await this.loadStaticData();

    if (this.staticData.skills && profession) {
      const skills = this.staticData.skills[profession];
      if (skills) {
        console.log(`📦 Loaded ${skills.length} ${profession} skills from static data`);
        return skills;
      }
    }

    // Fall back to API if static data not available
    console.log(`🌐 Fetching skills from API for ${profession || 'all professions'}`);
    const allSkillIds = await this.fetchWithCache<number[]>('/skills');

    // Fetch in batches of 200 (API limit)
    const skills: GW2Skill[] = [];
    for (let i = 0; i < allSkillIds.length; i += 200) {
      const batch = allSkillIds.slice(i, i + 200);
      const batchSkills = await this.fetchWithCache<GW2Skill[]>(
        `/skills?ids=${batch.join(',')}`
      );
      skills.push(...batchSkills);
    }

    if (profession) {
      // Case-insensitive profession filter
      const profLower = profession.toLowerCase();
      return skills.filter(s =>
        s.professions && s.professions.some(p => p.toLowerCase() === profLower)
      );
    }
    return skills;
  }

  // Fetch a single trait by ID
  async getTrait(id: number): Promise<GW2Trait> {
    return await this.fetchWithCache<GW2Trait>(`/traits/${id}`);
  }

  // Fetch traits for a specialization
  async getTraits(specializationId: number): Promise<GW2Trait[]> {
    const spec = await this.getSpecialization(specializationId);
    const traitIds = [...spec.minor_traits, ...spec.major_traits];

    return await this.fetchWithCache<GW2Trait[]>(
      `/traits?ids=${traitIds.join(',')}`
    );
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
