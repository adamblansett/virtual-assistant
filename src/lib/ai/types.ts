export interface AIToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
}

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  toolCalls?: AIToolCall[];
}

export interface AIToolDeclaration {
  name: string;
  description: string;
  parameters: Record<string, any>; // JSON Schema
}

export interface AIResponse {
  text: string;
  toolCalls?: AIToolCall[];
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  provider: string;
  model: string;
}

export interface IAIProviderAdapter {
  generateCompletion(
    messages: AIMessage[],
    tools?: AIToolDeclaration[],
    options?: { temperature?: number; maxTokens?: number }
  ): Promise<AIResponse>;
}
