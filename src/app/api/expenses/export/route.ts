import { NextRequest, NextResponse } from 'next/server';
import { AppStorage } from '@/lib/storage/db';
import { SecurityAuth } from '@/lib/security/auth';

function escapeCsvCell(value: string | number | boolean): string {
  const str = String(value ?? '');
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(req?: NextRequest) {
  try {
    const auth = SecurityAuth.verifyApiRequest(req);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.reason || 'Unauthorized' }, { status: auth.status || 401 });
    }

    AppStorage.initialize();
    const expenses = AppStorage.listExpenses();
    const receipts = AppStorage.listReceipts();
    const format = req ? new URL(req.url).searchParams.get('format') || 'csv' : 'csv';

    if (format === 'markdown' || format === 'md') {
      const total = expenses.reduce((sum, e) => sum + e.amount, 0);
      const mdLines = [
        '# Executive Expense & Receipt Reconciliation Report',
        `Generated: ${new Date().toISOString()}`,
        `Total Recorded Spend: $${total.toFixed(2)} USD (${expenses.length} transactions)`,
        '',
        '## Expense Ledger',
        '| Date | Merchant | Category | Amount | Verified | Source |',
        '| :--- | :--- | :--- | ---: | :--- | :--- |',
        ...expenses.map(
          e =>
            `| ${e.date} | ${e.merchant} | ${e.category} | $${e.amount.toFixed(2)} ${e.currency} | ${
              e.verified ? 'Yes' : 'No'
            } | ${e.source} |`
        )
      ];

      return new NextResponse(mdLines.join('\n'), {
        status: 200,
        headers: {
          'Content-Type': 'text/markdown; charset=utf-8',
          'Content-Disposition': 'attachment; filename="executive_expense_report.md"'
        }
      });
    }

    const receiptMap = new Map(receipts.map(r => [`exp_${r.receiptId}`, r]));
    const headers = [
      'ID',
      'Date',
      'Merchant',
      'Category',
      'Amount',
      'Currency',
      'TaxAmount',
      'Verified',
      'Source',
      'LineItems'
    ];

    const rows = [headers.join(',')];
    for (const exp of expenses) {
      const matchedReceipt = receiptMap.get(exp.id);
      const taxAmount = matchedReceipt ? matchedReceipt.taxAmount.toFixed(2) : '0.00';
      const lineItemsSummary = matchedReceipt
        ? matchedReceipt.lineItems.map(li => `${li.description} ($${li.amount.toFixed(2)})`).join('; ')
        : exp.source;

      rows.push(
        [
          escapeCsvCell(exp.id),
          escapeCsvCell(exp.date),
          escapeCsvCell(exp.merchant),
          escapeCsvCell(exp.category),
          escapeCsvCell(exp.amount.toFixed(2)),
          escapeCsvCell(exp.currency),
          escapeCsvCell(taxAmount),
          escapeCsvCell(exp.verified),
          escapeCsvCell(exp.source),
          escapeCsvCell(lineItemsSummary)
        ].join(',')
      );
    }

    return new NextResponse(rows.join('\r\n'), {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="executive_expenses.csv"'
      }
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to export expenses' },
      { status: 500 }
    );
  }
}
