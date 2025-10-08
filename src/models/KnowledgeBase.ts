/**
 * Interface para documento da base de conhecimento (RAG)
 */
export interface KnowledgeBase {
  id?: number;
  source: string;
  title: string;
  content: string;
  tags: string[];
  last_updated: string;
  embedding?: number[];
  created_at?: Date;
  updated_at?: Date;
}

/**
 * Interface para dados do data.json
 */
export interface KnowledgeDataItem {
  source: string;
  title: string;
  content: string;
  tags: string[];
  last_updated: string;
}

/**
 * Interface para resultado de busca semântica
 */
export interface SemanticSearchResult {
  id: number;
  source: string;
  title: string;
  content: string;
  tags: string[];
  last_updated: string;
  similarity: number; // Similaridade cosine (0-1, maior é melhor)
}
