import { sql } from '../database/config';
import { KnowledgeBase, SemanticSearchResult } from '../models/KnowledgeBase';

/**
 * Repository para gerenciar a base de conhecimento com embeddings
 */
export class KnowledgeRepository {
  /**
   * Insere um documento com embedding no banco
   */
  async insertDocument(doc: KnowledgeBase): Promise<number> {
    try {
      const result = await sql`
        INSERT INTO knowledge_base (source, title, content, tags, last_updated, embedding)
        VALUES (
          ${doc.source},
          ${doc.title},
          ${doc.content},
          ${JSON.stringify(doc.tags)}::jsonb,
          ${doc.last_updated},
          ${doc.embedding ? JSON.stringify(doc.embedding) : null}
        )
        RETURNING id
      `;

      return result[0].id;
    } catch (error) {
      console.error('Erro ao inserir documento:', error);
      throw error;
    }
  }

  /**
   * Insere múltiplos documentos em lote
   */
  async insertDocuments(docs: KnowledgeBase[]): Promise<void> {
    try {
      for (const doc of docs) {
        await this.insertDocument(doc);
      }
      console.log(`✅ ${docs.length} documentos inseridos com sucesso`);
    } catch (error) {
      console.error('Erro ao inserir documentos:', error);
      throw error;
    }
  }

  /**
   * Busca documentos similares usando busca vetorial (cosine similarity)
   * @param queryEmbedding - Embedding da query
   * @param limit - Número máximo de resultados (padrão: 5)
   * @param threshold - Threshold mínimo de similaridade (0-1, padrão: 0.5)
   */
  async searchSimilar(
    queryEmbedding: number[],
    limit: number = 5,
    threshold: number = 0.5
  ): Promise<SemanticSearchResult[]> {
    try {
      const embeddingStr = JSON.stringify(queryEmbedding);
      
      // Busca por cosine similarity (1 - cosine distance)
      // Quanto maior o valor, mais similar (0-1)
      const results = await sql`
        SELECT 
          id,
          source,
          title,
          content,
          tags,
          last_updated,
          1 - (embedding <=> ${embeddingStr}::vector) AS similarity
        FROM knowledge_base
        WHERE embedding IS NOT NULL
          AND (1 - (embedding <=> ${embeddingStr}::vector)) >= ${threshold}
        ORDER BY embedding <=> ${embeddingStr}::vector
        LIMIT ${limit}
      `;

      return results.map(row => ({
        id: row.id,
        source: row.source,
        title: row.title,
        content: row.content,
        tags: Array.isArray(row.tags) ? row.tags : JSON.parse(row.tags || '[]'),
        last_updated: row.last_updated,
        similarity: parseFloat(row.similarity)
      }));
    } catch (error) {
      console.error('Erro ao buscar documentos similares:', error);
      throw error;
    }
  }

  /**
   * Conta total de documentos na base
   */
  async count(): Promise<number> {
    try {
      const result = await sql`
        SELECT COUNT(*) as count FROM knowledge_base
      `;
      return parseInt(result[0].count);
    } catch (error) {
      console.error('Erro ao contar documentos:', error);
      return 0;
    }
  }

  /**
   * Limpa toda a base de conhecimento (usar com cuidado!)
   */
  async truncate(): Promise<void> {
    try {
      await sql`TRUNCATE TABLE knowledge_base RESTART IDENTITY CASCADE`;
      console.log('⚠️ Base de conhecimento limpa');
    } catch (error) {
      console.error('Erro ao limpar base:', error);
      throw error;
    }
  }

  /**
   * Verifica se a base já tem dados
   */
  async hasData(): Promise<boolean> {
    const count = await this.count();
    return count > 0;
  }
}

export default new KnowledgeRepository();
