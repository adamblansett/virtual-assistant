/**
 * Open-Weight Model Adapter (Ollama, vLLM, llama.cpp, OpenRouter, Groq).
 *
 * Provides first-class support for local and self-hosted open-weight models
 * (Qwen 2.5 / Qwen 3, Llama 3.1 / 3.3, Mistral Small, Gemma 3) via the
 * OpenAI-compatible `/v1/chat/completions` endpoint, plus a resilient fallback
 * JSON tool-call extractor for open-weight models that emit tool invocations
 * inside markdown code blocks or `<tool_call>` tags.
 */

import { IAIProviderAdapter, AIMessage, AIToolDeclaration, AIResponse, AIToolCall } from './types';

export interface OpenWeightModelPreset {
  id: string;
  name: string;
  family: 'Qwen' | 'Llama' | 'Mistral' | 'Gemma';
  parameterCount: string;
  vramRequired: string;
  recommended: boolean;
  nativeToolCalling: boolean;
  multimodalVision: boolean;
  strengths: string;
  pullCommand: string;
}

export const DEFAULT_OPEN_WEIGHT_MODEL = 'qwen2.5:14b';
export const DEFAULT_OLLAMA_BASE_URL = 'http://localhost:11434/v1';

export const OPEN_WEIGHT_PRESETS: OpenWeightModelPreset[] = [
  {
    id: 'qwen2.5:14b',
    name: 'Qwen 2.5 14B Instruct (Recommended)',
    family: 'Qwen',
    parameterCount: '14B',
    vramRequired: '~9.0 GB VRAM / RAM (Q4_K_M)',
    recommended: true,
    nativeToolCalling: true,
    multimodalVision: false,
    strengths: 'Best-in-class local function calling across 36+ tools and multi-step planning.',
    pullCommand: 'ollama pull qwen2.5:14b'
  },
  {
    id: 'qwen2.5:7b',
    name: 'Qwen 2.5 7B Instruct (Fast / 8GB GPU)',
    family: 'Qwen',
    parameterCount: '7B',
    vramRequired: '~4.7 GB VRAM / RAM (Q4_K_M)',
    recommended: true,
    nativeToolCalling: true,
    multimodalVision: false,
    strengths: 'Fastest reliable tool-calling open-weight model for laptops and 8GB GPUs.',
    pullCommand: 'ollama pull qwen2.5:7b'
  },
  {
    id: 'qwen3:8b',
    name: 'Qwen 3 8B (Hybrid Thinking + Tool Calling)',
    family: 'Qwen',
    parameterCount: '8B',
    vramRequired: '~5.2 GB VRAM / RAM (Q4_K_M)',
    recommended: false,
    nativeToolCalling: true,
    multimodalVision: false,
    strengths: 'Combines chain-of-thought reasoning with structured JSON schema adherence.',
    pullCommand: 'ollama pull qwen3:8b'
  },
  {
    id: 'llama3.1:8b',
    name: 'Meta Llama 3.1 8B Instruct',
    family: 'Llama',
    parameterCount: '8B',
    vramRequired: '~4.9 GB VRAM / RAM (Q4_K_M)',
    recommended: false,
    nativeToolCalling: true,
    multimodalVision: false,
    strengths: 'Broad ecosystem compatibility and low-latency conversational scheduling.',
    pullCommand: 'ollama pull llama3.1:8b'
  },
  {
    id: 'llama3.3:70b',
    name: 'Meta Llama 3.3 70B Instruct',
    family: 'Llama',
    parameterCount: '70B',
    vramRequired: '~42 GB VRAM / Unified Memory (or Hosted API)',
    recommended: false,
    nativeToolCalling: true,
    multimodalVision: false,
    strengths: 'Frontier-level accuracy for Mac Studio, multi-GPU workstations, or Groq/OpenRouter.',
    pullCommand: 'ollama pull llama3.3:70b'
  },
  {
    id: 'mistral-small:24b',
    name: 'Mistral Small 3 24B Instruct',
    family: 'Mistral',
    parameterCount: '24B',
    vramRequired: '~14 GB VRAM / RAM (Q4_K_M)',
    recommended: false,
    nativeToolCalling: true,
    multimodalVision: false,
    strengths: 'High-precision structured JSON extraction and executive email ghostwriting.',
    pullCommand: 'ollama pull mistral-small:24b'
  },
  {
    id: 'gemma3:12b',
    name: 'Google Gemma 3 12B IT',
    family: 'Gemma',
    parameterCount: '12B',
    vramRequired: '~8.1 GB VRAM / RAM (Q4_K_M)',
    recommended: false,
    nativeToolCalling: false,
    multimodalVision: true,
    strengths: 'Strong executive tone matching, document summarization, and multimodal vision.',
    pullCommand: 'ollama pull gemma3:12b'
  },
  {
    id: 'gemma3:27b',
    name: 'Google Gemma 3 27B IT',
    family: 'Gemma',
    parameterCount: '27B',
    vramRequired: '~17 GB VRAM / RAM (Q4_K_M)',
    recommended: false,
    nativeToolCalling: false,
    multimodalVision: true,
    strengths: 'High-capacity open-weight model for long-context contract analysis and vision.',
    pullCommand: 'ollama pull gemma3:27b'
  }
];

export class OpenWeightProvider implements IAIProviderAdapter {
  private model: string;
  private baseUrl: string;
  private apiKey: string;

  constructor(
    model: string = DEFAULT_OPEN_WEIGHT_MODEL,
    baseUrl: string = DEFAULT_OLLAMA_BASE_URL,
    apiKey: string = ''
  ) {
    this.model = model || process.env.OPEN_WEIGHT_MODEL || DEFAULT_OPEN_WEIGHT_MODEL;
    this.baseUrl = (baseUrl || process.env.OLLAMA_BASE_URL || DEFAULT_OLLAMA_BASE_URL).replace(/\/+$/, '');
    this.apiKey = apiKey || process.env.OPEN_WEIGHT_API_KEY || 'ollama';
  }

  public getModel(): string {
    return this.model;
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  public async generateCompletion(
    messages: AIMessage[],
    tools?: AIToolDeclaration[],
    options?: { temperature?: number; maxTokens?: number }
  ): Promise<AIResponse> {
    const formattedMessages = messages.map((m, idx) => {
      if (idx === 0 && m.role === 'system' && tools && tools.length > 0) {
        const toolCatalog = tools
          .map(t => `- ${t.name}: ${t.description}`)
          .join('\n');
        return {
          role: m.role,
          content: `${m.content}\n\nAvailable Tools:\n${toolCatalog}\nIf you invoke a tool and native tool_calls are not used, you may also output a JSON block: {"tool": "<tool_name>", "arguments": {...}}.`
        };
      }
      return {
        role: m.role,
        content: m.content
      };
    });

    const body: Record<string, any> = {
      model: this.model,
      messages: formattedMessages,
      temperature: options?.temperature ?? 0.1,
      max_tokens: options?.maxTokens ?? 1024,
      stream: false
    };

    if (tools && tools.length > 0) {
      body.tools = tools.map(t => ({
        type: 'function',
        function: {
          name: t.name,
          description: t.description,
          parameters: t.parameters
        }
      }));
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Open-Weight Model endpoint error (${res.status} at ${this.baseUrl}): ${errText}`);
    }

    const data = await res.json();
    const choice = data.choices?.[0];
    const rawContent: string = choice?.message?.content || '';

    // Strip any <think>...</think> blocks emitted by reasoning open-weight models
    const cleanedText = rawContent.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

    const toolCalls: AIToolCall[] = [];
    if (choice?.message?.tool_calls && Array.isArray(choice.message.tool_calls)) {
      for (const tc of choice.message.tool_calls) {
        let parsedArgs: Record<string, any> = {};
        if (typeof tc.function?.arguments === 'string') {
          try {
            parsedArgs = JSON.parse(tc.function.arguments);
          } catch {
            parsedArgs = {};
          }
        } else if (tc.function?.arguments && typeof tc.function.arguments === 'object') {
          parsedArgs = tc.function.arguments;
        }
        if (tc.function?.name) {
          toolCalls.push({
            id: tc.id || `ow_call_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            name: tc.function.name,
            arguments: parsedArgs
          });
        }
      }
    }

    // Fallback: parse inline JSON tool call if model emitted tool invocation in text
    if (toolCalls.length === 0 && tools && tools.length > 0 && cleanedText) {
      const fallbackCalls = OpenWeightProvider.extractFallbackToolCalls(cleanedText, tools);
      toolCalls.push(...fallbackCalls);
    }

    return {
      text: cleanedText || 'Executing planned open-weight model workflow.',
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      usage: data.usage
        ? {
            promptTokens: data.usage.prompt_tokens || 0,
            completionTokens: data.usage.completion_tokens || 0,
            totalTokens: data.usage.total_tokens || 0
          }
        : undefined,
      provider: 'open_weight',
      model: this.model
    };
  }

  /**
   * Extracts tool calls from markdown JSON blocks or <tool_call> tags for open-weight models
   * (such as Gemma 3 or custom GGUFs) when the runtime does not populate native `tool_calls`.
   */
  public static extractFallbackToolCalls(
    content: string,
    availableTools: AIToolDeclaration[]
  ): AIToolCall[] {
    const validNames = new Set(availableTools.map(t => t.name));
    const results: AIToolCall[] = [];

    const candidates: string[] = [];

    // 1. Check <tool_call>...</tool_call> tags (used by Qwen/Hermes templates)
    const tagMatches = content.matchAll(/<tool_call>\s*([\s\S]*?)\s*<\/tool_call>/gi);
    for (const m of tagMatches) {
      if (m[1]) candidates.push(m[1].trim());
    }

    // 2. Check ```json ... ``` blocks or top-level JSON object
    const codeBlockMatches = content.matchAll(/```(?:json)?\s*([\s\S]*?)\s*```/gi);
    for (const m of codeBlockMatches) {
      if (m[1]) candidates.push(m[1].trim());
    }

    if (candidates.length === 0) {
      const braceMatch = content.match(/\{[\s\S]*\}/);
      if (braceMatch) candidates.push(braceMatch[0]);
    }

    for (const rawJson of candidates) {
      try {
        const parsed = JSON.parse(rawJson);
        const items = Array.isArray(parsed) ? parsed : [parsed];
        for (const item of items) {
          const toolName = item?.tool || item?.name || item?.function?.name;
          const toolArgs = item?.arguments || item?.parameters || item?.args || item?.function?.arguments || {};
          if (typeof toolName === 'string' && validNames.has(toolName)) {
            results.push({
              id: `ow_fb_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              name: toolName,
              arguments: typeof toolArgs === 'object' && toolArgs !== null ? toolArgs : {}
            });
          }
        }
      } catch {
        // Ignore non-JSON snippets
      }
    }

    return results;
  }

  /**
   * Queries the local Ollama daemon (`/api/tags`) to check connectivity and list installed models.
   */
  public static async checkOllamaStatus(baseUrl: string = DEFAULT_OLLAMA_BASE_URL): Promise<{
    reachable: boolean;
    endpoint: string;
    installedModels: string[];
    error?: string;
  }> {
    const rootUrl = baseUrl.replace(/\/v1\/?$/, '').replace(/\/+$/, '');
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2500);
      const res = await fetch(`${rootUrl}/api/tags`, {
        method: 'GET',
        signal: controller.signal
      });
      clearTimeout(timer);

      if (!res.ok) {
        return {
          reachable: false,
          endpoint: rootUrl,
          installedModels: [],
          error: `HTTP ${res.status}`
        };
      }

      const data = await res.json();
      const installedModels: string[] = Array.isArray(data?.models)
        ? data.models.map((m: any) => String(m.name || m.model)).filter(Boolean)
        : [];

      return {
        reachable: true,
        endpoint: rootUrl,
        installedModels
      };
    } catch (err: any) {
      return {
        reachable: false,
        endpoint: rootUrl,
        installedModels: [],
        error: err.message || 'Ollama daemon not reachable'
      };
    }
  }

  /**
   * Triggers a model pull on the local Ollama daemon (`/api/pull`).
   */
  public static async pullOllamaModel(
    model: string = DEFAULT_OPEN_WEIGHT_MODEL,
    baseUrl: string = DEFAULT_OLLAMA_BASE_URL
  ): Promise<{ success: boolean; model: string; status: string; error?: string }> {
    const rootUrl = baseUrl.replace(/\/v1\/?$/, '').replace(/\/+$/, '');
    try {
      const res = await fetch(`${rootUrl}/api/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: model, stream: false })
      });

      if (!res.ok) {
        const errText = await res.text();
        return {
          success: false,
          model,
          status: 'failed',
          error: `Ollama pull error (${res.status}): ${errText}`
        };
      }

      const data = await res.json();
      return {
        success: true,
        model,
        status: data?.status || 'success'
      };
    } catch (err: any) {
      return {
        success: false,
        model,
        status: 'unreachable',
        error: err.message || 'Failed to connect to Ollama daemon'
      };
    }
  }
}
