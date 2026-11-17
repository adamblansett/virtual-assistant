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
}
