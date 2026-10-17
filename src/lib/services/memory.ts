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
   */
  public static formatMemoriesForPrompt(limit: number = 15): string {
    const facts = this.listAllFacts().slice(0, limit);
    if (facts.length === 0) return 'No stored long-term memory facts.';
    return facts.map(f => `- [${f.category.toUpperCase()}] ${f.fact}`).join('\n');
  }
}
