/**
 * AI Provider Factory.
 * Selects Gemini, OpenAI-compatible, or Mock provider based on AppStorage configuration
 * and environment variables.
 */

import { IAIProviderAdapter } from './types';
import { MockAIProvider } from './mock';
import { GeminiProvider } from './gemini';
import { OpenAICompatibleProvider } from './openai';
import { AppStorage } from '@/lib/storage/db';

export class AIProviderFactory {
  public static getProvider(overrideProvider?: string): IAIProviderAdapter {
    const storedConfig = AppStorage.getIntegrationConfig();
    const providerType = overrideProvider || storedConfig.aiProvider || process.env.AI_PROVIDER || 'mock';

    if (providerType === 'gemini') {
      const apiKey = storedConfig.geminiApiKey || process.env.GEMINI_API_KEY;
      if (apiKey) return new GeminiProvider(apiKey);
    }

    if (providerType === 'openai') {
      const apiKey = storedConfig.openaiApiKey || process.env.OPENAI_API_KEY;
      const baseUrl = process.env.OPENAI_BASE_URL;
      const model = process.env.OPENAI_MODEL;
      if (apiKey || baseUrl) return new OpenAICompatibleProvider(apiKey, baseUrl, model);
    }

    // Default to deterministic Mock provider (zero cost, zero keys needed, 100% testable)
    return new MockAIProvider();
  }

  /**
   * Returns true if a live LLM provider (Gemini or OpenAI) is configured with credentials.
   */
  public static isLiveProviderConfigured(): boolean {
    const storedConfig = AppStorage.getIntegrationConfig();
    const providerType = storedConfig.aiProvider || process.env.AI_PROVIDER || 'mock';

    if (providerType === 'gemini') {
      return Boolean(storedConfig.geminiApiKey || process.env.GEMINI_API_KEY);
    }
    if (providerType === 'openai') {
      return Boolean(storedConfig.openaiApiKey || process.env.OPENAI_API_KEY || process.env.OPENAI_BASE_URL);
    }
    return false;
  }
}
