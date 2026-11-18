/**
 * Persistent Executive Long-Term Memory Service.
 * 
 * Stores durable facts, preferences, scheduling constraints, frequent flyer details,
 * and relationship context across sessions, and injects them into AI planning prompts.
 */

import { AppStorage } from '@/lib/storage/db';
import { MemoryFact } from '@/types';

export class MemoryService {
  public static rememberFact(
    fact: string,
    category: MemoryFact['category'] = 'general',
    source: string = 'user'
  ): MemoryFact {
    const now = new Date().toISOString();
    const memory: MemoryFact = {
      id: `mem_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      category,
      fact: fact.trim(),
      source,
      createdAt: now,
      updatedAt: now
    };
    AppStorage.saveMemory(memory);
    return memory;
  }

  public static recallFacts(query: string = '', category?: MemoryFact['category']): MemoryFact[] {
    return AppStorage.searchMemories(query, category);
  }

  public static listAllFacts(): MemoryFact[] {
    return AppStorage.listMemories();
  }

  public static forgetFact(id: string): boolean {
    return AppStorage.deleteMemory(id);
  }

  /**
   * Formats stored executive memory facts for injection into the LLM system prompt.
   * When contextQuery is provided, semantically relevant facts are prioritized first.
   */
  public static formatMemoriesForPrompt(limit: number = 15, contextQuery?: string): string {
    const allFacts = this.listAllFacts();
    if (allFacts.length === 0) return 'No stored long-term memory facts.';

    let prioritized = allFacts;
    if (contextQuery && contextQuery.trim()) {
      const relevant = this.recallFacts(contextQuery);
      const relevantIds = new Set(relevant.map(f => f.id));
      prioritized = [
        ...relevant,
        ...allFacts.filter(f => !relevantIds.has(f.id))
      ];
    }

    const facts = prioritized.slice(0, limit);
    return facts.map(f => `- [${f.category.toUpperCase()}] ${f.fact}`).join('\n');
  }

  /**
   * Auto-Learning Memory Extraction (Implicit Fact Mining):
   * Scans natural-language conversation or notes for durable executive preferences,
   * scheduling rules, travel loyalty, and VIP relationships, deduplicating against existing memories.
   */
  public static extractAndLearnFromText(
    text: string,
    source: string = 'auto_learned'
  ): MemoryFact[] {
    if (!text || text.trim().length < 10) return [];
    const lower = text.toLowerCase();

    // Skip explicit tool-invocation phrases already handled by memory_remember_fact
    if (lower.startsWith('remember that') || lower.startsWith('save to memory')) {
      return [];
    }

    const sentences = text
      .split(/(?<=[.!?;\n])\s+/)
      .map(s => s.trim())
      .filter(s => s.length >= 10 && s.length <= 240);

    const existingLower = new Set(this.listAllFacts().map(f => f.fact.toLowerCase()));
    const learned: MemoryFact[] = [];

    const patterns: Array<{
      regex: RegExp;
      category: MemoryFact['category'];
    }> = [
      {
        regex: /\b(?:i\s+(?:always|usually|prefer)\s+(?:fly|stay|book|sit)|frequent\s+flyer|airline\s+preference|hotel\s+preference|aisle\s+seat|window\s+seat)\b/i,
        category: 'travel'
      },
      {
        regex: /\b(?:never\s+(?:book|schedule)\s+(?:meetings?|calls?)|no\s+(?:meetings?|calls?)\s+(?:before|after|on)|protect\s+[\w\s]+\s+for\s+focus)\b/i,
        category: 'scheduling'
      },
      {
        regex: /\b(?:my\s+(?:cfo|cto|coo|lawyer|attorney|board\s+chair|partner|assistant)\s+is|vip\s+contact)\b/i,
        category: 'relationship'
      },
      {
        regex: /\b(?:i\s+(?:prefer|always\s+like|never\s+want)|my\s+favorite\s+[\w\s]+\s+is)\b/i,
        category: 'preference'
      }
    ];

    for (const sentence of sentences) {
      for (const rule of patterns) {
        if (rule.regex.test(sentence)) {
          const cleanFact = sentence.replace(/^[-\s*•]+/, '').trim();
          if (!existingLower.has(cleanFact.toLowerCase())) {
            const saved = this.rememberFact(cleanFact, rule.category, source);
            existingLower.add(cleanFact.toLowerCase());
            learned.push(saved);
          }
          break;
        }
      }
    }

    return learned;
  }
}
