import { describe, it, expect, beforeEach } from 'vitest';
import { ExecutiveGhostwriterService } from '@/lib/services/ghostwriter';
import { AppStorage } from '@/lib/storage/db';

describe('Executive Voice Matching & Ghostwriting Service', () => {
  beforeEach(() => {
    AppStorage.reset();
  });

  it('retrieves default executive voice profile', () => {
    const profile = AppStorage.getVoiceProfile();
    expect(profile.tone).toBe('concise_professional');
    expect(profile.brevityPreference).toBe('balanced');
    expect(profile.typicalSignOff).toBe('Best regards,\nAdam');
    expect(profile.typicalGreeting).toBe('Hi {{name}},');
  });

  it('updates executive voice profile with custom preferences', () => {
    const updated = AppStorage.saveVoiceProfile({
      tone: 'formal_corporate',
      typicalGreeting: 'Dear {{name}},',
      typicalSignOff: 'Sincerely,\nAlexander Vance, Managing Partner',
      formalityLevel: 5,
      brevityPreference: 'ultra_brief',
      preferredPhrases: ['Appreciate the update', 'Let us proceed'],
      avoidPhrases: ['ping me', 'touch base']
    });

    expect(updated.tone).toBe('formal_corporate');
    expect(updated.formalityLevel).toBe(5);
    expect(updated.brevityPreference).toBe('ultra_brief');

    const retrieved = AppStorage.getVoiceProfile();
    expect(retrieved.typicalSignOff).toContain('Alexander Vance');
  });

  it('ghostwrites an in-voice email response applying tone, greeting, and sign-off', async () => {
    const result = await ExecutiveGhostwriterService.ghostwriteReply({
      recipient: 'elena.rostova@summitpartners.com',
      subject: 'Series B Valuation & Term Sheet',
      inquiryContext: 'Elena requested updated ARR metrics and proposed holding a follow-up discussion on Tuesday.',
      executiveInstructions: 'Confirm we will review the terms and agree to meet Tuesday afternoon.'
    });

    expect(result.to).toBe('elena.rostova@summitpartners.com');
    expect(result.subject).toBe('Re: Series B Valuation & Term Sheet');
    expect(result.body).toContain('Hi Elena,');
    expect(result.body).toContain('Best regards,\nAdam');
    expect(result.draftId).toBeDefined();
    expect(result.suggestedAction).toContain('Review draft');
  });

  it('adapts phrasing based on ultra_brief vs detailed brevity preferences', async () => {
    // Ultra brief
    AppStorage.saveVoiceProfile({
      brevityPreference: 'ultra_brief'
    });

    const briefResult = await ExecutiveGhostwriterService.ghostwriteReply({
      recipient: 'colleague@corp.com',
      subject: 'Status of Sprint Review',
      inquiryContext: 'Is the sprint review happening today?',
      executiveInstructions: 'Yes, 3 PM.'
    });

    expect(briefResult.body.length).toBeLessThan(150);

    // Detailed
    AppStorage.saveVoiceProfile({
      brevityPreference: 'detailed'
    });

    const detailedResult = await ExecutiveGhostwriterService.ghostwriteReply({
      recipient: 'colleague@corp.com',
      subject: 'Status of Sprint Review',
      inquiryContext: 'Is the sprint review happening today?',
      executiveInstructions: 'Yes, 3 PM.'
    });

    expect(detailedResult.body).toContain('Please let me know if there are any urgent items');
  });
});
