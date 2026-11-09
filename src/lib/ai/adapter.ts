/**
 * AI Provider Factory.
 * Selects Gemini, OpenAI-compatible, Open-Weight (Ollama / vLLM), or Mock provider
 * based on AppStorage configuration and environment variables.
 */

import { IAIProviderAdapter } from './types';
import { MockAIProvider } from './mock';
import { GeminiProvider } from './gemini';
import { OpenAICompatibleProvider } from './openai';
import { OpenWeightProvider, DEFAULT_OPEN_WEIGHT_MODEL, DEFAULT_OLLAMA_BASE_URL } from './openweight';
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

    if (providerType === 'open_weight' || providerType === 'ollama') {
      const model = storedConfig.openWeightModel || process.env.OPEN_WEIGHT_MODEL || DEFAULT_OPEN_WEIGHT_MODEL;
      const baseUrl = storedConfig.openWeightBaseUrl || process.env.OLLAMA_BASE_URL || DEFAULT_OLLAMA_BASE_URL;
      const apiKey = storedConfig.openWeightApiKey || process.env.OPEN_WEIGHT_API_KEY || '';
      return new OpenWeightProvider(model, baseUrl, apiKey);
    }

    // Default to deterministic Mock provider (zero cost, zero keys needed, 100% testable)
    return new MockAIProvider();
  }

  /**
   * Returns true if a live LLM provider (Gemini, OpenAI, or Open-Weight Ollama/vLLM) is configured.
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
    if (providerType === 'open_weight' || providerType === 'ollama') {
      return true;
    }
    return false;
  }
}
