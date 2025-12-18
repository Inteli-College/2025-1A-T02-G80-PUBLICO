import { ConversationRepository, MessageRepository, UserProfileRepository } from '../repositories/index.js';
import type { Message, CreateMessageData } from '../models/index.js';

export class MessageService {
  private conversationRepo: ConversationRepository;
  private messageRepo: MessageRepository;
  private userProfileRepo: UserProfileRepository;

  constructor() {
    this.conversationRepo = new ConversationRepository();
    this.messageRepo = new MessageRepository();
    this.userProfileRepo = new UserProfileRepository();
  }

  /**
   * Salva mensagem do usuário no banco de dados
   */
  async saveUserMessage(
    whatsappNumber: string,
    messageText: string,
    messageType: string = 'text',
    conversationId?: number,
    metadata?: any
  ): Promise<Message> {
    try {
      // Se não temos o ID da conversa, buscar ou criar
      let convId = conversationId;
      if (!convId) {
        const conversationRepo = new ConversationRepository();
        const conversation = await conversationRepo.findActiveByWhatsappNumber(whatsappNumber);
        
        if (!conversation?.id) {
          throw new Error('Conversa não encontrada e ID não fornecido');
        }
        
        convId = conversation.id;
      }

      const profile = await this.userProfileRepo.findByWhatsappNumber(whatsappNumber);

      const messageData: CreateMessageData = {
        conversation_id: convId,
        whatsapp_number: whatsappNumber,
        message_text: messageText,
        message_type: messageType,
        sender: 'user',
        persona_id: profile?.persona_id,
        metadata
      };

      const savedMessage = await this.messageRepo.create(messageData);
      
      // Atualizar timestamp da conversa
      await this.conversationRepo.updateTimestamp(convId);

      console.log(`👤 Mensagem do usuário salva: ${whatsappNumber}`);
      return savedMessage;
    } catch (error) {
      console.error('Erro ao salvar mensagem do usuário:', error);
      throw error;
    }
  }

  /**
   * Salva mensagem do bot no banco de dados
   */
  async saveBotMessage(
    whatsappNumber: string,
    messageText: string,
    aiModel: string = 'gpt-4o-mini',
    hasAudio: boolean = false,
    voiceId?: string,
    tokensUsed?: number,
    conversationId?: number,
    metadata?: any
  ): Promise<Message> {
    try {
      // Se não temos o ID da conversa, buscar
      let convId = conversationId;
      if (!convId) {
        const conversation = await this.conversationRepo.findActiveByWhatsappNumber(whatsappNumber);
        
        if (!conversation?.id) {
          throw new Error('Conversa não encontrada e ID não fornecido');
        }
        
        convId = conversation.id;
      }

      const profile = await this.userProfileRepo.findByWhatsappNumber(whatsappNumber);

      const messageData: CreateMessageData = {
        conversation_id: convId,
        whatsapp_number: whatsappNumber,
        message_text: messageText,
        message_type: hasAudio ? 'audio' : 'text',
        sender: 'bot',
        ai_model: aiModel,
        tokens_used: tokensUsed,
        has_audio: hasAudio,
        voice_id: voiceId,
        persona_id: profile?.persona_id,
        metadata
      };

      const savedMessage = await this.messageRepo.create(messageData);
      
      // Atualizar timestamp da conversa
      await this.conversationRepo.updateTimestamp(convId);

      console.log(`🤖 Mensagem do bot salva: ${whatsappNumber} (${aiModel})`);
      return savedMessage;
    } catch (error) {
      console.error('Erro ao salvar mensagem do bot:', error);
      throw error;
    }
  }

}
