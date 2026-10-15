import { describe, it, expect, beforeEach } from 'vitest';
import { CloudDriveSyncService } from '@/lib/services/drive_sync';
import { AppStorage } from '@/lib/storage/db';

describe('Cloud Document & Drive Sync Service', () => {
  beforeEach(() => {
    AppStorage.reset();
  });

  it('lists all indexed executive contracts, presentations, and compliance documents', () => {
    const docs = CloudDriveSyncService.listDocuments();
    expect(docs.length).toBeGreaterThanOrEqual(3);

    const msa = docs.find(d => d.title.includes('Master Services Agreement'));
    expect(msa).toBeDefined();
    expect(msa?.tags).toContain('contract');

    const boardDeck = docs.find(d => d.title.includes('Pitch Deck'));
    expect(boardDeck).toBeDefined();
  });

  it('searches indexed documents across titles, tags, and content snippets', () => {
    const socResults = CloudDriveSyncService.searchDocuments('soc-2');
    expect(socResults.length).toBeGreaterThan(0);
    expect(socResults[0].title).toContain('SOC-2');

    const acmeResults = CloudDriveSyncService.searchDocuments('Acme');
    expect(acmeResults.length).toBeGreaterThan(0);
    expect(acmeResults[0].contentSnippet).toContain('Master Services Agreement');
  });

  it('generates an executive summary of a requested document highlighting key clauses', () => {
    const summaryResult = CloudDriveSyncService.summarizeDocument('Master Services Agreement');
    expect(summaryResult.document).toBeDefined();
    expect(summaryResult.executiveSummary).toContain('Acme Corp');
    expect(summaryResult.keyPoints.length).toBeGreaterThanOrEqual(3);
  });

  it('indexes a new document and makes it immediately searchable', () => {
    AppStorage.saveDocument({
      id: 'doc_custom_nda',
      title: 'Mutual Non-Disclosure Agreement - Sequoia Capital 2026.pdf',
      mimeType: 'application/pdf',
      path: '/Legal/NDAs/Sequoia NDA 2026.pdf',
      lastModified: new Date().toISOString(),
      owner: 'legal@example.com',
      tags: ['nda', 'confidentiality', 'investors', 'sequoia'],
      contentSnippet: 'Standard bilateral non-disclosure agreement with 3-year term and jurisdiction in Delaware.',
      summary: '3-year bilateral NDA with Sequoia Capital.'
    });

    const searchResults = CloudDriveSyncService.searchDocuments('sequoia');
    expect(searchResults.length).toBe(1);
    expect(searchResults[0].title).toContain('Sequoia Capital');
  });
});
