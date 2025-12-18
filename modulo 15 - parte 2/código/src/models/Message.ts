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
  persona_id?: number;
  created_at?: Date;
  metadata?: any;
}

export interface CreateMessageData {
  conversation_id: number;
  whatsapp_number: string;
  message_text: string;
  message_type?: string;
  sender: 'user' | 'bot';
  ai_model?: string;
  tokens_used?: number;
  has_audio?: boolean;
  voice_id?: string;
  persona_id?: number;
  metadata?: any;
}

export interface ConversationContext {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

export interface ConversationStats {
  whatsappNumber: string;
  totalMessages: number;
  userMessages: number;
  botMessages: number;
  audioMessages: number;
  customModelMessages: number;
  openaiMessages: number;
  firstMessage?: Date;
  lastMessage?: Date;
}

export interface MessagePreview {
  sender: 'user' | 'bot';
  text: string;
  type?: string;
  model?: string;
  hasAudio: boolean;
  createdAt?: Date;
}
