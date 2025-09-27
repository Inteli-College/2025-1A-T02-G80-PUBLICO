export interface Conversation {
  id?: number;
  whatsapp_number: string;
  user_name?: string;
  created_at?: Date;
  updated_at?: Date;
  is_active?: boolean;
}

export interface CreateConversationData {
  whatsapp_number: string;
  user_name?: string;
}

export interface UpdateConversationData {
  user_name?: string;
  is_active?: boolean;
  updated_at?: Date;
}
