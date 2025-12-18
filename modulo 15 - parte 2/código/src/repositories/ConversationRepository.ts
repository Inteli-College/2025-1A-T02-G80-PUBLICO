import { sql } from '../database/config.js';
import type { Conversation, CreateConversationData } from '../models/index.js';

export class ConversationRepository {
  /**
   * Busca conversa ativa por número do WhatsApp
   */
  async findActiveByWhatsappNumber(whatsappNumber: string): Promise<Conversation | null> {
    try {
      const result = await sql`
        SELECT * FROM conversations 
        WHERE whatsapp_number = ${whatsappNumber} AND is_active = true
      `;
      
      return result.length > 0 ? (result[0] as Conversation) : null;
    } catch (error) {
      console.error('Erro ao buscar conversa por WhatsApp:', error);
      throw error;
    }
  }

  /**
   * Cria uma nova conversa
   */
  async create(data: CreateConversationData): Promise<Conversation> {
    try {
      const result = await sql`
        INSERT INTO conversations (whatsapp_number, user_name, created_at, updated_at)
        VALUES (${data.whatsapp_number}, ${data.user_name || null}, NOW(), NOW())
        RETURNING *
      `;
      
      return result[0] as Conversation;
    } catch (error) {
      console.error('Erro ao criar conversa:', error);
      throw error;
    }
  }

  /**
   * Atualiza o timestamp da conversa
   */
  async updateTimestamp(conversationId: number): Promise<void> {
    try {
      await sql`
        UPDATE conversations SET updated_at = NOW() WHERE id = ${conversationId}
      `;
    } catch (error) {
      console.error('Erro ao atualizar timestamp da conversa:', error);
      throw error;
    }
  }
}
