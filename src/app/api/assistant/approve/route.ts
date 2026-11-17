import { NextRequest, NextResponse } from 'next/server';
import { WorkflowExecutionEngine } from '@/lib/engine/executor';
import { AppStorage } from '@/lib/storage/db';
import { SecurityAuth } from '@/lib/security/auth';
import { TaskPlanner } from '@/lib/planner/planner';
import { AIProviderFactory } from '@/lib/ai/adapter';

export async function POST(req: NextRequest) {
  try {
    const auth = SecurityAuth.verifyApiRequest(req);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.reason || 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { planId, approved, approvedActionIds, modifiedArguments } = body;

    if (!planId) {
      return NextResponse.json({ error: 'planId is required.' }, { status: 400 });
    }

    AppStorage.initialize();
    const plan = AppStorage.getPlan(planId);

    if (!plan) {
      return NextResponse.json({ error: `Plan with ID ${planId} not found.` }, { status: 404 });
    }

    if (!approved) {
      // User rejected the action
      plan.status = 'rejected';
      plan.updatedAt = new Date().toISOString();
      for (const action of plan.actions) {
        if (action.status === 'awaiting_approval' || action.status === 'proposed') {
          action.status = 'rejected';
          action.error = 'Rejected by user.';
        }
      }
      AppStorage.savePlan(plan);
      AppStorage.addMessage('assistant', `Operation "${plan.summary}" was cancelled by user authorization decline.`, plan.id);

      return NextResponse.json({
        plan,
        summary: {
          planId: plan.id,
          totalActions: plan.actions.length,
          succeeded: 0,
          partiallySucceeded: 0,
          failed: 0,
          skipped: plan.actions.length,
          verified: 0,
          verificationFailed: 0,
          explanation: 'User declined the proposed operations. Workflow cancelled safely.'
        }
      });
    }

    // User explicitly approved: resume execution (applying any user-edited action arguments)
    const { plan: executedPlan, summary } = await WorkflowExecutionEngine.executePlan(
      plan,
      true,
      approvedActionIds || plan.actions.map(a => a.id),
      modifiedArguments
    );

    const config = AppStorage.getIntegrationConfig();
    const preferences = AppStorage.getPreferences();
    const aiProvider = AIProviderFactory.getProvider(config.aiProvider);
    const planner = new TaskPlanner(aiProvider, preferences);
    const synthesized = await planner.synthesizeExecutionResponse(executedPlan, summary);

    const message = `Authorized operation executed: ${synthesized}`;
    AppStorage.addMessage('assistant', message, executedPlan.id);

    return NextResponse.json({
      plan: executedPlan,
      summary,
      message
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Approval execution failed.' }, { status: 500 });
  }
}
