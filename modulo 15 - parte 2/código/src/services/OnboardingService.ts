import userProfileRepository from '../repositories/UserProfileRepository.js';
import {
  UserProfile,
  OnboardingStep,
  ONBOARDING_QUESTIONS,
  OnboardingQuestion
} from '../models/UserProfile.js';
import personaService from './PersonaService.js';

function getQuestion(step: OnboardingStep): OnboardingQuestion | undefined {
  return ONBOARDING_QUESTIONS.find((question) => question.step === step);
}

function formatQuestion(question: OnboardingQuestion): string {
  const base = question.question;

  if (question.type === 'single_choice' && question.options) {
    return `${base}\n\nOpções: ${question.options.join(', ')}`;
  }

  if (question.type === 'multi_choice' && question.options) {
    return `${base}\n\nOpções: ${question.options.join(', ')}`;
  }

  return base;
}

/**
 * Service para gerenciar o fluxo de onboarding do usuário
 */
export class OnboardingService {
  /**
   * Verifica se o usuário precisa passar pelo onboarding
   */
  async needsOnboarding(whatsappNumber: string): Promise<boolean> {
    try {
      const profile = await userProfileRepository.findOrCreateProfile(whatsappNumber);
      return profile.profile_step < OnboardingStep.COMPLETED;
    } catch (error) {
      console.error('Erro ao verificar necessidade de onboarding:', error);
      return false;
    }
  }

  /**
   * Inicia o processo de onboarding
   */
  async startOnboarding(whatsappNumber: string): Promise<string> {
    try {
      const profile = await userProfileRepository.findOrCreateProfile(whatsappNumber);
      
      if (profile.profile_step === OnboardingStep.NOT_STARTED) {
        await userProfileRepository.updateProfile(whatsappNumber, {
          profile_step: OnboardingStep.AGE
        });

        const firstQuestion = getQuestion(OnboardingStep.AGE);
        return firstQuestion ? formatQuestion(firstQuestion) : 'Vamos começar! Quantos anos você tem?';
      }

      const currentQuestion = getQuestion(profile.profile_step as OnboardingStep);
      if (!currentQuestion) {
        return 'Vamos começar! Quantos anos você tem?';
      }

      return formatQuestion(currentQuestion);
    } catch (error) {
      console.error('Erro ao iniciar onboarding:', error);
      throw error;
    }
  }

  /**
   * Processa a resposta do usuário e retorna a próxima pergunta ou confirmação
   */
  async processResponse(
    whatsappNumber: string, 
    response: string
  ): Promise<{ message: string; completed: boolean; error?: string }> {
    try {
      const profile = await userProfileRepository.findOrCreateProfile(whatsappNumber);
      const currentStep = profile.profile_step as OnboardingStep;
      const currentQuestion = getQuestion(currentStep);

      if (!currentQuestion) {
        return {
          message: '❌ Não consegui identificar a próxima pergunta. Vamos voltar ao início? Quantos anos você tem?',
          completed: false,
          error: 'Step inválido'
        };
      }

      // Validar e salvar resposta com base no step atual
      const validationResult = this.validateResponse(currentQuestion, response);
      
      if (!validationResult.valid) {
        return {
          message: `❌ ${validationResult.error}\n\n${formatQuestion(currentQuestion)}`,
          completed: false,
          error: validationResult.error
        };
      }

      // Atualizar perfil com a resposta validada
      const updateData = this.buildUpdateData(currentQuestion, validationResult.value);

      if (currentStep < OnboardingStep.LEARNING_STYLE) {
        const nextStep = (currentStep + 1) as OnboardingStep;
        updateData.profile_step = nextStep;
        const updatedProfile = await userProfileRepository.updateProfile(whatsappNumber, updateData);

        await personaService.evaluatePersonaForProfile(updatedProfile, whatsappNumber, {
          assignedBy: 'onboarding',
          reason: `onboarding-step-${nextStep}`
        });

        const nextQuestion = getQuestion(nextStep);
        return {
          message: nextQuestion ? formatQuestion(nextQuestion) : 'Quase lá! Me conta mais sobre você.',
          completed: false
        };
      }

      updateData.profile_step = OnboardingStep.COMPLETED;
      updateData.completed_at = new Date();
      const updatedProfile = await userProfileRepository.updateProfile(whatsappNumber, updateData);

      await personaService.evaluatePersonaForProfile(updatedProfile, whatsappNumber, {
        assignedBy: 'onboarding',
        reason: 'onboarding-completed',
        force: true
      });

      return {
        message: this.generateCompletionMessage(updatedProfile),
        completed: true
      };
    } catch (error) {
      console.error('Erro ao processar resposta:', error);
      return {
        message: '❌ Ops! Algo deu errado. Vamos tentar de novo?',
        completed: false,
        error: 'Erro interno'
      };
    }
  }

  /**
   * Valida a resposta do usuário com base no step
   */
  private validateResponse(
    question: OnboardingQuestion,
    response: string
  ): { valid: boolean; value?: any; error?: string } {
    const trimmedResponse = response.trim();

    switch (question.step) {
      case OnboardingStep.AGE: {
        const age = parseInt(trimmedResponse);
        if (isNaN(age) || age < 13 || age > 120) {
          return {
            valid: false,
            error: 'Por favor, digite uma idade válida (número entre 13 e 120)'
          };
        }
        return { valid: true, value: age };
      }

      case OnboardingStep.RISK_TOLERANCE: {
        const riskNormalized = this.normalizeRiskTolerance(trimmedResponse);
        if (!riskNormalized) {
          return {
            valid: false,
            error: 'Por favor, escolha entre: Conservador, Moderado ou Agressivo'
          };
        }
        return { valid: true, value: riskNormalized };
      }

      case OnboardingStep.GOALS: {
        const goals = trimmedResponse
          .split(',')
          .map((g) => g.trim())
          .filter((g) => g.length > 0)
          .slice(0, question.maxItems ?? 3);

        if (goals.length === 0) {
          return {
            valid: false,
            error: 'Por favor, liste pelo menos um objetivo financeiro'
          };
        }
        return { valid: true, value: goals };
      }

      case OnboardingStep.INCOME_RANGE: {
        const incomeRange = this.normalizeIncomeRange(trimmedResponse);
        if (!incomeRange) {
          return {
            valid: false,
            error: 'Por favor, escolha uma faixa de renda válida (ex: "Até R$1k", "R$1k-3k", etc.)'
          };
        }
        return { valid: true, value: incomeRange };
      }

      case OnboardingStep.EXPERIENCE_LEVEL: {
        const experience = this.normalizeExperienceLevel(trimmedResponse);
        if (!experience) {
          return {
            valid: false,
            error: 'Por favor, escolha um nível de experiência válido'
          };
        }
        return { valid: true, value: experience };
      }

      case OnboardingStep.COMMUNICATION_STYLE:
      case OnboardingStep.CONTENT_FORMAT:
      case OnboardingStep.ENGAGEMENT_FREQUENCY:
      case OnboardingStep.LEARNING_STYLE: {
        const normalized = this.normalizeChoice(trimmedResponse, question.options);
        if (!normalized) {
          return {
            valid: false,
            error: 'Escolha uma das opções sugeridas. Você pode copiar exatamente o texto que preferir.'
          };
        }
        return { valid: true, value: normalized };
      }

      case OnboardingStep.INTEREST_TOPICS: {
        const selections = this.normalizeMultiChoice(
          trimmedResponse,
          question.options ?? [],
          question.maxItems ?? 4
        );

        if (selections.length === 0) {
          return {
            valid: false,
            error: 'Escolha pelo menos um tema. Pode digitar os nomes separados por vírgula.'
          };
        }
        return { valid: true, value: selections };
      }

      default:
        return { valid: false, error: 'Step inválido' };
    }
  }

  /**
   * Normaliza a resposta de tolerância ao risco
   */
  private normalizeRiskTolerance(response: string): string | null {
    const normalized = response.toLowerCase().trim();
    
    if (normalized.includes('conservador') || normalized.includes('baixo')) {
      return 'Conservador';
    }
    if (normalized.includes('moderado') || normalized.includes('medio') || normalized.includes('médio')) {
      return 'Moderado';
    }
    if (normalized.includes('agressivo') || normalized.includes('alto')) {
      return 'Agressivo';
    }
    
    return null;
  }

  /**
   * Normaliza a resposta de faixa de renda
   */
  private normalizeIncomeRange(response: string): string | null {
    const normalized = response.toLowerCase().trim();
    
    if (normalized.includes('até') && normalized.includes('1')) {
      return 'Até R$1k';
    }
    if ((normalized.includes('1') && normalized.includes('3')) || 
        (normalized.includes('mil') && normalized.includes('três'))) {
      return 'R$1k-3k';
    }
    if ((normalized.includes('3') && normalized.includes('5')) || 
        (normalized.includes('três') && normalized.includes('cinco'))) {
      return 'R$3k-5k';
    }
    if (normalized.includes('acima') || normalized.includes('mais') || normalized.includes('5k')) {
      return 'Acima de R$5k';
    }
    
    return null;
  }

  /**
   * Normaliza a resposta de nível de experiência
   */
  private normalizeExperienceLevel(response: string): string | null {
    const normalized = response.toLowerCase().trim();
    
    if (normalized.includes('iniciante') || normalized.includes('total') || normalized.includes('nunca')) {
      return 'Iniciante total';
    }
    if (normalized.includes('app') || normalized.includes('nubank') || normalized.includes('mexi')) {
      return 'Já mexi em apps tipo Nubank';
    }
    if (normalized.includes('pro') || normalized.includes('ações') || normalized.includes('cripto') || 
        normalized.includes('experiente')) {
      return 'Sou pro com ações e cripto';
    }
    
    return null;
  }

  private normalizeChoice(response: string, options?: string[]): string | null {
    if (!options || options.length === 0) {
      return response;
    }

    const normalized = response.toLowerCase();

    const exact = options.find((option) => option.toLowerCase() === normalized);
    if (exact) {
      return exact;
    }

    const partial = options.find((option) =>
      option.toLowerCase().includes(normalized) || normalized.includes(option.toLowerCase())
    );

    return partial ?? null;
  }

  private normalizeMultiChoice(response: string, options: string[], maxItems: number): string[] {
    const items = response
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    if (items.length === 0) {
      return [];
    }

    const normalizedOptions = options.map((option) => option.toLowerCase());
    const selections: string[] = [];

    for (const item of items) {
      if (selections.length >= maxItems) {
        break;
      }

      const lower = item.toLowerCase();

      const exactIdx = normalizedOptions.findIndex((opt) => opt === lower);
      if (exactIdx >= 0) {
        selections.push(options[exactIdx]);
        continue;
      }

      const partialIdx = normalizedOptions.findIndex((opt) => opt.includes(lower) || lower.includes(opt));
      if (partialIdx >= 0) {
        selections.push(options[partialIdx]);
        continue;
      }

      selections.push(item);
    }

    return selections.slice(0, maxItems);
  }

  /**
   * Constrói objeto de atualização com base no step
   */
  private buildUpdateData(question: OnboardingQuestion, value: any): any {
    switch (question.step) {
      case OnboardingStep.AGE:
        return { age: value };
      case OnboardingStep.RISK_TOLERANCE:
        return { risk_tolerance: value };
      case OnboardingStep.GOALS:
        return { goals: value };
      case OnboardingStep.INCOME_RANGE:
        return { income_range: value };
      case OnboardingStep.EXPERIENCE_LEVEL:
        return { experience_level: value };
      case OnboardingStep.COMMUNICATION_STYLE:
        return { communication_style: value };
      case OnboardingStep.CONTENT_FORMAT:
        return { content_format_preference: value };
      case OnboardingStep.ENGAGEMENT_FREQUENCY:
        return { engagement_frequency: value };
      case OnboardingStep.INTEREST_TOPICS:
        return { interest_tags: value };
      case OnboardingStep.LEARNING_STYLE:
        return { learning_style: value };
      default:
        return {};
    }
  }

  /**
   * Gera mensagem de conclusão do onboarding
   */
  private generateCompletionMessage(profile: UserProfile): string {
    return `🎉 Perfil pronto! Agora me conhece melhor!

📊 Seu perfil:
• ${profile.age} anos
• Perfil ${profile.risk_tolerance}
• Renda: ${profile.income_range}
• Experiência: ${profile.experience_level}
• Vibe de conversa: ${profile.communication_style ?? 'Amigão genérico'}
• Formato preferido: ${profile.content_format_preference ?? 'Mensagens curtas'}

🎯 Seus objetivos:
${profile.goals?.map((g, i) => `${i + 1}. ${g}`).join('\n')}

💡 Temas favoritos: ${(profile.interest_tags ?? []).join(', ') || 'vamos descobrir juntos!'}
🧠 Estilo de aprendizado: ${profile.learning_style ?? 'a gente ajusta pelo caminho'}

💡 Agora pode me perguntar sobre investimentos, tipo:
• "Como investir em ações?"
• "Qual melhor investimento pra mim?"
• "Como começar com criptomoedas?"

Bora fazer sua grana render! 🚀💰`;
  }

  /**
   * Obtém o perfil completo do usuário
   */
  async getUserProfile(whatsappNumber: string): Promise<UserProfile | null> {
    try {
      return await userProfileRepository.findByWhatsappNumber(whatsappNumber);
    } catch (error) {
      console.error('Erro ao buscar perfil:', error);
      return null;
    }
  }
}

export default new OnboardingService();
