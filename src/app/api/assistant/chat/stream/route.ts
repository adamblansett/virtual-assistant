import { NextRequest, NextResponse } from 'next/server';
import { TaskPlanner } from '@/lib/planner/planner';
import { WorkflowExecutionEngine } from '@/lib/engine/executor';
import { AIProviderFactory } from '@/lib/ai/adapter';
import { AppStorage } from '@/lib/storage/db';
import { SecurityAuth } from '@/lib/security/auth';
import { MemoryService } from '@/lib/services/memory';

export async function POST(req: NextRequest) {
  const auth = SecurityAuth.verifyApiRequest(req);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.reason || 'Unauthorized' }, { status: auth.status || 401 });
  }

  const body = await req.json();
  const message = body.message?.trim();

  if (!message) {
    return NextResponse.json({ error: 'Message cannot be empty.' }, { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: string, data: Record<string, any>) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      };

      try {
        AppStorage.initialize();
        AppStorage.addMessage('user', message);

        const learnedMemories = MemoryService.extractAndLearnFromText(message, 'auto_chat');
        const config = AppStorage.getIntegrationConfig();
        const preferences = AppStorage.getPreferences();
        const aiProvider = AIProviderFactory.getProvider(config.aiProvider);

        // 1. Plan generation
        const planner = new TaskPlanner(aiProvider, preferences);
        const plan = await planner.createPlan(message);
        sendEvent('plan_created', { plan, learnedMemories });

        // 2. Step-by-step execution with live SSE progress callbacks
        const { plan: executedPlan, summary } = await WorkflowExecutionEngine.executePlan(
          plan,
          false,
          [],
          undefined,
          (progressEvt) => {
            sendEvent(progressEvt.type, {
              stepIndex: progressEvt.stepIndex,
              action: progressEvt.action,
              plan: progressEvt.plan
            });
          }
        );

        // 3. Post-Tool AI Synthesis & token chunk streaming
        const assistantText = await planner.synthesizeExecutionResponse(executedPlan, summary);
        const words = assistantText.split(/(\s+)/);
        let accumulated = '';
        for (let i = 0; i < words.length; i += 4) {
          const chunk = words.slice(i, i + 4).join('');
          accumulated += chunk;
          sendEvent('token', { delta: chunk, text: accumulated });
        }

        AppStorage.addMessage('assistant', assistantText, executedPlan.id);

        sendEvent('done', {
          plan: executedPlan,
          summary,
          assistantMessage: assistantText,
          requiresApproval: executedPlan.status === 'awaiting_approval',
          learnedMemories
        });
      } catch (err: any) {
        sendEvent('error', { error: err.message || 'Stream execution failed' });
      } finally {
        controller.close();
      }
    }
  });

  return new NextResponse(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive'
    }
  });
}
