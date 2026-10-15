/**
 * Inbox Triage & Smart Follow-Up Detection Service.
 * 
 * Replaces human assistant email triaging:
 * - Identifies emails needing prompt human reply or decision
 * - Flags unresponded inquiries and draft follow-up reminders
 * - Isolates financial receipts and invoices
 * - Identifies bulk newsletters for archiving or clean-up
 */

import { WorkflowExecutionEngine } from '@/lib/engine/executor';
import { AppStorage } from '@/lib/storage/db';

export interface TriageItem {
  messageId: string;
  sender: string;
  subject: string;
  date: string;
  category: 'needs_action' | 'finance_and_records' | 'low_priority' | 'informational';
  actionSuggested: string;
  isVIP: boolean;
}

export interface TriageReport {
  totalAnalyzed: number;
  needsActionCount: number;
  financeCount: number;
  lowPriorityCount: number;
  items: TriageItem[];
}

export class InboxTriageService {
  public static async triageInbox(): Promise<TriageReport> {
    const adapters = WorkflowExecutionEngine.getAdaptersBundle();
    const searchRes = await adapters.gmail.searchMessages({ maxResults: 50 });
    const contacts = AppStorage.listContacts();
    const vipEmails = new Set(contacts.filter(c => c.isVIP).map(c => c.email.toLowerCase()));

    const items: TriageItem[] = [];

    for (const msg of searchRes.messages) {
      const senderLower = msg.sender.toLowerCase();
      const subjectLower = msg.subject.toLowerCase();
      const isVIP = Array.from(vipEmails).some(ve => senderLower.includes(ve));

      let category: TriageItem['category'] = 'informational';
      let actionSuggested = 'Review at convenience';

      if (
        subjectLower.includes('tax') || 
        subjectLower.includes('receipt') || 
        subjectLower.includes('statement') || 
        subjectLower.includes('invoice') || 
        senderLower.includes('irs.gov') || 
        senderLower.includes('chase.com')
      ) {
        category = 'finance_and_records';
        actionSuggested = 'Preserve in financial archives; log expense';
      } else if (
        isVIP || 
        subjectLower.includes('urgent') || 
        subjectLower.includes('contract') || 
        subjectLower.includes('review') || 
        subjectLower.includes('sla') || 
        subjectLower.includes('meeting')
      ) {
        category = 'needs_action';
        actionSuggested = isVIP 
          ? 'VIP sender - prioritize reply or schedule call' 
          : 'Action item detected - draft reply';
      } else if (
        msg.labelIds.includes('CATEGORY_PROMOTIONS') || 
        subjectLower.includes('deal') || 
        subjectLower.includes('special') || 
        subjectLower.includes('discount')
      ) {
        category = 'low_priority';
        actionSuggested = 'Eligible for archiving or cleanup';
      }

      items.push({
        messageId: msg.id,
        sender: msg.sender,
        subject: msg.subject,
        date: msg.date,
        category,
        actionSuggested,
        isVIP
      });
    }

    return {
      totalAnalyzed: items.length,
      needsActionCount: items.filter(i => i.category === 'needs_action').length,
      financeCount: items.filter(i => i.category === 'finance_and_records').length,
      lowPriorityCount: items.filter(i => i.category === 'low_priority').length,
      items
    };
  }
}
