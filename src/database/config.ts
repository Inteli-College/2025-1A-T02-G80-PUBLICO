import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

// Configuração da conexão com Neon Database
const sql = neon(process.env.DATABASE_URL!);

// Função para testar a conexão
export async function testConnection(): Promise<boolean> {
  try {
    await sql`SELECT NOW()`;
    console.log('✅ Conexão com Neon Database estabelecida');
    return true;
  } catch (error) {
    console.error('❌ Erro ao conectar com Neon Database:', error);
    return false;
  }
}

// Função para inicializar as tabelas
export async function initializeTables(): Promise<void> {
  try {
    // Criar tabela de conversas
    await sql`
      CREATE TABLE IF NOT EXISTS conversations (
        id SERIAL PRIMARY KEY,
        whatsapp_number VARCHAR(50) UNIQUE NOT NULL,
        user_name VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        is_active BOOLEAN DEFAULT true
      );
    `;

    // Criar tabela de mensagens
    await sql`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        conversation_id INTEGER REFERENCES conversations(id),
        whatsapp_number VARCHAR(50) NOT NULL,
        message_text TEXT NOT NULL,
        message_type VARCHAR(20) DEFAULT 'text',
        sender VARCHAR(10) NOT NULL, -- 'user' ou 'bot'
        ai_model VARCHAR(50),
        tokens_used INTEGER,
        has_audio BOOLEAN DEFAULT false,
        voice_id VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        metadata JSONB
      );
    `;

    // Criar índices para performance
    await sql`
      CREATE INDEX IF NOT EXISTS idx_conversations_whatsapp 
      ON conversations(whatsapp_number);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_messages_conversation 
      ON messages(conversation_id);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_messages_created_at 
      ON messages(created_at);
    `;

    console.log('✅ Tabelas do banco de dados inicializadas');
  } catch (error) {
    console.error('❌ Erro ao inicializar tabelas:', error);
    throw error;
  }
}

export { sql };
