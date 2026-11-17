/**
 * Hybrid Semantic Search & Vector Embedding Engine (RAG).
 *
 * Combines:
 * 1. Exact & phrase substring boost
 * 2. BM25 lexical scoring with morphological stemming & executive domain synonym expansion
 * 3. Live vector embeddings (Ollama / Gemini / OpenAI) + deterministic local vector projection fallback
 *
 * Used by MemoryService and CloudDriveSyncService for semantic recall and document RAG.
 */

import { AppStorage } from '@/lib/storage/db';

const STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'do', 'does', 'for', 'from',
  'has', 'have', 'how', 'i', 'in', 'is', 'it', 'like', 'me', 'my', 'of', 'on',
  'or', 'our', 'please', 'show', 'tell', 'that', 'the', 'their', 'them', 'they',
  'this', 'to', 'us', 'was', 'we', 'what', 'when', 'where', 'which', 'who', 'will',
  'with', 'would', 'you', 'your', 'find', 'search', 'get', 'about'
]);

const DOMAIN_SYNONYMS: Record<string, string[]> = {
  flight: ['airplane', 'airline', 'plane', 'aviation', 'fly', 'flying', 'seat', 'delta', 'united'],
  airplane: ['flight', 'airline', 'plane', 'seat'],
  airline: ['flight', 'airplane', 'carrier', 'flyer'],
  seat: ['aisle', 'window', 'bulkhead', 'flight'],
  aisle: ['seat', 'flight', 'airplane'],
  agreement: ['contract', 'msa', 'nda', 'legal', 'clause', 'terms'],
  contract: ['agreement', 'msa', 'nda', 'legal', 'renewal'],
  msa: ['master', 'services', 'agreement', 'contract'],
  nda: ['confidentiality', 'non-disclosure', 'agreement', 'legal'],
  presentation: ['deck', 'slides', 'board', 'keynote', 'pptx'],
  deck: ['presentation', 'slides', 'board', 'quarterly'],
  compliance: ['soc2', 'soc', 'security', 'audit', 'iso'],
  security: ['soc2', 'compliance', 'audit', 'encryption'],
  budget: ['finance', 'financial', 'expense', 'forecast', 'revenue', 'arr', 'burn'],
  finance: ['budget', 'expense', 'receipt', 'revenue', 'arr', 'pricing'],
  schedule: ['calendar', 'meeting', 'slot', 'time', 'morning', 'afternoon'],
  meeting: ['schedule', 'calendar', 'sync', 'call', 'briefing']
};

export interface RankedItem<T> {
  item: T;
  score: number;
}

export class SemanticSearchEngine {
  /**
   * Normalizes and stems a single word token.
   */
  public static stemToken(word: string): string {
    const w = word.toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (w.length <= 3) return w;
    if (w.endsWith('ies') && w.length > 4) return w.slice(0, -3) + 'y';
    if (w.endsWith('ing') && w.length > 5) return w.slice(0, -3);
    if (w.endsWith('ed') && w.length > 4) return w.slice(0, -2);
    if (w.endsWith('es') && w.length > 4) return w.slice(0, -2);
    if (w.endsWith('s') && !w.endsWith('ss') && w.length > 3) return w.slice(0, -1);
    return w;
  }

  /**
   * Tokenizes text into normalized, stemmed content tokens with optional synonym expansion.
   */
  public static tokenize(text: string, expandSynonyms: boolean = false): string[] {
    const rawWords = text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, ' ')
      .split(/\s+/)
      .filter(Boolean);

    const tokens: string[] = [];
    for (const raw of rawWords) {
      if (STOPWORDS.has(raw)) continue;
      const stemmed = this.stemToken(raw);
      if (!stemmed || STOPWORDS.has(stemmed)) continue;
      tokens.push(stemmed);

      if (expandSynonyms) {
        const syns = DOMAIN_SYNONYMS[raw] || DOMAIN_SYNONYMS[stemmed];
        if (syns) {
          for (const syn of syns) {
            tokens.push(this.stemToken(syn));
          }
        }
      }
    }

    return tokens;
  }

  /**
   * Computes a deterministic 64-dimensional normalized embedding vector using feature hashing
   * over word stems, synonyms, and character trigrams.
   */
  public static computeDeterministicVector(text: string, dims: number = 64): number[] {
    const vec = new Array<number>(dims).fill(0);
    const tokens = this.tokenize(text, true);

    for (const token of tokens) {
      let hash = 2166136261;
      for (let i = 0; i < token.length; i++) {
        hash ^= token.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
      }
      const idx = Math.abs(hash) % dims;
      const sign = (hash & 1) === 0 ? 1 : -1;
      vec[idx] += sign * 1.5;

      // Character trigrams for subword similarity
      if (token.length >= 3) {
        for (let i = 0; i <= token.length - 3; i++) {
          const tri = token.slice(i, i + 3);
          let thash = 5381;
          for (let j = 0; j < tri.length; j++) {
            thash = ((thash << 5) + thash) ^ tri.charCodeAt(j);
          }
          const tidx = Math.abs(thash) % dims;
          vec[tidx] += 0.35;
        }
      }
    }

    return this.normalizeVector(vec);
  }

  public static normalizeVector(vec: number[]): number[] {
    let normSq = 0;
    for (const v of vec) normSq += v * v;
    if (normSq === 0) return vec;
    const norm = Math.sqrt(normSq);
    return vec.map(v => v / norm);
  }

  public static cosineSimilarity(vecA: number[], vecB: number[]): number {
    const len = Math.min(vecA.length, vecB.length);
    if (len === 0) return 0;
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < len; i++) {
      dot += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Generates a vector embedding via the active provider (Ollama, Gemini, or OpenAI),
   * falling back to deterministic feature-hash embeddings when offline.
   */
  public static async generateEmbedding(text: string): Promise<number[]> {
    try {
      const config = AppStorage.getIntegrationConfig();
      if (config.aiProvider === 'open_weight' || config.aiProvider === 'ollama') {
        const rawUrl = config.openWeightBaseUrl || process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1';
        const daemonRoot = rawUrl.replace(/\/+$/, '').replace(/\/v1$/, '');
        const model = process.env.OLLAMA_EMBED_MODEL || 'nomic-embed-text';
        const res = await fetch(`${daemonRoot}/api/embeddings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model, prompt: text }),
          signal: AbortSignal.timeout(2500)
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.embedding) && data.embedding.length > 0) {
            return this.normalizeVector(data.embedding);
          }
        }
      } else if (config.aiProvider === 'openai') {
        const apiKey = config.openaiApiKey || process.env.OPENAI_API_KEY;
        if (apiKey) {
          const res = await fetch('https://api.openai.com/v1/embeddings', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`
            },
            body: JSON.stringify({
              model: 'text-embedding-3-small',
              input: text
            }),
            signal: AbortSignal.timeout(3500)
          });
          if (res.ok) {
            const data = await res.json();
            const emb = data.data?.[0]?.embedding;
            if (Array.isArray(emb) && emb.length > 0) {
              return this.normalizeVector(emb);
            }
          }
        }
      } else if (config.aiProvider === 'gemini') {
        const apiKey = config.geminiApiKey || process.env.GEMINI_API_KEY;
        if (apiKey) {
          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                content: { parts: [{ text }] }
              }),
              signal: AbortSignal.timeout(3500)
            }
          );
          if (res.ok) {
            const data = await res.json();
            const emb = data.embedding?.values;
            if (Array.isArray(emb) && emb.length > 0) {
              return this.normalizeVector(emb);
            }
          }
        }
      }
    } catch {
      // Fallback to deterministic local embedding vector
    }

    return this.computeDeterministicVector(text);
  }

  /**
   * Ranks a collection of items against a natural-language query using hybrid
   * Exact Phrase Boost + BM25 Lexical Overlap + Vector Cosine Similarity.
   */
  public static rankItems<T>(
    query: string,
    items: T[],
    getText: (item: T) => string,
    minScore: number = 0.12
  ): RankedItem<T>[] {
    const cleanQuery = query.trim().toLowerCase();
    if (!cleanQuery) {
      return items.map(item => ({ item, score: 1 }));
    }

    const queryTokens = this.tokenize(cleanQuery, false);
    const expandedQueryTokens = new Set(this.tokenize(cleanQuery, true));
    const queryVec = this.computeDeterministicVector(cleanQuery);

    // Precompute document token lists and document frequencies for BM25
    const docData = items.map(item => {
      const rawText = getText(item);
      const lowerText = rawText.toLowerCase();
      const tokens = this.tokenize(rawText, false);
      const tokenFreq = new Map<string, number>();
      for (const t of tokens) {
        tokenFreq.set(t, (tokenFreq.get(t) || 0) + 1);
      }
      const vec = this.computeDeterministicVector(rawText);
      return { item, lowerText, tokens, tokenFreq, vec };
    });

    const N = Math.max(1, docData.length);
    const avgDocLen =
      docData.reduce((sum, d) => sum + d.tokens.length, 0) / N || 1;

    const docFreq = new Map<string, number>();
    for (const qToken of expandedQueryTokens) {
      let df = 0;
      for (const d of docData) {
        if (d.tokenFreq.has(qToken)) df++;
      }
      docFreq.set(qToken, df);
    }

    const k1 = 1.5;
    const b = 0.75;
    const ranked: RankedItem<T>[] = [];

    for (const d of docData) {
      let score = 0;

      // 1. Exact full query substring match boost
      if (d.lowerText.includes(cleanQuery)) {
        score += 10.0;
      }

      // 2. BM25 score over direct query tokens and synonym-expanded tokens
      for (const qToken of expandedQueryTokens) {
        const tf = d.tokenFreq.get(qToken) || 0;
        const isDirectToken = queryTokens.includes(qToken);
        const weight = isDirectToken ? 1.0 : 0.55;

        if (tf > 0) {
          const df = docFreq.get(qToken) || 1;
          const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5));
          const tfNorm =
            (tf * (k1 + 1)) /
            (tf + k1 * (1 - b + b * (d.tokens.length / avgDocLen)));
          score += weight * idf * tfNorm;
        } else if (isDirectToken && qToken.length >= 4 && d.lowerText.includes(qToken)) {
          // Partial prefix/infix match in raw text
          score += 0.45;
        }
      }

      // 3. Vector cosine similarity component
      const cos = this.cosineSimilarity(queryVec, d.vec);
      if (cos > 0.15) {
        score += cos * 0.6;
      }

      if (score >= minScore) {
        ranked.push({ item: d.item, score });
      }
    }

    return ranked.sort((a, b) => b.score - a.score);
  }
}
