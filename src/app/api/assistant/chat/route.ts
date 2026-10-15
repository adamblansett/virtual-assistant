import { NextRequest, NextResponse } from 'next/server';
import { TaskPlanner } from '@/lib/planner/planner';
import { WorkflowExecutionEngine } from '@/lib/engine/executor';
import { AIProviderFactory } from '@/lib/ai/adapter';
import { AppStorage } from '@/lib/storage/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const message = body.message?.trim();

    if (!message) {
      return NextResponse.json({ error: 'Message cannot be empty.' }, { status: 400 });
    }

    AppStorage.initialize();
    AppStorage.addMessage('user', message);

    const config = AppStorage.getIntegrationConfig();
    const preferences = AppStorage.getPreferences();
    const aiProvider = AIProviderFactory.getProvider(config.aiProvider);

    // 1. Create inspectable TaskPlan
    const planner = new TaskPlanner(aiProvider, preferences);
    const plan = await planner.createPlan(message);

    // 2. Execute auto-permitted steps (e.g. preview read operations)
    const { plan: executedPlan, summary } = await WorkflowExecutionEngine.executePlan(plan, false);

    const assistantText = executedPlan.status === 'awaiting_approval'
      ? `${executedPlan.summary}\n\n${summary.explanation}`
      : `${executedPlan.summary}\n\n${summary.explanation}`;

    AppStorage.addMessage('assistant', assistantText, executedPlan.id);

    return NextResponse.json({
      plan: executedPlan,
      summary,
      assistantMessage: assistantText,
      requiresApproval: executedPlan.status === 'awaiting_approval'
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  AppStorage.initialize();
  const plans = AppStorage.listPlans();
  const messages = AppStorage.getConversationHistory();
  return NextResponse.json({ plans, messages });
}
