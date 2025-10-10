import { embed } from 'ai';
import { openai } from '@ai-sdk/openai';
import knowledgeRepository from '../repositories/KnowledgeRepository';
import { KnowledgeBase, KnowledgeDataItem, SemanticSearchResult } from '../models/KnowledgeBase';
import fs from 'fs';
import path from 'path';

/**
 * Service para gerenciar embeddings e busca semântica
 */
export class EmbeddingService {
  private readonly embeddingModel = openai.embedding('text-embedding-3-small');

  /**
   * Gera embedding para um texto usando OpenAI
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const { embedding } = await embed({
        model: this.embeddingModel,
        value: text,
      });

      return embedding;
    } catch (error) {
      console.error('Erro ao gerar embedding:', error);
      throw error;
    }
  }

  /**
   * Gera embeddings para múltiplos textos
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      const embeddings: number[][] = [];
      
      for (const text of texts) {
        const embedding = await this.generateEmbedding(text);
        embeddings.push(embedding);
      }

      return embeddings;
    } catch (error) {
      console.error('Erro ao gerar embeddings:', error);
      throw error;
    }
  }

  /**
   * Carrega dados do data.json
   */
  loadDataFromJson(): KnowledgeDataItem[] {
    try {
      const dataPath = path.join(process.cwd(), 'src', 'database', 'data.json');
      const fileContent = fs.readFileSync(dataPath, 'utf-8');
      const data = JSON.parse(fileContent);
      
      console.log(`📚 ${data.length} documentos carregados do data.json`);
      return data;
    } catch (error) {
      console.error('Erro ao carregar data.json:', error);
      throw error;
    }
  }

  /**
   * Processa e salva todos os documentos do data.json com embeddings
   */
  async seedKnowledgeBase(): Promise<void> {
    try {
      // Verificar se já tem dados
      const hasData = await knowledgeRepository.hasData();
      if (hasData) {
        console.log('⚠️ Base de conhecimento já contém dados');
        const count = await knowledgeRepository.count();
        console.log(`📊 Total de documentos: ${count}`);
        return;
      }

      console.log('🚀 Iniciando seed da base de conhecimento...');
      
      // Carregar dados
      const dataItems = this.loadDataFromJson();
      
      // Processar cada documento
      const documents: KnowledgeBase[] = [];
      
      for (let i = 0; i < dataItems.length; i++) {
        const item = dataItems[i];
        
        // Combinar título e conteúdo para gerar embedding mais rico
        const textForEmbedding = `${item.title}\n\n${item.content}`;
        
        console.log(`📝 Gerando embedding ${i + 1}/${dataItems.length}: ${item.title.substring(0, 50)}...`);
        
        const embedding = await this.generateEmbedding(textForEmbedding);
        
        documents.push({
          source: item.source,
          title: item.title,
          content: item.content,
          tags: item.tags,
          last_updated: item.last_updated,
          embedding: embedding
        });

        // Pequeno delay para não sobrecarregar a API
        if (i < dataItems.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      // Inserir todos os documentos no banco
      console.log('💾 Salvando documentos no banco de dados...');
      await knowledgeRepository.insertDocuments(documents);
      
      console.log('✅ Base de conhecimento populada com sucesso!');
    } catch (error) {
      console.error('❌ Erro ao popular base de conhecimento:', error);
      throw error;
    }
  }

  /**
   * Busca conteúdo relevante para uma pergunta do usuário
   */
  async searchRelevantContent(
    query: string,
    limit: number = 3,
    threshold: number = 0.7
  ): Promise<SemanticSearchResult[]> {
    try {
      console.log('🔍 Buscando conteúdo relevante para:', query);
      // Gerar embedding da query
      const queryEmbedding = await this.generateEmbedding(query);

      console.log('🔍 Embedding gerado:', queryEmbedding);
      
      // Buscar documentos similares
      const results = await knowledgeRepository.searchSimilar(
        queryEmbedding,
        limit,
        threshold
      );

      console.log(`🔍 Encontrados ${results.length} documentos relevantes para: "${query.substring(0, 50)}..."`);
      
      return results;
    } catch (error) {
      console.error('Erro ao buscar conteúdo relevante:', error);
      return [];
    }
  }

  /**
   * Formata resultados de busca para incluir no contexto da IA
   */
  formatContextForAI(results: SemanticSearchResult[]): string {
    if (results.length === 0) {
      return '';
    }

    let context = '\n\n**CONHECIMENTO RELEVANTE DA BASE DE DADOS:**\n\n';
    
    results.forEach((result, index) => {
      context += `[Fonte ${index + 1}: ${result.source}]\n`;
      context += `Título: ${result.title}\n`;
      context += `Conteúdo: ${result.content}\n`;
      context += `Tags: ${result.tags.join(', ')}\n`;
      context += `Similaridade: ${(result.similarity * 100).toFixed(1)}%\n\n`;
    });

    return context;
  }

  /**
   * Força re-seed da base (limpa e popula novamente)
   */
  async reseedKnowledgeBase(): Promise<void> {
    try {
      console.log('⚠️ Limpando base de conhecimento existente...');
      await knowledgeRepository.truncate();
      
      await this.seedKnowledgeBase();
    } catch (error) {
      console.error('Erro ao fazer reseed:', error);
      throw error;
    }
  }
}

export default new EmbeddingService();
