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
    // Habilitar extensão pgvector
    await sql`CREATE EXTENSION IF NOT EXISTS vector`;
    console.log('✅ Extensão pgvector habilitada');

    // Criar tabela de personas
    await sql`
      CREATE TABLE IF NOT EXISTS personas (
        id SERIAL PRIMARY KEY,
        slug VARCHAR(50) UNIQUE NOT NULL,
        display_name VARCHAR(100) NOT NULL,
        description TEXT,
        system_prompt TEXT NOT NULL,
        style_guidelines JSONB,
        voice_id VARCHAR(100),
        default_disclaimer TEXT,
        rag_filters JSONB,
        tools JSONB,
        matching_rules JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

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
        metadata JSONB,
        persona_id INTEGER REFERENCES personas(id)
      );
    `;

    // Criar tabela de perfis de usuário
    await sql`
      CREATE TABLE IF NOT EXISTS user_profiles (
        user_id VARCHAR(50) PRIMARY KEY,
        whatsapp_number VARCHAR(50) UNIQUE NOT NULL,
        profile_step INTEGER DEFAULT 0,
        age INTEGER,
        risk_tolerance VARCHAR(20),
        goals JSONB,
        income_range VARCHAR(50),
        experience_level VARCHAR(50),
        persona_id INTEGER REFERENCES personas(id),
        persona_preferences JSONB,
        persona_assigned_at TIMESTAMP WITH TIME ZONE,
        communication_style VARCHAR(50),
        content_format_preference VARCHAR(50),
        engagement_frequency VARCHAR(50),
        learning_style VARCHAR(50),
        interest_tags JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        completed_at TIMESTAMP WITH TIME ZONE
      );
    `;

    // Garantir colunas adicionais (para bases existentes)
    await sql`ALTER TABLE messages ADD COLUMN IF NOT EXISTS persona_id INTEGER REFERENCES personas(id);`;
    await sql`ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS persona_id INTEGER REFERENCES personas(id);`;
    await sql`ALTER TABLE personas ADD COLUMN IF NOT EXISTS tools JSONB;`;
    await sql`ALTER TABLE personas ADD COLUMN IF NOT EXISTS matching_rules JSONB;`;
    await sql`ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS persona_preferences JSONB;`;
    await sql`ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS persona_assigned_at TIMESTAMP WITH TIME ZONE;`;
    await sql`ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS communication_style VARCHAR(50);`;
    await sql`ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS content_format_preference VARCHAR(50);`;
    await sql`ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS engagement_frequency VARCHAR(50);`;
    await sql`ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS learning_style VARCHAR(50);`;
    await sql`ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS interest_tags JSONB;`;

    // Criar tabela de histórico de personas
    await sql`
      CREATE TABLE IF NOT EXISTS user_persona_history (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(50) NOT NULL,
        persona_id INTEGER REFERENCES personas(id),
        assigned_by VARCHAR(100),
        reason TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    // Criar tabela de knowledge base com embeddings (RAG)
    await sql`
      CREATE TABLE IF NOT EXISTS knowledge_base (
        id SERIAL PRIMARY KEY,
        source VARCHAR(255) NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        tags JSONB,
        last_updated DATE,
        embedding VECTOR(1536),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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

    await sql`
      CREATE INDEX IF NOT EXISTS idx_user_profiles_whatsapp 
      ON user_profiles(whatsapp_number);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_user_profiles_persona 
      ON user_profiles(persona_id);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_user_profiles_communication_style
      ON user_profiles(communication_style);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_user_profiles_interest_tags
      ON user_profiles USING gin (interest_tags);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_user_persona_history_user 
      ON user_persona_history(user_id, created_at DESC);
    `;

    // Criar índice HNSW para busca vetorial eficiente (cosine distance)
    await sql`
      CREATE INDEX IF NOT EXISTS idx_knowledge_base_embedding 
      ON knowledge_base USING hnsw (embedding vector_cosine_ops);
    `;

    console.log('✅ Tabelas do banco de dados inicializadas');
  } catch (error) {
    console.error('❌ Erro ao inicializar tabelas:', error);
    throw error;
  }
}

export { sql };
