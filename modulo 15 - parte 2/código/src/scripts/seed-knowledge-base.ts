/**
 * Script para popular a base de conhecimento com embeddings
 * 
 * Uso: pnpm run seed:knowledge
 * 
 * Flags:
 * --force : Força re-seed mesmo se já houver dados
 */

import dotenv from 'dotenv';
import embeddingService from '../services/EmbeddingService.js';
import { testConnection } from '../database/config.js';

dotenv.config();

async function main() {
  console.log('🚀 Iniciando script de seed da base de conhecimento...\n');

  // Verificar conexão com banco
  console.log('🔄 Verificando conexão com banco de dados...');
  const connected = await testConnection();
  
  if (!connected) {
    console.error('❌ Não foi possível conectar ao banco de dados');
    process.exit(1);
  }

  // Verificar se deve forçar reseed
  const forceReseed = process.argv.includes('--force');

  try {
    if (forceReseed) {
      console.log('⚠️ Flag --force detectada. Fazendo reseed completo...\n');
      await embeddingService.reseedKnowledgeBase();
    } else {
      await embeddingService.seedKnowledgeBase();
    }

    console.log('\n✅ Script finalizado com sucesso!');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Erro ao executar seed:', error);
    process.exit(1);
  }
}

main();
