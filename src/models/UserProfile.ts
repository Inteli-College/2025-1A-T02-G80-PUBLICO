/**
 * Interface para perfil do usuário
 */
export interface UserProfile {
  user_id: string;
  whatsapp_number: string;
  profile_step: number;
  age?: number;
  risk_tolerance?: 'Conservador' | 'Moderado' | 'Agressivo';
  goals?: string[];
  income_range?: string;
  experience_level?: string;
  created_at?: Date;
  updated_at?: Date;
  completed_at?: Date;
}

/**
 * Tipo para atualização parcial de perfil
 */
export type UserProfileUpdate = Partial<Omit<UserProfile, 'user_id' | 'whatsapp_number'>>;

/**
 * Enum para os passos do onboarding
 */
export enum OnboardingStep {
  NOT_STARTED = 0,
  AGE = 1,
  RISK_TOLERANCE = 2,
  GOALS = 3,
  INCOME_RANGE = 4,
  EXPERIENCE_LEVEL = 5,
  COMPLETED = 6
}

/**
 * Mapeamento de perguntas por step
 */
export const ONBOARDING_QUESTIONS: Record<number, string> = {
  1: "👋 Fala! Antes de começar a mandar as dicas de investimento, preciso te conhecer melhor!\n\n🎂 Quantos anos você tem?",
  2: "🎲 Beleza! Agora me conta: você curte risco alto tipo cripto, ou prefere algo mais chill?\n\nEscolha uma opção:\n• Conservador\n• Moderado\n• Agressivo",
  3: "🎯 Show! Quais são seus goals com a grana?\n\nExemplos: comprar um PS5, viajar pro exterior, guardar pra casa própria...\n\n💡 Liste até 3 objetivos separados por vírgula!",
  4: "💰 Qual sua faixa de renda mensal?\n\nEscolha uma opção:\n• Até R$1k\n• R$1k-3k\n• R$3k-5k\n• Acima de R$5k\n\n(É só pra te dar dicas que cabem no seu bolso!)",
  5: "📈 Por último: você já manja de investimentos?\n\nEscolha uma opção:\n• Iniciante total\n• Já mexi em apps tipo Nubank\n• Sou pro com ações e cripto"
};
