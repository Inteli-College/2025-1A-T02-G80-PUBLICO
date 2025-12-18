export interface UserProfile {
  user_id: string;
  whatsapp_number: string;
  profile_step: number;
  age?: number;
  risk_tolerance?: 'Conservador' | 'Moderado' | 'Agressivo';
  goals?: string[];
  income_range?: string;
  experience_level?: string;
  persona_id?: number;
  persona_preferences?: Record<string, unknown> | null;
  persona_assigned_at?: Date;
  communication_style?: string;
  content_format_preference?: string;
  engagement_frequency?: string;
  learning_style?: string;
  interest_tags?: string[];
  created_at?: Date;
  updated_at?: Date;
  completed_at?: Date;
}

export type UserProfileUpdate = Partial<Omit<UserProfile, 'user_id' | 'whatsapp_number'>>;

export enum OnboardingStep {
  NOT_STARTED = 0,
  AGE = 1,
  RISK_TOLERANCE = 2,
  GOALS = 3,
  INCOME_RANGE = 4,
  EXPERIENCE_LEVEL = 5,
  COMMUNICATION_STYLE = 6,
  CONTENT_FORMAT = 7,
  ENGAGEMENT_FREQUENCY = 8,
  INTEREST_TOPICS = 9,
  LEARNING_STYLE = 10,
  COMPLETED = 11
}

export interface OnboardingQuestion {
  step: OnboardingStep;
  question: string;
  key: keyof Pick<
    UserProfile,
    'age' | 'risk_tolerance' | 'goals' | 'income_range' | 'experience_level' |
    'communication_style' | 'content_format_preference' | 'engagement_frequency' |
    'interest_tags' | 'learning_style'
  >;
  type: 'number' | 'single_choice' | 'multi_choice' | 'text' | 'list';
  options?: string[];
  maxItems?: number;
  helper?: string;
}

export const ONBOARDING_QUESTIONS: OnboardingQuestion[] = [
  {
    step: OnboardingStep.AGE,
    key: 'age',
    type: 'number',
    question: "👋 Fala! Antes de começar a mandar as dicas de investimento, preciso te conhecer melhor!\n\n🎂 Quantos anos você tem?"
  },
  {
    step: OnboardingStep.RISK_TOLERANCE,
    key: 'risk_tolerance',
    type: 'single_choice',
    options: ['Conservador', 'Moderado', 'Agressivo'],
    question: "🎲 Beleza! Agora me conta: você curte risco alto tipo cripto, ou prefere algo mais chill?\n\nEscolha uma opção: Conservador, Moderado ou Agressivo."
  },
  {
    step: OnboardingStep.GOALS,
    key: 'goals',
    type: 'list',
    maxItems: 3,
    question: "🎯 Show! Quais são seus goals com a grana?\n\nExemplos: comprar um PS5, viajar pro exterior, guardar pra casa própria...\n\n💡 Liste até 3 objetivos separados por vírgula!"
  },
  {
    step: OnboardingStep.INCOME_RANGE,
    key: 'income_range',
    type: 'single_choice',
    options: ['Até R$1k', 'R$1k-3k', 'R$3k-5k', 'Acima de R$5k'],
    question: "💰 Qual sua faixa de renda mensal?\n\nEscolha uma opção: Até R$1k, R$1k-3k, R$3k-5k ou Acima de R$5k."
  },
  {
    step: OnboardingStep.EXPERIENCE_LEVEL,
    key: 'experience_level',
    type: 'single_choice',
    options: ['Iniciante total', 'Já mexi em apps tipo Nubank', 'Sou pro com ações e cripto'],
    question: "📈 Me conta: você já manja de investimentos?\n\nEscolha uma opção: Iniciante total, Já mexi em apps tipo Nubank ou Sou pro com ações e cripto."
  },
  {
    step: OnboardingStep.COMMUNICATION_STYLE,
    key: 'communication_style',
    type: 'single_choice',
    options: ['Amigão que puxa papo', 'Mentor calmo e organizado', 'Coach motivador', 'Geek empolgado por tecnologia'],
    question: "🗣️ Qual vibe de conversa você curte?\n\nEscolha entre: Amigão que puxa papo, Mentor calmo e organizado, Coach motivador ou Geek empolgado por tecnologia."
  },
  {
    step: OnboardingStep.CONTENT_FORMAT,
    key: 'content_format_preference',
    type: 'single_choice',
    options: ['Mensagens curtas', 'Passo a passo detalhado', 'Áudio explicativo', 'Resumo com links para estudar depois'],
    question: "📦 Como você prefere receber as respostas?\n\nEscolha: Mensagens curtas, Passo a passo detalhado, Áudio explicativo ou Resumo com links."
  },
  {
    step: OnboardingStep.ENGAGEMENT_FREQUENCY,
    key: 'engagement_frequency',
    type: 'single_choice',
    options: ['Diariamente', 'Algumas vezes na semana', 'Só quando eu chamar', 'Quero lembretes quando algo importante acontecer'],
    question: "⏱️ Qual ritmo de contato funciona melhor pra você?"
  },
  {
    step: OnboardingStep.INTEREST_TOPICS,
    key: 'interest_tags',
    type: 'multi_choice',
    maxItems: 4,
    options: ['Renda fixa', 'Ações Brasil', 'ETFs globais', 'Criptomoedas', 'ESG e impacto', 'Finanças do dia a dia', 'Planejamento para estudar fora', 'Ganhar renda extra'],
    question: "🎯 Quais temas mais te interessam? Pode escolher até 4!"
  },
  {
    step: OnboardingStep.LEARNING_STYLE,
    key: 'learning_style',
    type: 'single_choice',
    options: ['Aprendo melhor com exemplos reais', 'Prefiro referências e fontes', 'Curto planilhas e números', 'Quero desafios e missões semanais'],
    question: "🧠 Como você aprende melhor? Me conta o estilo que mais funciona contigo."
  }
];