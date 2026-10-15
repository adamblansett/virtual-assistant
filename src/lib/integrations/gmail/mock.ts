/**
 * Deterministic Fake Gmail Adapter for offline testing and development.
 * Simulates real Gmail API behavior with an in-memory message store.
 */

import { IIntegrationAdapter, IntegrationMetadata } from '../base';
import { GmailMessageSummary, GmailSearchResult, GmailSearchFilter, GmailBatchOperationResult } from './types';

export class MockGmailAdapter implements IIntegrationAdapter {
  private messages: Map<string, GmailMessageSummary> = new Map();
  private connected: boolean = true;
  private userEmail: string = 'user.demo@example.com';

  constructor() {
    this.seedMockData();
  }

  /**
   * Seeds realistic emails with various dates, labels, and categories.
   */
  public seedMockData(): void {
    this.messages.clear();

    const now = new Date();
    const sixYearsAgo = new Date(now.getFullYear() - 6, 2, 15);
    const sevenYearsAgo = new Date(now.getFullYear() - 7, 5, 20);
    const oneYearAgo = new Date(now.getFullYear() - 1, 8, 10);
    const recent = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2);

    const initialMessages: GmailMessageSummary[] = [
      // Qualifying candidate 1: Old promo newsletter (eligible for cleanup)
      {
        id: 'msg_001_old_promo',
        threadId: 'th_001',
        sender: 'deals@oldstore.com',
        recipient: this.userEmail,
        subject: 'Weekly Deals from 2019! 50% Off Everything',
        snippet: 'Do not miss our gigantic seasonal discount on electronics and games...',
        date: sevenYearsAgo.toISOString(),
        timestampMs: sevenYearsAgo.getTime(),
        labelIds: ['INBOX', 'CATEGORY_PROMOTIONS'],
        isRead: true,
        isStarred: false
      },
      // Qualifying candidate 2: Old social notification (eligible for cleanup)
      {
        id: 'msg_002_old_social',
        threadId: 'th_002',
        sender: 'notifications@oldnetwork.com',
        recipient: this.userEmail,
        subject: 'You have 12 new connection requests waiting',
        snippet: 'Log in to see who viewed your profile this week...',
        date: sixYearsAgo.toISOString(),
        timestampMs: sixYearsAgo.getTime(),
        labelIds: ['INBOX', 'CATEGORY_SOCIAL'],
        isRead: true,
        isStarred: false
      },
      // Qualifying candidate 3: Old marketing spam (eligible for cleanup)
      {
        id: 'msg_003_old_travel',
        threadId: 'th_003',
        sender: 'flyer@vacationclub.com',
        recipient: this.userEmail,
        subject: 'Spring getaway specials to the islands',
        snippet: 'Limited time resort packages starting at $299 per night...',
        date: sixYearsAgo.toISOString(),
        timestampMs: sixYearsAgo.getTime(),
        labelIds: ['INBOX', 'CATEGORY_PROMOTIONS'],
        isRead: false,
        isStarred: false
      },
      // PROTECTED 1: Old Tax/IRS email from 6 years ago (must be protected by policy!)
      {
        id: 'msg_004_tax_document',
        threadId: 'th_004',
        sender: 'noreply@irs.gov',
        recipient: this.userEmail,
        subject: 'Official Tax Statement & Form 1099 Confirmation',
        snippet: 'Your official annual tax records are ready to download for filing...',
        date: sixYearsAgo.toISOString(),
        timestampMs: sixYearsAgo.getTime(),
        labelIds: ['INBOX', 'IMPORTANT'],
        isRead: true,
        isStarred: false
      },
      // PROTECTED 2: Old Starred email (user marked starred, must be protected!)
      {
        id: 'msg_005_starred_note',
        threadId: 'th_005',
        sender: 'mentor@university.edu',
        recipient: this.userEmail,
        subject: 'Career Advice and Lifelong Recommendations',
        snippet: 'Here are the key principles we discussed during your final thesis review...',
        date: sevenYearsAgo.toISOString(),
        timestampMs: sevenYearsAgo.getTime(),
        labelIds: ['INBOX', 'STARRED'],
        isRead: true,
        isStarred: true
      },
      // PROTECTED 3: Old Purchase Receipt (must be protected by policy!)
      {
        id: 'msg_006_purchase_receipt',
        threadId: 'th_006',
        sender: 'billing@chase.com',
        recipient: this.userEmail,
        subject: 'Your Chase Credit Card Payment Receipt and Statement',
        snippet: 'Your payment of $1,250.00 was successfully processed on March 1st...',
        date: sixYearsAgo.toISOString(),
        timestampMs: sixYearsAgo.getTime(),
        labelIds: ['INBOX'],
        isRead: true,
        isStarred: false
      },
      // NON-QUALIFYING 1: 1 year ago (does not meet >5y cutoff)
      {
        id: 'msg_007_recent_project',
        threadId: 'th_007',
        sender: 'colleague@workplace.org',
        recipient: this.userEmail,
        subject: 'Project roadmap review meeting summary',
        snippet: 'Attached are the slides from yesterday afternoon sprint planning...',
        date: oneYearAgo.toISOString(),
        timestampMs: oneYearAgo.getTime(),
        labelIds: ['INBOX', 'WORK'],
        isRead: true,
        isStarred: false
      },
      // NON-QUALIFYING 2: 2 days ago
      {
        id: 'msg_008_recent_family',
        threadId: 'th_008',
        sender: 'friend@personal.net',
        recipient: this.userEmail,
        subject: 'Dinner this upcoming weekend?',
        snippet: 'Let me know if you are free around 7 PM on Saturday...',
        date: recent.toISOString(),
        timestampMs: recent.getTime(),
        labelIds: ['INBOX'],
        isRead: false,
        isStarred: false
      }
    ];

    for (const msg of initialMessages) {
      this.messages.set(msg.id, msg);
    }
  }

  public async metadata(): Promise<IntegrationMetadata> {
    return {
      id: 'gmail',
      name: 'Gmail',
      description: 'Google Gmail official API integration (Mock Mode Active)',
      connected: this.connected,
      userEmail: this.userEmail,
      scopesGranted: [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.modify',
        'https://www.googleapis.com/auth/gmail.compose'
      ],
      lastSyncedAt: new Date().toISOString(),
      isMock: true
    };
  }

  public async isConnected(): Promise<boolean> {
    return this.connected;
  }

  public async disconnect(): Promise<void> {
    this.connected = false;
  }

  public async reconnect(): Promise<void> {
    this.connected = true;
  }

  public async searchMessages(filter: GmailSearchFilter): Promise<GmailSearchResult> {
    if (!this.connected) {
      throw new Error('Gmail integration is not connected.');
    }

    let results = Array.from(this.messages.values());

    // Filter by older than years
    if (filter.olderThanYears) {
      const cutoffDate = new Date();
      cutoffDate.setFullYear(cutoffDate.getFullYear() - filter.olderThanYears);
      results = results.filter(m => m.timestampMs < cutoffDate.getTime());
    }

    // Filter by before date
    if (filter.beforeDate) {
      const beforeTime = new Date(filter.beforeDate).getTime();
      results = results.filter(m => m.timestampMs < beforeTime);
    }

    // Filter by after date
    if (filter.afterDate) {
      const afterTime = new Date(filter.afterDate).getTime();
      results = results.filter(m => m.timestampMs > afterTime);
    }

    // Filter by sender
    if (filter.from) {
      const fromLower = filter.from.toLowerCase();
      results = results.filter(m => m.sender.toLowerCase().includes(fromLower));
    }

    // Filter by label
    if (filter.label) {
      const labelUpper = filter.label.toUpperCase();
      results = results.filter(m => m.labelIds.includes(labelUpper));
    }

    // Filter by unread
    if (filter.isUnread !== undefined) {
      results = results.filter(m => m.isRead === !filter.isUnread);
    }

    // Filter by raw query if provided (e.g. "older_than:5y")
    if (filter.query) {
      const q = filter.query.toLowerCase();
      if (q.includes('older_than:5y')) {
        const cutoff = new Date();
        cutoff.setFullYear(cutoff.getFullYear() - 5);
        results = results.filter(m => m.timestampMs < cutoff.getTime());
      }
      if (q.includes('is:unread')) {
        results = results.filter(m => !m.isRead);
      }
    }

    // Exclude messages already in TRASH unless explicitly searching TRASH
    if (!filter.label || filter.label.toUpperCase() !== 'TRASH') {
      results = results.filter(m => !m.labelIds.includes('TRASH'));
    }

    const limited = results.slice(0, filter.maxResults || 50);

    return {
      messages: limited,
      totalEstimated: results.length
    };
  }

  public async getMessageDetails(id: string): Promise<GmailMessageSummary | null> {
    return this.messages.get(id) || null;
  }

  /**
   * Moves messages to Trash.
   */
  public async trashMessages(messageIds: string[]): Promise<GmailBatchOperationResult> {
    if (!this.connected) throw new Error('Gmail integration is not connected.');

    const succeededIds: string[] = [];
    const failedIds: string[] = [];
    const skippedIds: string[] = [];
    const errors: Record<string, string> = {};

    for (const id of messageIds) {
      const msg = this.messages.get(id);
      if (!msg) {
        failedIds.push(id);
        errors[id] = 'Message not found';
        continue;
      }

      if (msg.labelIds.includes('TRASH')) {
        skippedIds.push(id);
        continue;
      }

      // Update state: remove INBOX, add TRASH
      msg.labelIds = msg.labelIds.filter(l => l !== 'INBOX');
      if (!msg.labelIds.includes('TRASH')) {
        msg.labelIds.push('TRASH');
      }
      this.messages.set(id, msg);
      succeededIds.push(id);
    }

    return {
      requestedCount: messageIds.length,
      succeededCount: succeededIds.length,
      failedCount: failedIds.length,
      skippedCount: skippedIds.length,
      succeededIds,
      failedIds,
      skippedIds,
      errors
    };
  }

  /**
   * Archives messages by removing INBOX label.
   */
  public async archiveMessages(messageIds: string[]): Promise<GmailBatchOperationResult> {
    if (!this.connected) throw new Error('Gmail integration is not connected.');

    const succeededIds: string[] = [];
    const failedIds: string[] = [];
    const skippedIds: string[] = [];
    const errors: Record<string, string> = {};

    for (const id of messageIds) {
      const msg = this.messages.get(id);
      if (!msg) {
        failedIds.push(id);
        errors[id] = 'Message not found';
        continue;
      }

      if (!msg.labelIds.includes('INBOX')) {
        skippedIds.push(id);
        continue;
      }

      msg.labelIds = msg.labelIds.filter(l => l !== 'INBOX');
      this.messages.set(id, msg);
      succeededIds.push(id);
    }

    return {
      requestedCount: messageIds.length,
      succeededCount: succeededIds.length,
      failedCount: failedIds.length,
      skippedCount: skippedIds.length,
      succeededIds,
      failedIds,
      skippedIds,
      errors
    };
  }

  /**
   * Applies custom labels to messages.
   */
  public async applyLabels(messageIds: string[], addLabelIds: string[], removeLabelIds: string[] = []): Promise<GmailBatchOperationResult> {
    if (!this.connected) throw new Error('Gmail integration is not connected.');

    const succeededIds: string[] = [];
    const failedIds: string[] = [];
    const skippedIds: string[] = [];
    const errors: Record<string, string> = {};

    for (const id of messageIds) {
      const msg = this.messages.get(id);
      if (!msg) {
        failedIds.push(id);
        errors[id] = 'Message not found';
        continue;
      }

      const currentLabels = msg.labelIds.filter(l => !removeLabelIds.includes(l));
      for (const addL of addLabelIds) {
        if (!currentLabels.includes(addL)) {
          currentLabels.push(addL);
        }
      }
      msg.labelIds = currentLabels;
      this.messages.set(id, msg);
      succeededIds.push(id);
    }

    return {
      requestedCount: messageIds.length,
      succeededCount: succeededIds.length,
      failedCount: failedIds.length,
      skippedCount: skippedIds.length,
      succeededIds,
      failedIds,
      skippedIds,
      errors
    };
  }

  /**
   * Creates an email draft.
   */
  public async createDraft(_to: string, _subject: string, _body: string): Promise<{ draftId: string; threadId: string }> {
    if (!this.connected) throw new Error('Gmail integration is not connected.');

    const draftId = `draft_${Date.now()}`;
    return { draftId, threadId: `th_${draftId}` };
  }

  /**
   * Sends an email (strictly consequential operation).
   */
  public async sendMessage(to: string, subject: string, body: string): Promise<{ messageId: string; threadId: string }> {
    if (!this.connected) throw new Error('Gmail integration is not connected.');

    const messageId = `msg_sent_${Date.now()}`;
    const newMsg: GmailMessageSummary = {
      id: messageId,
      threadId: `th_${messageId}`,
      sender: this.userEmail,
      recipient: to,
      subject,
      snippet: body.slice(0, 100),
      date: new Date().toISOString(),
      timestampMs: Date.now(),
      labelIds: ['SENT'],
      isRead: true,
      isStarred: false
    };

    this.messages.set(messageId, newMsg);
    return { messageId, threadId: newMsg.threadId };
  }
}
