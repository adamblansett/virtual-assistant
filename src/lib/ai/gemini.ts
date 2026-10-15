/**
 * Google Gemini API Model Adapter.
 * Uses official Gemini REST endpoint supporting structured function calling.
 */

import { IAIProviderAdapter, AIMessage, AIToolDeclaration, AIResponse, AIToolCall } from './types';

export class GeminiProvider implements IAIProviderAdapter {
  private apiKey: string;
  private model: string;

  constructor(apiKey?: string, model: string = 'gemini-2.5-flash') {
    this.apiKey = apiKey || process.env.GEMINI_API_KEY || '';
    this.model = model;
  }

  public async generateCompletion(
    messages: AIMessage[],
    tools?: AIToolDeclaration[],
    options?: { temperature?: number; maxTokens?: number }
  ): Promise<AIResponse> {
    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY is not configured.');
    }

    const contents = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));

    const systemInstruction = messages.find(m => m.role === 'system');

    const requestBody: any = {
      contents,
      generationConfig: {
        temperature: options?.temperature ?? 0.2,
        maxOutputTokens: options?.maxTokens ?? 1024
      }
    };

    if (systemInstruction) {
      requestBody.systemInstruction = {
        parts: [{ text: systemInstruction.content }]
      };
    }

    if (tools && tools.length > 0) {
      requestBody.tools = [{
        functionDeclarations: tools.map(t => ({
          name: t.name,
          description: t.description,
          parameters: t.parameters
        }))
      }];
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Gemini API error (${res.status}): ${err}`);
    }

    const data = await res.json();
    const candidate = data.candidates?.[0];
    const textPart = candidate?.content?.parts?.find((p: any) => p.text)?.text || '';

    const toolCalls: AIToolCall[] = [];
    const functionCalls = candidate?.content?.parts?.filter((p: any) => p.functionCall);
    if (functionCalls && functionCalls.length > 0) {
      for (const fc of functionCalls) {
        toolCalls.push({
          id: `call_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          name: fc.functionCall.name,
          arguments: fc.functionCall.args || {}
        });
      }
    }

    return {
      text: textPart,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      usage: data.usageMetadata ? {
        promptTokens: data.usageMetadata.promptTokenCount || 0,
        completionTokens: data.usageMetadata.candidatesTokenCount || 0,
        totalTokens: data.usageMetadata.totalTokenCount || 0
      } : undefined,
      provider: 'google_gemini',
      model: this.model
    };
  }
}
