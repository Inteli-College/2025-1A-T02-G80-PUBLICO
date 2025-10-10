import { sql } from '../database/config';
import type { Message, CreateMessageData } from '../models';

export class MessageRepository {
  /**
   * Salva uma nova mensagem no banco
   */
  async create(data: CreateMessageData): Promise<Message> {
    try {
      const result = await sql`
        INSERT INTO messages (
          conversation_id, whatsapp_number, message_text, message_type,
          sender, ai_model, tokens_used, has_audio, voice_id, created_at, metadata
        )
        VALUES (
          ${data.conversation_id},
          ${data.whatsapp_number},
          ${data.message_text},
          ${data.message_type || 'text'},
          ${data.sender},
          ${data.ai_model || null},
          ${data.tokens_used || null},
          ${data.has_audio || false},
          ${data.voice_id || null},
          NOW(),
          ${JSON.stringify(data.metadata || null)}
        )
        RETURNING *
      `;
      
      return result[0] as Message;
    } catch (error) {
      console.error('Erro ao salvar mensagem:', error);
      throw error;
    }
  }

  /**
   * Busca mensagens de uma conversa por número do WhatsApp
   */
  async findByWhatsappNumber(whatsappNumber: string, limit: number = 20): Promise<Message[]> {
    try {
      const result = await sql`
        SELECT m.* 
        FROM messages m
        INNER JOIN conversations c ON m.conversation_id = c.id
        WHERE c.whatsapp_number = ${whatsappNumber} AND c.is_active = true
        ORDER BY m.created_at DESC
        LIMIT ${limit}
      `;
      
      return (result as Message[]).reverse(); // Retorna em ordem cronológica
    } catch (error) {
      console.error('Erro ao buscar mensagens por WhatsApp:', error);
      throw error;
    }
  }
}
