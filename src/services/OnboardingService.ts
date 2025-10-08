import userProfileRepository from '../repositories/UserProfileRepository';
import { UserProfile, OnboardingStep, ONBOARDING_QUESTIONS } from '../models/UserProfile';

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
      
      if (profile.profile_step === 0) {
        // Atualizar para step 1 e retornar primeira pergunta
        await userProfileRepository.updateProfile(whatsappNumber, {
          profile_step: OnboardingStep.AGE
        });
        return ONBOARDING_QUESTIONS[1];
      }
      
      // Se já está em algum step, retornar a pergunta atual
      return ONBOARDING_QUESTIONS[profile.profile_step];
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
      const currentStep = profile.profile_step;

      // Validar e salvar resposta com base no step atual
      const validationResult = this.validateResponse(currentStep, response);
      
      if (!validationResult.valid) {
        return {
          message: `❌ ${validationResult.error}\n\n${ONBOARDING_QUESTIONS[currentStep]}`,
          completed: false,
          error: validationResult.error
        };
      }

      // Atualizar perfil com a resposta validada
      const updateData = this.buildUpdateData(currentStep, validationResult.value);
      
      if (currentStep < OnboardingStep.COMPLETED - 1) {
        // Avançar para o próximo step
        updateData.profile_step = currentStep + 1;
        await userProfileRepository.updateProfile(whatsappNumber, updateData);
        
        return {
          message: ONBOARDING_QUESTIONS[currentStep + 1],
          completed: false
        };
      } else {
        // Último step - marcar como completo
        updateData.profile_step = OnboardingStep.COMPLETED;
        updateData.completed_at = new Date();
        await userProfileRepository.updateProfile(whatsappNumber, updateData);
        
        return {
          message: this.generateCompletionMessage(profile),
          completed: true
        };
      }
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
    step: number, 
    response: string
  ): { valid: boolean; value?: any; error?: string } {
    const trimmedResponse = response.trim();

    switch (step) {
      case OnboardingStep.AGE:
        const age = parseInt(trimmedResponse);
        if (isNaN(age) || age < 13 || age > 120) {
          return { 
            valid: false, 
            error: 'Por favor, digite uma idade válida (número entre 13 e 120)' 
          };
        }
        return { valid: true, value: age };

      case OnboardingStep.RISK_TOLERANCE:
        const riskNormalized = this.normalizeRiskTolerance(trimmedResponse);
        if (!riskNormalized) {
          return { 
            valid: false, 
            error: 'Por favor, escolha entre: Conservador, Moderado ou Agressivo' 
          };
        }
        return { valid: true, value: riskNormalized };

      case OnboardingStep.GOALS:
        const goals = trimmedResponse
          .split(',')
          .map(g => g.trim())
          .filter(g => g.length > 0)
          .slice(0, 3); // Máximo 3 objetivos
        
        if (goals.length === 0) {
          return { 
            valid: false, 
            error: 'Por favor, liste pelo menos um objetivo financeiro' 
          };
        }
        return { valid: true, value: goals };

      case OnboardingStep.INCOME_RANGE:
        const incomeRange = this.normalizeIncomeRange(trimmedResponse);
        if (!incomeRange) {
          return { 
            valid: false, 
            error: 'Por favor, escolha uma faixa de renda válida (ex: "Até R$1k", "R$1k-3k", etc.)' 
          };
        }
        return { valid: true, value: incomeRange };

      case OnboardingStep.EXPERIENCE_LEVEL:
        const experience = this.normalizeExperienceLevel(trimmedResponse);
        if (!experience) {
          return { 
            valid: false, 
            error: 'Por favor, escolha um nível de experiência válido' 
          };
        }
        return { valid: true, value: experience };

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

  /**
   * Constrói objeto de atualização com base no step
   */
  private buildUpdateData(step: number, value: any): any {
    switch (step) {
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

🎯 Seus objetivos:
${profile.goals?.map((g, i) => `${i + 1}. ${g}`).join('\n')}

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
