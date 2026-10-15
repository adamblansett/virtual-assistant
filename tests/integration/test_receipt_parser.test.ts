import { describe, it, expect, beforeEach } from 'vitest';
import { ReceiptParserService } from '@/lib/services/receipt_parser';
import { AppStorage } from '@/lib/storage/db';

describe('PDF & Receipt OCR Document Parsing Service', () => {
  beforeEach(() => {
    AppStorage.reset();
  });

  it('parses cloud vendor invoice text and extracts merchant, tax, line items, and totals', () => {
    const rawInvoiceText = `
Amazon Web Services Invoice
Invoice Date: 2026-10-12
Account: 9021-4829-1102

Line Items:
Amazon EC2 Elastic Compute: $412.50
Amazon Aurora PostgreSQL: $185.00
Amazon S3 Cloud Storage: $42.10

Subtotal: $639.60
Tax / VAT (8.25%): $52.77
Total Amount Due: $692.37 USD
    `;

    const parsed = ReceiptParserService.parseReceiptDocument(rawInvoiceText, 'aws_invoice_oct2026.pdf');

    expect(parsed.merchantName).toBe('Amazon Web Services');
    expect(parsed.totalAmount).toBe(692.37);
    expect(parsed.taxAmount).toBe(52.77);
    expect(parsed.category).toBe('software');
    expect(parsed.confidenceScore).toBeGreaterThanOrEqual(0.9);
    expect(parsed.lineItems.length).toBeGreaterThanOrEqual(1);

    // Verify persisted in AppStorage receipts
    const storedReceipts = ReceiptParserService.listReceipts();
    expect(storedReceipts.some(r => r.receiptId === parsed.receiptId)).toBe(true);

    // Verify automatically reconciled into the corporate expense ledger
    const expenses = AppStorage.listExpenses();
    const matchedExpense = expenses.find(e => e.merchant === 'Amazon Web Services' && e.amount === 692.37);
    expect(matchedExpense).toBeDefined();
    expect(matchedExpense?.verified).toBe(true);
    expect(matchedExpense?.source).toContain('aws_invoice_oct2026.pdf');
  });

  it('parses travel receipts and categorizes accordingly', () => {
    const uberReceipt = `
Uber Technologies Inc.
Trip Date: 2026-10-14
Ride from JFK Airport to The Langham NYC

Base Fare: $74.50
Tolls & Surcharges: $15.20
Tip: $15.00
Grand Total: $104.70 USD
    `;

    const parsed = ReceiptParserService.parseReceiptDocument(uberReceipt, 'uber_trip_1014.txt');
    expect(parsed.merchantName).toBe('Uber Technologies');
    expect(parsed.totalAmount).toBe(104.70);
    expect(parsed.category).toBe('travel');

    const expenses = AppStorage.listExpenses();
    expect(expenses.some(e => e.merchant === 'Uber Technologies')).toBe(true);
  });
});
