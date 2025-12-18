export interface Persona {
  id: number;
  slug: string;
  display_name: string;
  description?: string;
  system_prompt: string;
  style_guidelines?: Record<string, unknown> | null;
  voice_id?: string | null;
  default_disclaimer?: string | null;
  rag_filters?: Record<string, unknown> | null;
  tools?: PersonaToolsConfig | null;
  matching_rules?: PersonaMatchingRules | null;
  created_at?: Date;
  updated_at?: Date;
}

export interface CreatePersonaData {
  slug: string;
  display_name: string;
  system_prompt: string;
  description?: string;
  style_guidelines?: Record<string, unknown> | null;
  voice_id?: string | null;
  default_disclaimer?: string | null;
  rag_filters?: Record<string, unknown> | null;
  tools?: PersonaToolsConfig | null;
  matching_rules?: PersonaMatchingRules | null;
}

export type UpdatePersonaData = Partial<CreatePersonaData>;

export interface UserPersonaHistory {
  id: number;
  user_id: string;
  persona_id: number | null;
  assigned_by?: string | null;
  reason?: string | null;
  created_at: Date;
}

export interface PersonaToolsConfig {
  allowed?: string[];
  forced?: string[];
}

export interface PersonaMatchingRules {
  baseScore?: number;
  preferredCommunicationStyles?: string[];
  preferredContentFormats?: string[];
  preferredEngagementFrequencies?: string[];
  preferredLearningStyles?: string[];
  preferredInterestTags?: string[];
}

