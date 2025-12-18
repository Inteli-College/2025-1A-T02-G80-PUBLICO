import { sql } from '../database/config.js';
import {
  Persona,
  CreatePersonaData,
  UpdatePersonaData,
  UserPersonaHistory,
  PersonaToolsConfig,
  PersonaMatchingRules
} from '../models/Persona.js';

export class PersonaRepository {
  private mapToPersona(row: any): Persona {
    return {
      id: row.id,
      slug: row.slug,
      display_name: row.display_name,
      description: row.description ?? undefined,
      system_prompt: row.system_prompt,
      style_guidelines: this.parseJson(row.style_guidelines),
      voice_id: row.voice_id ?? undefined,
      default_disclaimer: row.default_disclaimer ?? undefined,
      rag_filters: this.parseJson(row.rag_filters),
      tools: this.parseJson(row.tools) as PersonaToolsConfig | null | undefined,
      matching_rules: this.parseJson(row.matching_rules) as PersonaMatchingRules | null | undefined,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }

  private parseJson(value: unknown): Record<string, unknown> | null | undefined {
    if (value == null) {
      return value === null ? null : undefined;
    }

    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch (error) {
        console.error('Erro ao fazer parse de JSON de persona:', error);
        return null;
      }
    }

    return value as Record<string, unknown>;
  }

  async listAll(): Promise<Persona[]> {
    const result = await sql`
      SELECT * FROM personas
      ORDER BY display_name ASC
    `;

    return result.map(row => this.mapToPersona(row));
  }

  async findById(id: number): Promise<Persona | null> {
    const result = await sql`
      SELECT * FROM personas
      WHERE id = ${id}
      LIMIT 1
    `;

    if (result.length === 0) {
      return null;
    }

    return this.mapToPersona(result[0]);
  }

  async findBySlug(slug: string): Promise<Persona | null> {
    const result = await sql`
      SELECT * FROM personas
      WHERE slug = ${slug}
      LIMIT 1
    `;

    if (result.length === 0) {
      return null;
    }

    return this.mapToPersona(result[0]);
  }

  async create(data: CreatePersonaData): Promise<Persona> {
    const result = await sql`
      INSERT INTO personas (slug, display_name, description, system_prompt, style_guidelines, voice_id, default_disclaimer, rag_filters, tools, matching_rules)
      VALUES (
        ${data.slug},
        ${data.display_name},
        ${data.description ?? null},
        ${data.system_prompt},
        ${data.style_guidelines ? JSON.stringify(data.style_guidelines) : null}::jsonb,
        ${data.voice_id ?? null},
        ${data.default_disclaimer ?? null},
        ${data.rag_filters ? JSON.stringify(data.rag_filters) : null}::jsonb,
        ${data.tools ? JSON.stringify(data.tools) : null}::jsonb,
        ${data.matching_rules ? JSON.stringify(data.matching_rules) : null}::jsonb
      )
      RETURNING *
    `;

    return this.mapToPersona(result[0]);
  }

  async update(id: number, updates: UpdatePersonaData): Promise<Persona> {
    const current = await this.findById(id);
    if (!current) {
      throw new Error('Persona não encontrada');
    }

    const merged = {
      slug: updates.slug ?? current.slug,
      display_name: updates.display_name ?? current.display_name,
      description: updates.description ?? current.description ?? null,
      system_prompt: updates.system_prompt ?? current.system_prompt,
      style_guidelines: updates.style_guidelines ?? current.style_guidelines ?? null,
      voice_id: updates.voice_id ?? current.voice_id ?? null,
      default_disclaimer: updates.default_disclaimer ?? current.default_disclaimer ?? null,
      rag_filters: updates.rag_filters ?? current.rag_filters ?? null,
      tools: updates.tools ?? current.tools ?? null,
      matching_rules: updates.matching_rules ?? current.matching_rules ?? null
    };

    const result = await sql`
      UPDATE personas
      SET
        slug = ${merged.slug},
        display_name = ${merged.display_name},
        description = ${merged.description},
        system_prompt = ${merged.system_prompt},
        style_guidelines = ${merged.style_guidelines ? JSON.stringify(merged.style_guidelines) : null}::jsonb,
        voice_id = ${merged.voice_id},
        default_disclaimer = ${merged.default_disclaimer},
        rag_filters = ${merged.rag_filters ? JSON.stringify(merged.rag_filters) : null}::jsonb,
        tools = ${merged.tools ? JSON.stringify(merged.tools) : null}::jsonb,
        matching_rules = ${merged.matching_rules ? JSON.stringify(merged.matching_rules) : null}::jsonb,
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;

    return this.mapToPersona(result[0]);
  }

  async delete(id: number): Promise<void> {
    await sql`
      DELETE FROM personas WHERE id = ${id}
    `;
  }

  async logUserAssignment(
    userId: string,
    personaId: number | null,
    assignedBy?: string,
    reason?: string
  ): Promise<UserPersonaHistory> {
    const result = await sql`
      INSERT INTO user_persona_history (user_id, persona_id, assigned_by, reason)
      VALUES (
        ${userId},
        ${personaId},
        ${assignedBy ?? null},
        ${reason ?? null}
      )
      RETURNING *
    `;

    const row = result[0];
    return {
      id: row.id,
      user_id: row.user_id,
      persona_id: row.persona_id,
      assigned_by: row.assigned_by,
      reason: row.reason,
      created_at: row.created_at
    };
  }
}

export default new PersonaRepository();

