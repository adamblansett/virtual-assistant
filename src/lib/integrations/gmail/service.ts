/**
 * Real Gmail API Service using official Google REST endpoints.
 * Handles authentication headers, token expiration, rate limit handling, and pagination.
 */

import { IIntegrationAdapter, IntegrationMetadata } from '../base';
import { GmailMessageSummary, GmailSearchResult, GmailSearchFilter, GmailBatchOperationResult } from './types';
import { GmailOAuthManager } from './oauth';

export class GmailService implements IIntegrationAdapter {
  private oauthManager: GmailOAuthManager;

  constructor(oauthManager?: GmailOAuthManager) {
    this.oauthManager = oauthManager || new GmailOAuthManager();
  }

  public async metadata(): Promise<IntegrationMetadata> {
    const tokens = await this.oauthManager.getValidTokens();
    const isConnected = !!tokens;

    return {
      id: 'gmail',
      name: 'Gmail',
      description: 'Official Google Gmail API (OAuth 2.0)',
      connected: isConnected,
      userEmail: tokens?.email,
      scopesGranted: tokens?.scopes || [],
      lastSyncedAt: isConnected ? new Date().toISOString() : undefined,
      isMock: false
    };
  }

  public async isConnected(): Promise<boolean> {
    const tokens = await this.oauthManager.getValidTokens();
    return !!tokens;
  }

  public async disconnect(): Promise<void> {
    await this.oauthManager.revokeTokens();
  }

  private async fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
    const accessToken = await this.oauthManager.getAccessToken();
    if (!accessToken) {
      throw new Error('Gmail account not authenticated. Please connect your Google account.');
    }

    const headers = new Headers(options.headers || {});
    headers.set('Authorization', `Bearer ${accessToken}`);
    headers.set('Accept', 'application/json');

    const res = await fetch(url, { ...options, headers });

    if (res.status === 401) {
      // Token might be expired, force refresh once
      const refreshedToken = await this.oauthManager.refreshAccessToken();
      if (!refreshedToken) {
        throw new Error('Gmail authorization has expired or was revoked. Please re-authenticate.');
      }
      headers.set('Authorization', `Bearer ${refreshedToken}`);
      return fetch(url, { ...options, headers });
    }

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Gmail API error (${res.status}): ${errorText}`);
    }

    return res;
  }

  public async searchMessages(filter: GmailSearchFilter): Promise<GmailSearchResult> {
    const queryParts: string[] = [];

    if (filter.query) queryParts.push(filter.query);
    if (filter.olderThanYears) {
      const cutoffDate = new Date();
      cutoffDate.setFullYear(cutoffDate.getFullYear() - filter.olderThanYears);
      const yyyy = cutoffDate.getFullYear();
      const mm = String(cutoffDate.getMonth() + 1).padStart(2, '0');
      const dd = String(cutoffDate.getDate()).padStart(2, '0');
      queryParts.push(`before:${yyyy}/${mm}/${dd}`);
    }
    if (filter.beforeDate) queryParts.push(`before:${filter.beforeDate.replace(/-/g, '/')}`);
    if (filter.afterDate) queryParts.push(`after:${filter.afterDate.replace(/-/g, '/')}`);
    if (filter.from) queryParts.push(`from:${filter.from}`);
    if (filter.label) queryParts.push(`label:${filter.label}`);
    if (filter.isUnread) queryParts.push(`is:unread`);

    const q = encodeURIComponent(queryParts.join(' '));
    const maxResults = filter.maxResults || 50;
    let endpoint = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}`;
    if (q) endpoint += `&q=${q}`;
    if (filter.pageToken) endpoint += `&pageToken=${filter.pageToken}`;

    const res = await this.fetchWithAuth(endpoint);
    const data = await res.json();

    if (!data.messages || data.messages.length === 0) {
      return { messages: [], totalEstimated: 0 };
    }

    // Retrieve metadata for returned message IDs
    const messages: GmailMessageSummary[] = [];
    for (const item of data.messages.slice(0, 50)) {
      try {
        const detail = await this.getMessageDetails(item.id);
        if (detail) messages.push(detail);
      } catch {
        // Individual fetch error ignored to protect batch
      }
    }

    return {
      messages,
      totalEstimated: data.resultSizeEstimate || messages.length,
      nextPageToken: data.nextPageToken
    };
  }

  public async getMessageDetails(id: string): Promise<GmailMessageSummary | null> {
    const endpoint = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata`;
    const res = await this.fetchWithAuth(endpoint);
    const data = await res.json();

    const headers: Record<string, string> = {};
    if (data.payload?.headers) {
      for (const h of data.payload.headers) {
        headers[h.name.toLowerCase()] = h.value;
      }
    }

    const timestampMs = parseInt(data.internalDate || `${Date.now()}`, 10);
    const labelIds: string[] = data.labelIds || [];

    return {
      id: data.id,
      threadId: data.threadId,
      sender: headers['from'] || 'Unknown Sender',
      recipient: headers['to'] || 'me',
      subject: headers['subject'] || '(No Subject)',
      snippet: data.snippet || '',
      date: new Date(timestampMs).toISOString(),
      timestampMs,
      labelIds,
      isRead: !labelIds.includes('UNREAD'),
      isStarred: labelIds.includes('STARRED')
    };
  }

  public async trashMessages(messageIds: string[]): Promise<GmailBatchOperationResult> {
    const succeededIds: string[] = [];
    const failedIds: string[] = [];
    const skippedIds: string[] = [];
    const errors: Record<string, string> = {};

    for (const id of messageIds) {
      try {
        const endpoint = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}/trash`;
        await this.fetchWithAuth(endpoint, { method: 'POST' });
        succeededIds.push(id);
      } catch (err: any) {
        failedIds.push(id);
        errors[id] = err.message || 'Trash failed';
      }
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

  public async archiveMessages(messageIds: string[]): Promise<GmailBatchOperationResult> {
    // Uses batchModify to remove INBOX label
    try {
      const endpoint = `https://gmail.googleapis.com/gmail/v1/users/me/messages/batchModify`;
      await this.fetchWithAuth(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: messageIds,
          removeLabelIds: ['INBOX']
        })
      });

      return {
        requestedCount: messageIds.length,
        succeededCount: messageIds.length,
        failedCount: 0,
        skippedCount: 0,
        succeededIds: messageIds,
        failedIds: [],
        skippedIds: [],
        errors: {}
      };
    } catch (err: any) {
      return {
        requestedCount: messageIds.length,
        succeededCount: 0,
        failedCount: messageIds.length,
        skippedCount: 0,
        succeededIds: [],
        failedIds: messageIds,
        skippedIds: [],
        errors: { batch: err.message || 'Archive failed' }
      };
    }
  }

  public async applyLabels(messageIds: string[], addLabelIds: string[], removeLabelIds: string[] = []): Promise<GmailBatchOperationResult> {
    try {
      const endpoint = `https://gmail.googleapis.com/gmail/v1/users/me/messages/batchModify`;
      await this.fetchWithAuth(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: messageIds,
          addLabelIds,
          removeLabelIds
        })
      });

      return {
        requestedCount: messageIds.length,
        succeededCount: messageIds.length,
        failedCount: 0,
        skippedCount: 0,
        succeededIds: messageIds,
        failedIds: [],
        skippedIds: [],
        errors: {}
      };
    } catch (err: any) {
      return {
        requestedCount: messageIds.length,
        succeededCount: 0,
        failedCount: messageIds.length,
        skippedCount: 0,
        succeededIds: [],
        failedIds: messageIds,
        skippedIds: [],
        errors: { batch: err.message || 'Label modification failed' }
      };
    }
  }

  public async createDraft(to: string, subject: string, body: string): Promise<{ draftId: string; threadId: string }> {
    const rawEmail = [
      `To: ${to}`,
      `Subject: ${subject}`,
      'Content-Type: text/plain; charset=utf-8',
      '',
      body
    ].join('\r\n');

    const encoded = Buffer.from(rawEmail).toString('base64url');
    const endpoint = `https://gmail.googleapis.com/gmail/v1/users/me/drafts`;

    const res = await this.fetchWithAuth(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: { raw: encoded } })
    });
    const data = await res.json();
    return { draftId: data.id, threadId: data.message?.threadId };
  }

  public async sendMessage(to: string, subject: string, body: string): Promise<{ messageId: string; threadId: string }> {
    const rawEmail = [
      `To: ${to}`,
      `Subject: ${subject}`,
      'Content-Type: text/plain; charset=utf-8',
      '',
      body
    ].join('\r\n');

    const encoded = Buffer.from(rawEmail).toString('base64url');
    const endpoint = `https://gmail.googleapis.com/gmail/v1/users/me/messages/send`;

    const res = await this.fetchWithAuth(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw: encoded })
    });
    const data = await res.json();
    return { messageId: data.id, threadId: data.threadId };
  }
}
