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

export interface KnowledgeDataItem {
  source: string;
  title: string;
  content: string;
  tags: string[];
  last_updated: string;
}

export interface SemanticSearchResult {
  id: number;
  source: string;
  title: string;
  content: string;
  tags: string[];
  last_updated: string;
  similarity: number; // Similaridade cosine (0-1, maior é melhor)
}
