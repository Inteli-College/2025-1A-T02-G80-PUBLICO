import { sql } from './config';

// Interface para mensagens
export interface Message {
  id?: number;
  conversation_id: number;
  whatsapp_number: string;
  message_text: string;
  message_type?: string;
  sender: 'user' | 'bot';
  ai_model?: string;
  tokens_used?: number;
  has_audio?: boolean;
  voice_id?: string;
  created_at?: Date;
  metadata?: any;
}

// Interface para conversas
export interface Conversation {
  id?: number;
  whatsapp_number: string;
  user_name?: string;
  created_at?: Date;
  updated_at?: Date;
  is_active?: boolean;
}

// Interface para histórico de conversa formatado para AI
export interface ConversationContext {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

class MessageService {
  /**
   * Busca ou cria uma conversa para um número do WhatsApp
   */
  async getOrCreateConversation(whatsappNumber: string, userName?: string): Promise<Conversation> {
    try {
      // Primeiro tenta buscar conversa existente
      const existingConversation = await sql`
        SELECT * FROM conversations 
        WHERE whatsapp_number = ${whatsappNumber} AND is_active = true
      `;

      if (existingConversation.length > 0) {
        return existingConversation[0] as Conversation;
      }

      // Se não existe, cria nova conversa
      const newConversation = await sql`
        INSERT INTO conversations (whatsapp_number, user_name, created_at, updated_at)
        VALUES (${whatsappNumber}, ${userName || null}, NOW(), NOW())
        RETURNING *
      `;

      console.log(`🆕 Nova conversa criada para ${whatsappNumber}`);
      return newConversation[0] as Conversation;
    } catch (error) {
      console.error('Erro ao buscar/criar conversa:', error);
      throw error;
    }
  }

  /**
   * Salva uma mensagem no banco de dados
   */
  async saveMessage(message: Message): Promise<Message> {
    try {
      const savedMessage = await sql`
        INSERT INTO messages (
          conversation_id, whatsapp_number, message_text, message_type,
          sender, ai_model, tokens_used, has_audio, voice_id, created_at, metadata
        )
        VALUES (
          ${message.conversation_id},
          ${message.whatsapp_number},
          ${message.message_text},
          ${message.message_type || 'text'},
          ${message.sender},
          ${message.ai_model || null},
          ${message.tokens_used || null},
          ${message.has_audio || false},
          ${message.voice_id || null},
          NOW(),
          ${JSON.stringify(message.metadata || null)}
        )
        RETURNING *
      `;

      // Atualizar timestamp da conversa
      await sql`
        UPDATE conversations SET updated_at = NOW() WHERE id = ${message.conversation_id}
      `;

      return savedMessage[0] as Message;
    } catch (error) {
      console.error('Erro ao salvar mensagem:', error);
      throw error;
    }
  }

  /**
   * Busca histórico de mensagens de uma conversa
   */
  async getConversationHistory(
    whatsappNumber: string, 
    limit: number = 20
  ): Promise<Message[]> {
    try {
      const messages = await sql`
        SELECT m.* 
        FROM messages m
        INNER JOIN conversations c ON m.conversation_id = c.id
        WHERE c.whatsapp_number = ${whatsappNumber} AND c.is_active = true
        ORDER BY m.created_at DESC
        LIMIT ${limit}
      `;

      return (messages as Message[]).reverse(); // Retorna em ordem cronológica
    } catch (error) {
      console.error('Erro ao buscar histórico:', error);
      throw error;
    }
  }

  /**
   * Formata histórico para contexto da AI
   */
  async getContextForAI(whatsappNumber: string, limit: number = 10): Promise<ConversationContext[]> {
    const messages = await this.getConversationHistory(whatsappNumber, limit);
    
    return messages.map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.message_text,
      timestamp: msg.created_at
    }));
  }
}

export const messageService = new MessageService();
