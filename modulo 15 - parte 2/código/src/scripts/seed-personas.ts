/**
 * Script para popular personas padrão na base de dados.
 * Uso: pnpm run seed:personas
 */

import dotenv from 'dotenv';
import { initializeTables, sql } from '../database/config.js';
import { PersonaRepository } from '../repositories/PersonaRepository.js';
import { UserProfileRepository } from '../repositories/UserProfileRepository.js';
import { DALIO_AI_PROMPT } from '../lib/utils/prompt.js';

dotenv.config();

const personaRepository = new PersonaRepository();
const userProfileRepository = new UserProfileRepository();

const DEFAULT_PERSONA_SLUG = 'dalio_default';

interface SeedPersonaDefinition {
  slug: string;
  display_name: string;
  description?: string;
  system_prompt: string;
  voice_id?: string | null;
  defaultDisclaimer?: string | null;
  style_guidelines?: Record<string, unknown>;
  rag_filters?: Record<string, unknown>;
  tools?: { allowed?: string[]; forced?: string[] };
  matching_rules?: {
    baseScore?: number;
    preferredCommunicationStyles?: string[];
    preferredContentFormats?: string[];
    preferredEngagementFrequencies?: string[];
    preferredLearningStyles?: string[];
    preferredInterestTags?: string[];
  };
}

function buildPrompt(base: string, extraInstructions: string): string {
  return `${base}\n\n${extraInstructions.trim()}`;
}

const defaultDisclaimer =
  'Lembre-se, isso não é conselho financeiro profissional. Consulte um consultor certificado ou use apps regulados pela CVM antes de investir. Investimentos envolvem riscos, inclusive perda de dinheiro.';

const personas: SeedPersonaDefinition[] = [
  {
    slug: DEFAULT_PERSONA_SLUG,
    display_name: 'Dalio (Amigo Gen Z)',
    description: 'Persona padrão com tom amigável, referências pop e foco em educação financeira para Gen Z.',
    system_prompt: buildPrompt(
      DALIO_AI_PROMPT,
      'Reforce sempre que você é a versão "Amigo Gen Z": use humor leve, gírias atuais, memórias de app/streaming e faça perguntas abertas para manter o papo leve.'
    ),
    voice_id: 'bJrNspxJVFovUxNBQ0wh',
    defaultDisclaimer,
    style_guidelines: {
      tone: 'Informal, animado e encorajador.',
      emojis: 'Utilize emojis relevantes em quase todas as mensagens.',
      references: 'Use referências pop, TikTok, séries e música, mas evite exageros ou polêmicas.'
    },
    rag_filters: {
      segments: ['gen_z', 'brasil'],
      themes: ['educacao_financeira', 'investimentos_basicos']
    },
    tools: {
      allowed: ['calc_compound_interest']
    },
    matching_rules: {
      baseScore: 0,
      preferredCommunicationStyles: ['Amigão que puxa papo'],
      preferredContentFormats: ['Mensagens curtas', 'Resumo com links para estudar depois'],
      preferredEngagementFrequencies: ['Algumas vezes na semana', 'Só quando eu chamar'],
      preferredInterestTags: ['Finanças do dia a dia', 'Ganhar renda extra']
    }
  },
  {
    slug: 'dalio_mentor',
    display_name: 'Dalio Mentor Calmo',
    description: 'Mentor mais estruturado, com linguagem acolhedora e foco em planejamento de longo prazo.',
    system_prompt: buildPrompt(
      DALIO_AI_PROMPT,
      'Adote o estilo "Mentor Calmo": tom acolhedor, mensagens levemente mais formais e foco em planos passo a passo. Reforce hábitos sustentáveis e revisões periódicas.'
    ),
    voice_id: 'JBFqnCBsd6RMkjVDRZzb',
    defaultDisclaimer,
    style_guidelines: {
      tone: 'Calmo, confiável e estruturado.',
      emojis: 'Use emojis com moderação, priorizando clareza.',
      structure: 'Prefira parágrafos curtos com transições suaves e convites à reflexão.'
    },
    rag_filters: {
      segments: ['gen_z', 'planejamento'],
      themes: ['renda_fixa', 'organizacao_financeira']
    },
    tools: {
      allowed: ['budget_planner', 'calc_compound_interest']
    },
    matching_rules: {
      baseScore: 1,
      preferredCommunicationStyles: ['Mentor calmo e organizado'],
      preferredContentFormats: ['Passo a passo detalhado'],
      preferredEngagementFrequencies: ['Algumas vezes na semana', 'Quero lembretes quando algo importante acontecer'],
      preferredLearningStyles: ['Prefiro referências e fontes', 'Curto planilhas e números'],
      preferredInterestTags: ['Renda fixa', 'Planejamento para estudar fora', 'Finanças do dia a dia']
    }
  },
  {
    slug: 'dalio_visionario',
    display_name: 'Dalio Visionário Tech',
    description: 'Persona entusiasmada com tecnologia, web3 e tendências de mercado, mantendo educação financeira responsável.',
    system_prompt: buildPrompt(
      DALIO_AI_PROMPT,
      'Assuma o modo "Visionário Tech": destaque inovações (fintechs, web3, IA) sempre pontuando riscos e importância de diversificação. Use linguagem empolgada, mas responsável.'
    ),
    voice_id: 'kQAljic5E6KxA5gG6F0A',
    defaultDisclaimer,
    style_guidelines: {
      tone: 'Empolgado, futurista e curioso.',
      analogies: 'Faça paralelos com tecnologia, games e startups.',
      caution: 'Sempre balanceie hype com avisos de risco claros.'
    },
    rag_filters: {
      segments: ['gen_z', 'tech'],
      themes: ['criptomoedas', 'fintech', 'inovacao']
    },
    tools: {
      allowed: ['crypto_risk_pulse', 'calc_compound_interest']
    },
    matching_rules: {
      baseScore: 1.5,
      preferredCommunicationStyles: ['Geek empolgado por tecnologia'],
      preferredContentFormats: ['Resumo com links para estudar depois'],
      preferredEngagementFrequencies: ['Quero lembretes quando algo importante acontecer'],
      preferredLearningStyles: ['Aprendo melhor com exemplos reais', 'Quero desafios e missões semanais'],
      preferredInterestTags: ['Criptomoedas', 'ETFs globais', 'Ganhar renda extra']
    }
  }
];

async function upsertPersona(definition: SeedPersonaDefinition) {
  const existing = await personaRepository.findBySlug(definition.slug);

  if (!existing) {
    await personaRepository.create({
      slug: definition.slug,
      display_name: definition.display_name,
      description: definition.description,
      system_prompt: definition.system_prompt,
      voice_id: definition.voice_id,
      default_disclaimer: definition.defaultDisclaimer,
      style_guidelines: definition.style_guidelines,
      rag_filters: definition.rag_filters,
      tools: definition.tools,
      matching_rules: definition.matching_rules
    });
    console.log(`✅ Persona criada: ${definition.slug}`);
    return;
  }

  await personaRepository.update(existing.id, {
    display_name: definition.display_name,
    description: definition.description,
    system_prompt: definition.system_prompt,
    voice_id: definition.voice_id,
    default_disclaimer: definition.defaultDisclaimer,
    style_guidelines: definition.style_guidelines,
    rag_filters: definition.rag_filters,
    tools: definition.tools,
    matching_rules: definition.matching_rules
  });

  console.log(`🔄 Persona atualizada: ${definition.slug}`);
}

async function assignDefaultsToUsers(defaultPersonaId: number) {
  // Garantir que perfis sem persona recebam a padrão
  const profiles = await sql`
    SELECT user_id, whatsapp_number FROM user_profiles WHERE persona_id IS NULL
  `;

  for (const profile of profiles as any[]) {
    await userProfileRepository.updateProfile(profile.whatsapp_number, {
      persona_id: defaultPersonaId,
      persona_assigned_at: new Date()
    });
    await personaRepository.logUserAssignment(profile.user_id, defaultPersonaId, 'seed-personas', 'assign-default-persona');
    console.log(`👤 Persona padrão atribuída ao usuário ${profile.whatsapp_number}`);
  }
}

async function main() {
  console.log('🚀 Iniciando seed de personas...');
  await initializeTables();

  for (const persona of personas) {
    await upsertPersona(persona);
  }

  const defaultPersona = await personaRepository.findBySlug(DEFAULT_PERSONA_SLUG);
  if (defaultPersona) {
    await assignDefaultsToUsers(defaultPersona.id);
  } else {
    console.warn('⚠️ Persona padrão não encontrada após seed. Verifique o processo.');
  }

  console.log('✅ Seed de personas concluído!');
  process.exit(0);
}

main().catch((error) => {
  console.error('❌ Erro ao executar seed de personas:', error);
  process.exit(1);
});


