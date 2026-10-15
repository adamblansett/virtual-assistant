import { NextRequest, NextResponse } from 'next/server';
import { AppStorage } from '@/lib/storage/db';
import { ExpenseRecord, ExpenseRecordSchema } from '@/types';

export async function GET() {
  try {
    const expenses = AppStorage.listExpenses();
    const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);
    const byCategory: Record<string, number> = {};
    for (const exp of expenses) {
      byCategory[exp.category] = (byCategory[exp.category] || 0) + exp.amount;
    }

    return NextResponse.json({
      expenses,
      summary: {
        totalAmount,
        currency: 'USD',
        byCategory,
        count: expenses.length
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to list expenses' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const newExpense: ExpenseRecord = ExpenseRecordSchema.parse({
      id: body.id || `exp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      date: body.date || new Date().toISOString().split('T')[0],
      merchant: body.merchant,
      amount: Number(body.amount),
      currency: body.currency || 'USD',
      category: body.category || 'other',
      source: body.source || 'Manual User Entry',
      verified: body.verified ?? true
    });

    AppStorage.saveExpense(newExpense);
    return NextResponse.json({ success: true, expense: newExpense });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to save expense' }, { status: 400 });
  }
}
