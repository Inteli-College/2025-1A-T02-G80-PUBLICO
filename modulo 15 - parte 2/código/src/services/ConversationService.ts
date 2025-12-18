import { ConversationRepository, MessageRepository } from '../repositories/index.js';
import type { 
  Conversation, 
  CreateConversationData, 
  ConversationContext,
} from '../models/index.js';

export class ConversationService {
  private conversationRepo: ConversationRepository;
  private messageRepo: MessageRepository;

  constructor() {
    this.conversationRepo = new ConversationRepository();
    this.messageRepo = new MessageRepository();
  }

  /**
   * Busca ou cria uma conversa para um número do WhatsApp
   */
  async getOrCreateConversation(
    whatsappNumber: string, 
    userName?: string
  ): Promise<Conversation> {
    try {
      // Busca conversa existente
      const existingConversation = await this.conversationRepo
        .findActiveByWhatsappNumber(whatsappNumber);

      if (existingConversation) {
        return existingConversation;
      }

      // Cria nova conversa
      const conversationData: CreateConversationData = {
        whatsapp_number: whatsappNumber,
        user_name: userName
      };

      const newConversation = await this.conversationRepo.create(conversationData);
      console.log(`🆕 Nova conversa criada para ${whatsappNumber}`);
      
      return newConversation;
    } catch (error) {
      console.error('Erro no serviço de conversa:', error);
      throw error;
    }
  }

  /**
   * Gera contexto formatado para AI baseado no histórico
   */
  async getContextForAI(
    whatsappNumber: string, 
    limit: number = 10
  ): Promise<ConversationContext[]> {
    try {
      const messages = await this.messageRepo.findByWhatsappNumber(whatsappNumber, limit);
      
      return messages.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.message_text,
        timestamp: msg.created_at
      }));
    } catch (error) {
      console.error('Erro ao gerar contexto para AI:', error);
      return []; // Retorna array vazio em caso de erro para não quebrar o fluxo
    }
  }

}
