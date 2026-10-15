/**
 * AI Provider Factory.
 * Selects Gemini, OpenAI-compatible, or Mock provider based on configuration.
 */

import { IAIProviderAdapter } from './types';
import { MockAIProvider } from './mock';
import { GeminiProvider } from './gemini';
import { OpenAICompatibleProvider } from './openai';

export class AIProviderFactory {
  public static getProvider(overrideProvider?: string): IAIProviderAdapter {
    const providerType = overrideProvider || process.env.AI_PROVIDER || 'mock';

    if (providerType === 'gemini') {
      const apiKey = process.env.GEMINI_API_KEY;
      if (apiKey) return new GeminiProvider(apiKey);
    }

    if (providerType === 'openai') {
      const apiKey = process.env.OPENAI_API_KEY;
      const baseUrl = process.env.OPENAI_BASE_URL;
      const model = process.env.OPENAI_MODEL;
      if (apiKey || baseUrl) return new OpenAICompatibleProvider(apiKey, baseUrl, model);
    }

    // Default to deterministic Mock provider (zero cost, zero keys needed, 100% testable)
    return new MockAIProvider();
  }
}
