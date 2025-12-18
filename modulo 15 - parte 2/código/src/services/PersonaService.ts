import { PersonaRepository } from '../repositories/PersonaRepository.js';
import { UserProfileRepository } from '../repositories/UserProfileRepository.js';
import type { Persona, UserProfile } from '../models/index.js';
import type { Tool } from 'ai';
import { buildToolset } from '../tools/toolRegistry.js';

export const DEFAULT_PERSONA_SLUG = 'dalio_default';

interface AssignOptions {
  assignedBy?: string;
  reason?: string;
}

interface EnsurePersonaResult {
  persona: Persona | null;
  profile: UserProfile | null;
}

interface EvaluateOptions extends AssignOptions {
  force?: boolean;
  defaultSlug?: string;
}

export class PersonaService {
  private personaRepo: PersonaRepository;
  private userProfileRepo: UserProfileRepository;
  private personaCache: Map<number, Persona> = new Map();
  private slugCache: Map<string, Persona> = new Map();
  private defaultPersonaLoaded = false;
  private personaListCache: Persona[] | null = null;

  constructor() {
    this.personaRepo = new PersonaRepository();
    this.userProfileRepo = new UserProfileRepository();
  }

  private cachePersona(persona: Persona): void {
    if (!persona) {
      return;
    }
    this.personaCache.set(persona.id, persona);
    this.slugCache.set(persona.slug, persona);
  }

  async getPersonaById(id: number): Promise<Persona | null> {
    if (this.personaCache.has(id)) {
      return this.personaCache.get(id) ?? null;
    }

    const persona = await this.personaRepo.findById(id);
    if (persona) {
      this.cachePersona(persona);
    }
    return persona;
  }

  async getPersonaBySlug(slug: string): Promise<Persona | null> {
    if (this.slugCache.has(slug)) {
      return this.slugCache.get(slug) ?? null;
    }

    const persona = await this.personaRepo.findBySlug(slug);
    if (persona) {
      this.cachePersona(persona);
    }
    return persona;
  }

  private async getAllPersonas(): Promise<Persona[]> {
    if (this.personaListCache) {
      return this.personaListCache;
    }

    const personas = await this.personaRepo.listAll();
    personas.forEach((persona) => this.cachePersona(persona));
    this.personaListCache = personas;
    return personas;
  }

  async getDefaultPersona(): Promise<Persona | null> {
    if (this.defaultPersonaLoaded && this.slugCache.has(DEFAULT_PERSONA_SLUG)) {
      return this.slugCache.get(DEFAULT_PERSONA_SLUG) ?? null;
    }

    const persona = await this.getPersonaBySlug(DEFAULT_PERSONA_SLUG);
    this.defaultPersonaLoaded = true;
    return persona;
  }

  private async logAssignment(profile: UserProfile, personaId: number | null, options?: AssignOptions) {
    try {
      await this.personaRepo.logUserAssignment(
        profile.user_id,
        personaId,
        options?.assignedBy ?? 'system',
        options?.reason ?? 'auto-assignment'
      );
    } catch (error) {
      console.error('Erro ao registrar histórico de persona:', error);
    }
  }

  async assignPersonaById(
    whatsappNumber: string,
    personaId: number,
    options?: AssignOptions
  ): Promise<EnsurePersonaResult> {
    const profile = await this.userProfileRepo.findByWhatsappNumber(whatsappNumber);
    if (!profile) {
      return { persona: await this.getPersonaById(personaId), profile: null };
    }

    const persona = await this.getPersonaById(personaId);
    if (!persona) {
      return { persona: null, profile };
    }

    const updatedProfile = await this.userProfileRepo.updateProfile(whatsappNumber, {
      persona_id: persona.id,
      persona_assigned_at: new Date()
    });

    await this.logAssignment(updatedProfile, persona.id, options);
    return { persona, profile: updatedProfile };
  }

  private normalize(value?: string | null): string | null {
    if (!value) {
      return null;
    }
    return value.trim().toLowerCase();
  }

  private matchesPreference(value: string | undefined, preferences?: string[]): boolean {
    if (!value || !preferences || preferences.length === 0) {
      return false;
    }

    const normalizedValue = this.normalize(value);
    return preferences.some((pref) => this.normalize(pref) === normalizedValue);
  }

  private countTagMatches(tags: string[] | undefined, preferredTags?: string[]): number {
    if (!tags || tags.length === 0 || !preferredTags || preferredTags.length === 0) {
      return 0;
    }

    const normalizedTags = tags.map((tag) => this.normalize(tag)).filter(Boolean) as string[];
    const normalizedPreferred = preferredTags
      .map((tag) => this.normalize(tag))
      .filter(Boolean) as string[];

    return normalizedTags.filter((tag) => normalizedPreferred.includes(tag)).length;
  }

  private calculatePersonaScore(profile: UserProfile, persona: Persona): number {
    const rules = persona.matching_rules;
    if (!rules) {
      return persona.slug === DEFAULT_PERSONA_SLUG ? 0 : -0.5;
    }

    let score = rules.baseScore ?? 0;

    if (this.matchesPreference(profile.communication_style, rules.preferredCommunicationStyles)) {
      score += 3;
    }

    if (this.matchesPreference(profile.content_format_preference, rules.preferredContentFormats)) {
      score += 2;
    }

    if (this.matchesPreference(profile.engagement_frequency, rules.preferredEngagementFrequencies)) {
      score += 1.5;
    }

    if (this.matchesPreference(profile.learning_style, rules.preferredLearningStyles)) {
      score += 2.5;
    }

    const interestMatches = this.countTagMatches(profile.interest_tags, rules.preferredInterestTags);
    score += interestMatches * 1.5;

    return score;
  }

  private buildPersonaToolset(persona: Persona | null | undefined): Record<string, Tool<any, any>> | undefined {
    if (!persona?.tools) {
      return undefined;
    }

    const allowed = persona.tools.allowed ?? [];
    if (allowed.length === 0) {
      return undefined;
    }

    return buildToolset(allowed);
  }

  getToolsForPersona(persona: Persona | null | undefined): Record<string, Tool<any, any>> | undefined {
    return this.buildPersonaToolset(persona);
  }

  private async maybeAssignPersona(
    whatsappNumber: string,
    profile: UserProfile,
    candidates: Persona[],
    options?: EvaluateOptions
  ): Promise<Persona | null> {
    if (candidates.length === 0) {
      return null;
    }

    const scores = candidates.map((persona) => ({
      persona,
      score: this.calculatePersonaScore(profile, persona)
    }));

    scores.sort((a, b) => b.score - a.score);

    const best = scores[0];
    const currentPersona = profile.persona_id ? await this.getPersonaById(profile.persona_id) : null;
    const currentScore = currentPersona ? this.calculatePersonaScore(profile, currentPersona) : -Infinity;

    const threshold = options?.force ? 0 : 0.75;

    if (!currentPersona) {
      if (best && best.persona) {
        const result = await this.assignPersonaById(whatsappNumber, best.persona.id, options);
        return result.persona;
      }
      return null;
    }

    if (!best || !best.persona) {
      return currentPersona;
    }

    if (best.persona.id !== currentPersona.id && best.score >= currentScore + threshold) {
      const result = await this.assignPersonaById(whatsappNumber, best.persona.id, options);
      return result.persona;
    }

    return currentPersona;
  }

  async assignPersonaBySlug(
    whatsappNumber: string,
    slug: string,
    options?: AssignOptions
  ): Promise<EnsurePersonaResult> {
    const persona = await this.getPersonaBySlug(slug);
    if (!persona) {
      return { persona: null, profile: await this.userProfileRepo.findByWhatsappNumber(whatsappNumber) };
    }
    return this.assignPersonaById(whatsappNumber, persona.id, options);
  }

  async ensurePersonaForUser(
    whatsappNumber: string,
    options?: AssignOptions & { defaultSlug?: string }
  ): Promise<EnsurePersonaResult> {
    const profile = await this.userProfileRepo.findByWhatsappNumber(whatsappNumber);
    if (!profile) {
      return { persona: await this.getDefaultPersona(), profile: null };
    }

    const persona = await this.evaluatePersonaForProfile(profile, whatsappNumber, {
      ...options,
      defaultSlug: options?.defaultSlug ?? DEFAULT_PERSONA_SLUG
    });

    const refreshedProfile = await this.userProfileRepo.findByWhatsappNumber(whatsappNumber);
    if (persona) {
      return { persona, profile: refreshedProfile ?? profile };
    }

    const fallback = await this.getPersonaBySlug(options?.defaultSlug ?? DEFAULT_PERSONA_SLUG) ?? (await this.getDefaultPersona());
    if (fallback) {
      const result = await this.assignPersonaById(whatsappNumber, fallback.id, options);
      return { persona: result.persona, profile: result.profile ?? refreshedProfile ?? profile };
    }

    return { persona: null, profile: refreshedProfile ?? profile };
  }

  async evaluatePersonaForProfile(
    profile: UserProfile,
    whatsappNumber: string,
    options?: EvaluateOptions
  ): Promise<Persona | null> {
    const personas = await this.getAllPersonas();

    if (personas.length === 0) {
      return null;
    }

    const result = await this.maybeAssignPersona(whatsappNumber, profile, personas, options);

    if (result) {
      return result;
    }

    if (!profile.persona_id) {
      const fallbackSlug = options?.defaultSlug ?? DEFAULT_PERSONA_SLUG;
      const fallbackPersona = await this.getPersonaBySlug(fallbackSlug) ?? (await this.getDefaultPersona());
      if (fallbackPersona) {
        await this.assignPersonaById(whatsappNumber, fallbackPersona.id, options);
        return fallbackPersona;
      }
    }

    return profile.persona_id ? await this.getPersonaById(profile.persona_id) : null;
  }

  clearCache(): void {
    this.personaCache.clear();
    this.slugCache.clear();
    this.defaultPersonaLoaded = false;
    this.personaListCache = null;
  }
}

const personaService = new PersonaService();
export default personaService;

