import { NextRequest, NextResponse } from 'next/server';
import { WorkflowExecutionEngine } from '@/lib/engine/executor';
import { AppStorage } from '@/lib/storage/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { planId, approved, approvedActionIds } = body;

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

    // User explicitly approved: resume execution
    const { plan: executedPlan, summary } = await WorkflowExecutionEngine.executePlan(
      plan,
      true,
      approvedActionIds || plan.actions.map(a => a.id)
    );

    const message = `Authorized operation executed: ${summary.explanation}`;
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
