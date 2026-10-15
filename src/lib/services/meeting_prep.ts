/**
 * Meeting Intelligence & Executive Dossier Service.
 * 
 * Replaces human assistant meeting prep duties:
 * - Compiles executive briefing packets before important client & board meetings
 * - Gathers attendee bios, VIP status, past relationship notes, and recent email exchanges
 * - Surfaces open action items and agenda priorities
 * - Processes raw post-meeting notes to extract tasks and draft follow-up email recaps
 */

import { WorkflowExecutionEngine } from '@/lib/engine/executor';
import { AppStorage } from '@/lib/storage/db';
import { MeetingDossier, MeetingNotesProcessingResult, TaskItem } from '@/types';

export class MeetingPrepService {
  /**
   * Generates a comprehensive meeting dossier for an upcoming calendar event.
   */
  public static async prepareMeetingDossier(meetingId: string): Promise<MeetingDossier> {
    const adapters = WorkflowExecutionEngine.getAdaptersBundle();
    const events = await adapters.calendar.listEvents({});
    const meeting = events.find(e => e.id === meetingId) || events[0];

    if (!meeting) {
      throw new Error(`Calendar event not found with ID: ${meetingId}`);
    }

    const contacts = AppStorage.listContacts();
    const allTasks = AppStorage.listTasks();
    const attendeeEmails = meeting.attendees || [];

    // Compile attendee profiles
    const attendeeProfiles = await Promise.all(
      attendeeEmails.map(async (email) => {
        const contact = contacts.find(c => c.email.toLowerCase() === email.toLowerCase());
        
        // Search recent emails with this contact
        let recentThreads: Array<{ subject: string; date: string; snippet: string }> = [];
        try {
          const searchRes = await adapters.gmail.searchMessages({
            query: email,
            maxResults: 3
          });
          recentThreads = searchRes.messages.map(m => ({
            subject: m.subject,
            date: m.date,
            snippet: m.snippet
          }));
        } catch {
          recentThreads = [];
        }

        return {
          name: contact?.name || email.split('@')[0].replace('.', ' '),
          email,
          isVIP: contact?.isVIP || false,
          company: contact?.company || 'Partner Organization',
          role: contact?.role || 'Executive / Stakeholder',
          contextNotes: contact?.notes || ['No prior relationship notes on file.'],
          recentEmailThreads: recentThreads
        };
      })
    );

    // Filter relevant open tasks
    const relevantTasks = allTasks.filter(t => 
      t.status === 'todo' && (
        t.title.toLowerCase().includes(meeting.summary.toLowerCase().slice(0, 10)) ||
        attendeeProfiles.some(a => t.title.toLowerCase().includes(a.name.toLowerCase().split(' ')[0]))
      )
    );

    // Synthesize talking points
    const talkingPoints = [
      `Review mutual project deliverables and target timelines for ${meeting.summary}.`,
      `Address open discussion points from previous correspondence.`,
      `Align on key action item owners and follow-up deadlines.`
    ];

    const hasVIP = attendeeProfiles.some(a => a.isVIP);
    const executivePrepSummary = `Executive briefing for "${meeting.summary}". ${attendeeProfiles.length} attendee(s) participating${hasVIP ? ' (includes VIP stakeholder)' : ''}. ${relevantTasks.length} open action item(s) related to this agenda.`;

    const dossier: MeetingDossier = {
      meetingId: meeting.id,
      title: meeting.summary,
      startTime: meeting.startTime,
      endTime: meeting.endTime,
      location: meeting.location,
      attendees: attendeeProfiles,
      relevantTasks,
      executivePrepSummary,
      talkingPoints
    };

    AppStorage.saveMeetingDossier(dossier);
    return dossier;
  }

  /**
   * Processes raw post-meeting notes, extracts action items as tasks, and drafts a follow-up email recap.
   */
  public static async processMeetingNotes(
    meetingTitle: string,
    rawNotes: string,
    attendees: string[] = []
  ): Promise<MeetingNotesProcessingResult> {
    const lines = rawNotes.split('\n').map(l => l.trim()).filter(Boolean);
    const extractedTasks: TaskItem[] = [];

    for (const line of lines) {
      const lower = line.toLowerCase();
      if (
        lower.includes('action:') || 
        lower.includes('todo:') || 
        lower.includes('follow up:') || 
        lower.startsWith('- [ ]') ||
        lower.startsWith('* [ ]') ||
        lower.startsWith('task:')
      ) {
        const cleanTitle = line
          .replace(/^[-*]\s*(\[\s*\]\s*)?/i, '')
          .replace(/^(action|todo|follow up|task):?\s*/i, '')
          .trim();

        if (cleanTitle) {
          const isUrgent = lower.includes('urgent') || lower.includes('asap') || lower.includes('immediately');
          const task: TaskItem = {
            id: `tsk_mtg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            title: cleanTitle,
            description: `Extracted from meeting notes: "${meetingTitle}"`,
            priority: isUrgent ? 'high' : 'medium',
            status: 'todo',
            source: 'meeting',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          AppStorage.saveTask(task);
          extractedTasks.push(task);
        }
      }
    }

    // Default fallback task if no explicit bullets detected
    if (extractedTasks.length === 0 && lines.length > 0) {
      const task: TaskItem = {
        id: `tsk_mtg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        title: `Follow up on: ${lines[0].slice(0, 80)}`,
        description: `Review notes from ${meetingTitle}`,
        priority: 'medium',
        status: 'todo',
        source: 'meeting',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      AppStorage.saveTask(task);
      extractedTasks.push(task);
    }

    const taskBulletPoints = extractedTasks.map(t => `• ${t.title} [Priority: ${t.priority.toUpperCase()}]`).join('\n');

    const followUpBody = `Hi all,\n\nThank you for taking the time to meet today regarding "${meetingTitle}".\n\nHere is a quick summary of the agreed action items and next steps:\n\n${taskBulletPoints}\n\nPlease let me know if I missed any key items or if anyone needs adjustments to deliverables.\n\nBest regards,\nExecutive Office`;

    const summary = `Extracted ${extractedTasks.length} action item(s) from meeting notes and prepared follow-up recap draft.`;

    return {
      extractedTasks,
      followUpDraft: {
        recipients: attendees.length > 0 ? attendees : ['team@example.com'],
        subject: `Meeting Recap & Next Steps: ${meetingTitle}`,
        body: followUpBody
      },
      summary
    };
  }
}
