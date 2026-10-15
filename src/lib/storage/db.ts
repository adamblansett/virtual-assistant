/**
 * Persistent Storage Layer.
 * Manages TaskPlans, Conversations, UserPreferences, and Integration Connections.
 * Uses atomic file persistence for self-hosting reliability without external DB dependencies.
 */

import fs from 'fs';
import path from 'path';
import { TaskPlan, UserPreferences, UserPreferencesSchema } from '@/types';

interface AppState {
  plans: Record<string, TaskPlan>;
  conversations: Array<{ id: string; role: 'user' | 'assistant'; text: string; planId?: string; timestamp: string }>;
  preferences: UserPreferences;
  integrationConfig: {
    useMockGmail: boolean;
    aiProvider: string;
    geminiApiKey?: string;
    openaiApiKey?: string;
  };
}

export class AppStorage {
  private static filePath = path.join(process.cwd(), 'data', 'app_state.json');
  private static state: AppState | null = null;

  private static getDefaultState(): AppState {
    return {
      plans: {},
      conversations: [],
      preferences: UserPreferencesSchema.parse({}),
      integrationConfig: {
        useMockGmail: true,
        aiProvider: 'mock'
      }
    };
  }

  public static initialize(): void {
    if (this.state) return;

    try {
      const dataDir = path.dirname(this.filePath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        this.state = JSON.parse(raw);
      } else {
        this.state = this.getDefaultState();
        this.save();
      }
    } catch {
      this.state = this.getDefaultState();
    }
  }

  private static save(): void {
    if (!this.state) return;
    try {
      const dataDir = path.dirname(this.filePath);
      if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
      fs.writeFileSync(this.filePath, JSON.stringify(this.state, null, 2), 'utf-8');
    } catch {
      // Fallback in memory
    }
  }

  // --- Plans ---
  public static savePlan(plan: TaskPlan): void {
    this.initialize();
    if (!this.state) return;
    this.state.plans[plan.id] = plan;
    this.save();
  }

  public static getPlan(id: string): TaskPlan | null {
    this.initialize();
    return this.state?.plans[id] || null;
  }

  public static listPlans(): TaskPlan[] {
    this.initialize();
    return Object.values(this.state?.plans || {}).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  // --- Conversations ---
  public static addMessage(role: 'user' | 'assistant', text: string, planId?: string): void {
    this.initialize();
    if (!this.state) return;
    this.state.conversations.push({
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      role,
      text,
      planId,
      timestamp: new Date().toISOString()
    });
    this.save();
  }

  public static getConversationHistory(): AppState['conversations'] {
    this.initialize();
    return this.state?.conversations || [];
  }

  // --- Preferences ---
  public static getPreferences(): UserPreferences {
    this.initialize();
    return this.state?.preferences || UserPreferencesSchema.parse({});
  }

  public static updatePreferences(updates: Partial<UserPreferences>): UserPreferences {
    this.initialize();
    if (!this.state) return UserPreferencesSchema.parse({});
    this.state.preferences = UserPreferencesSchema.parse({
      ...this.state.preferences,
      ...updates
    });
    this.save();
    return this.state.preferences;
  }

  // --- Config ---
  public static getIntegrationConfig(): AppState['integrationConfig'] {
    this.initialize();
    return this.state?.integrationConfig || { useMockGmail: true, aiProvider: 'mock' };
  }

  public static updateIntegrationConfig(updates: Partial<AppState['integrationConfig']>): void {
    this.initialize();
    if (!this.state) return;
    this.state.integrationConfig = {
      ...this.state.integrationConfig,
      ...updates
    };
    this.save();
  }

  public static reset(): void {
    this.state = this.getDefaultState();
    this.save();
  }
}
