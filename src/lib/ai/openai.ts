/**
 * OpenAI-Compatible Model Adapter.
 * Supports OpenAI, Groq, Ollama, OpenRouter, and local vLLM endpoints.
 */

import { IAIProviderAdapter, AIMessage, AIToolDeclaration, AIResponse, AIToolCall } from './types';

export class OpenAICompatibleProvider implements IAIProviderAdapter {
  private apiKey: string;
  private baseUrl: string;
  private model: string;

  constructor(apiKey?: string, baseUrl: string = 'https://api.openai.com/v1', model: string = 'gpt-4o-mini') {
    this.apiKey = apiKey || process.env.OPENAI_API_KEY || '';
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.model = model;
  }

  public async generateCompletion(
    messages: AIMessage[],
    tools?: AIToolDeclaration[],
    options?: { temperature?: number; maxTokens?: number }
  ): Promise<AIResponse> {
    if (!this.apiKey && !this.baseUrl.includes('localhost') && !this.baseUrl.includes('127.0.0.1')) {
      throw new Error('OPENAI_API_KEY is not configured.');
    }

    const formattedMessages = messages.map(m => ({
      role: m.role,
      content: m.content
    }));

    const body: any = {
      model: this.model,
      messages: formattedMessages,
      temperature: options?.temperature ?? 0.2,
      max_tokens: options?.maxTokens ?? 1024
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

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenAI API error (${res.status}): ${err}`);
    }

    const data = await res.json();
    const choice = data.choices?.[0];
    const text = choice?.message?.content || '';

    const toolCalls: AIToolCall[] = [];
    if (choice?.message?.tool_calls) {
      for (const tc of choice.message.tool_calls) {
        let parsedArgs = {};
        try {
          parsedArgs = JSON.parse(tc.function.arguments);
        } catch {
          parsedArgs = {};
        }
        toolCalls.push({
          id: tc.id,
          name: tc.function.name,
          arguments: parsedArgs
        });
      }
    }

    return {
      text,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens
      } : undefined,
      provider: 'openai_compatible',
      model: this.model
    };
  }
}
