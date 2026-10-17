/**
 * Persistent Storage Layer.
 * Manages TaskPlans, Conversations, UserPreferences, and Integration Connections.
 * Uses atomic file persistence for self-hosting reliability without external DB dependencies.
 */

import fs from 'fs';
import path from 'path';
import { 
  TaskPlan, UserPreferences, UserPreferencesSchema,
  TaskItem, ContactItem, ExpenseRecord,
  TripItinerary, MeetingDossier, RoutineExecutionResult,
  ExecutiveVoiceProfile, ExecutiveVoiceProfileSchema,
  CloudDocument, ScheduledJobConfig, ParsedReceipt,
  MemoryFact
} from '@/types';
import { CryptoVault } from '@/lib/security/vault';

export interface PersistedOAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  email?: string;
  scopes: string[];
}

interface AppState {
  plans: Record<string, TaskPlan>;
  conversations: Array<{ id: string; role: 'user' | 'assistant'; text: string; planId?: string; timestamp: string }>;
  preferences: UserPreferences;
  tasks: Record<string, TaskItem>;
  contacts: Record<string, ContactItem>;
  expenses: Record<string, ExpenseRecord>;
  trips: Record<string, TripItinerary>;
  dossiers: Record<string, MeetingDossier>;
  routines: Record<string, RoutineExecutionResult>;
  voiceProfile: ExecutiveVoiceProfile;
  documents: Record<string, CloudDocument>;
  scheduledJobs: Record<string, ScheduledJobConfig>;
  receipts: Record<string, ParsedReceipt>;
  memories: Record<string, MemoryFact>;
  oauthTokens?: PersistedOAuthTokens | null;
  mobileApprovals: Record<string, { planId: string; token: string; createdAt: string; status: 'pending' | 'approved' | 'rejected' }>;
  integrationConfig: {
    useMockGmail: boolean;
    useMockCalendar?: boolean;
    aiProvider: string;
    geminiApiKey?: string;
    openaiApiKey?: string;
    telegramBotToken?: string;
  };
}

export class AppStorage {
  private static filePath = path.join(process.cwd(), 'data', 'app_state.json');
  private static state: AppState | null = null;

  private static getDefaultState(): AppState {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 86400000).toISOString();
    const threeDays = new Date(now.getTime() + 3 * 86400000).toISOString();

    const initialTasks: Record<string, TaskItem> = {
      'tsk_01': {
        id: 'tsk_01',
        title: 'Review Q4 Master Service Agreement with Acme Corp',
        description: 'Check liability terms and deliverable schedule before executive call',
        priority: 'high',
        status: 'todo',
        dueDate: tomorrow,
        source: 'email',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      },
      'tsk_02': {
        id: 'tsk_02',
        title: 'Approve monthly cloud infrastructure invoice',
        description: 'Verify usage metrics from engineering lead',
        priority: 'medium',
        status: 'in_progress',
        dueDate: threeDays,
        source: 'user',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      },
      'tsk_03': {
        id: 'tsk_03',
        title: 'Draft follow-up email to Bob regarding API latency SLA',
        description: 'Send metrics breakdown and propose Thursday sync',
        priority: 'high',
        status: 'todo',
        dueDate: now.toISOString(),
        source: 'email',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      }
    };

    const initialContacts: Record<string, ContactItem> = {
      'cnt_01': {
        id: 'cnt_01',
        name: 'Alice Johnson',
        email: 'alice@acmecorp.com',
        company: 'Acme Corp',
        role: 'Client Partner & Account Director',
        isVIP: true,
        notes: ['Key enterprise client for Q4 contract', 'Prefers morning meetings before 11 AM'],
        lastContactedAt: new Date(now.getTime() - 4 * 86400000).toISOString(),
        followUpCadenceDays: 14,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      },
      'cnt_02': {
        id: 'cnt_02',
        name: 'Bob Smith',
        email: 'bob@partnertech.io',
        company: 'PartnerTech Solutions',
        role: 'VP of Engineering',
        isVIP: true,
        notes: ['Reviewed API architecture integration', 'Awaiting SLA agreement confirmation'],
        lastContactedAt: new Date(now.getTime() - 7 * 86400000).toISOString(),
        followUpCadenceDays: 7,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      },
      'cnt_03': {
        id: 'cnt_03',
        name: 'Carol Danvers',
        email: 'carol@danverstax.com',
        company: 'Danvers Tax & Advisory',
        role: 'Senior Tax Consultant',
        isVIP: false,
        notes: ['Files annual corporate taxes in March', 'Sent 1099 confirmation last week'],
        lastContactedAt: new Date(now.getTime() - 15 * 86400000).toISOString(),
        followUpCadenceDays: 60,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      }
    };

    const initialExpenses: Record<string, ExpenseRecord> = {
      'exp_01': {
        id: 'exp_01',
        merchant: 'AWS Cloud Services',
        amount: 349.50,
        currency: 'USD',
        date: new Date(now.getTime() - 2 * 86400000).toISOString().split('T')[0],
        category: 'software',
        source: 'Monthly Production Cluster Billing',
        verified: true
      },
      'exp_02': {
        id: 'exp_02',
        merchant: 'Delta Air Lines',
        amount: 620.00,
        currency: 'USD',
        date: new Date(now.getTime() - 5 * 86400000).toISOString().split('T')[0],
        category: 'travel',
        source: 'Flight to Client Summit NYC',
        verified: true
      },
      'exp_03': {
        id: 'exp_03',
        merchant: 'Acme Business Dinner',
        amount: 184.20,
        currency: 'USD',
        date: new Date(now.getTime() - 6 * 86400000).toISOString().split('T')[0],
        category: 'meals',
        source: 'Dinner meeting with Alice Johnson',
        verified: true
      }
    };

    const tripStart = new Date(now.getTime() + 5 * 86400000).toISOString().split('T')[0];
    const tripEnd = new Date(now.getTime() + 7 * 86400000).toISOString().split('T')[0];

    const initialTrips: Record<string, TripItinerary> = {
      'trip_nyc_01': {
        id: 'trip_nyc_01',
        destination: 'New York, NY',
        purpose: 'Q4 Enterprise Client Summit & Board Dinner',
        startDate: tripStart,
        endDate: tripEnd,
        flights: [
          {
            confirmationCode: 'DL-89324B',
            airline: 'Delta Air Lines',
            flightNumber: 'DL 428',
            departureAirport: 'BOS',
            arrivalAirport: 'JFK',
            departureTime: `${tripStart}T08:30:00Z`,
            arrivalTime: `${tripStart}T10:00:00Z`,
            seat: '3A',
            status: 'confirmed'
          },
          {
            confirmationCode: 'DL-89324B',
            airline: 'Delta Air Lines',
            flightNumber: 'DL 1192',
            departureAirport: 'JFK',
            arrivalAirport: 'BOS',
            departureTime: `${tripEnd}T18:15:00Z`,
            arrivalTime: `${tripEnd}T19:40:00Z`,
            seat: '4D',
            status: 'confirmed'
          }
        ],
        hotel: {
          confirmationCode: 'MR-90214',
          hotelName: 'The Langham, New York, Fifth Avenue',
          address: '400 5th Ave, New York, NY 10018',
          checkInDate: tripStart,
          checkOutDate: tripEnd,
          roomType: 'Executive King Suite',
          status: 'confirmed'
        },
        dailySchedule: [
          {
            date: tripStart,
            events: [
              { time: '08:30 AM', description: 'Flight DL 428 departs BOS for JFK', type: 'flight', location: 'Boston Logan Terminal A' },
              { time: '11:30 AM', description: 'Check in at The Langham New York', type: 'hotel', location: '400 5th Ave' },
              { time: '02:00 PM', description: 'Opening Keynote & Partner Kickoff', type: 'meeting', location: 'Summit Ballroom' },
              { time: '07:00 PM', description: 'Executive Dinner with Alice Johnson (Acme Corp)', type: 'meal', location: 'Le Bernardin' }
            ]
          },
          {
            date: tripEnd,
            events: [
              { time: '10:00 AM', description: 'Enterprise Architecture Workshop', type: 'meeting', location: 'Executive Conference Room 4' },
              { time: '01:00 PM', description: 'Hotel Check-out & Uber to JFK', type: 'transport', location: 'Hotel Lobby' },
              { time: '06:15 PM', description: 'Flight DL 1192 departs JFK for BOS', type: 'flight', location: 'JFK Terminal 4' }
            ]
          }
        ],
        packingTips: [
          'Business formal attire for Board Dinner',
          'Laptop charger, USB-C adapter, and printed summit pass',
          'Umbrella (autumn weather in NYC)'
        ],
        status: 'upcoming'
      }
    };

    const initialDocuments: Record<string, CloudDocument> = {
      'doc_01': {
        id: 'doc_01',
        title: 'Master Services Agreement - Acme Corp 2026.pdf',
        mimeType: 'application/pdf',
        path: '/Legal/Contracts/Master Services Agreement - Acme Corp 2026.pdf',
        lastModified: now.toISOString(),
        owner: 'legal@example.com',
        tags: ['legal', 'contract', 'enterprise', 'acme'],
        contentSnippet: 'Standard Master Services Agreement governing software licenses, SLAs (99.9% uptime), and indemnification limits capped at 2x annual contract value ($500,000 USD).',
        summary: 'Enterprise software agreement with Acme Corp with standard SLAs and liability caps.'
      },
      'doc_02': {
        id: 'doc_02',
        title: 'Q4 Investor Pitch Deck & Board Review.pdf',
        mimeType: 'application/pdf',
        path: '/Executive/Presentations/Q4 Investor Pitch Deck & Board Review.pdf',
        lastModified: now.toISOString(),
        owner: 'adam@example.com',
        tags: ['board', 'investors', 'pitch', 'quarterly'],
        contentSnippet: 'Executive quarterly review summarizing ARR growth ($4.2M, +38% YoY), gross margins (82%), and net retention (124%).',
        summary: 'Q4 strategic board deck highlighting ARR growth and key commercial milestones.'
      },
      'doc_03': {
        id: 'doc_03',
        title: 'SOC-2 Type II Independent Audit Report.pdf',
        mimeType: 'application/pdf',
        path: '/Compliance/Security/SOC-2 Type II Independent Audit Report.pdf',
        lastModified: now.toISOString(),
        owner: 'security@example.com',
        tags: ['compliance', 'security', 'audit', 'soc2'],
        contentSnippet: 'Independent service auditor report verifying zero exceptions across Trust Services Criteria for Security, Availability, and Confidentiality.',
        summary: 'Clean SOC-2 Type II examination with zero security exceptions.'
      }
    };

    const initialScheduledJobs: Record<string, ScheduledJobConfig> = {
      'job_morning': {
        id: 'job_morning',
        name: 'Daily Morning Executive Kickoff',
        cronExpression: '0 7 * * *',
        routineType: 'morning_briefing',
        enabled: true,
        notifyChannels: ['email', 'telegram']
      },
      'job_evening': {
        id: 'job_evening',
        name: 'Daily Evening Wrap-Up & Rollover',
        cronExpression: '0 18 * * *',
        routineType: 'evening_wrapup',
        enabled: true,
        notifyChannels: ['email', 'telegram']
      },
      'job_weekly': {
        id: 'job_weekly',
        name: 'Weekly Executive & Spend Audit',
        cronExpression: '0 20 * * 0',
        routineType: 'weekly_audit',
        enabled: true,
        notifyChannels: ['email']
      }
    };

    const initialMemories: Record<string, MemoryFact> = {
      'mem_01': {
        id: 'mem_01',
        category: 'scheduling',
        fact: 'Protect Friday afternoons after 2:00 PM for deep focus work; avoid booking external calls during that window.',
        source: 'user',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      },
      'mem_02': {
        id: 'mem_02',
        category: 'travel',
        fact: 'Prefers aisle seats on Delta Air Lines (SkyMiles VIP) and direct morning flights out of BOS.',
        source: 'user',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      }
    };

    return {
      plans: {},
      conversations: [],
      preferences: UserPreferencesSchema.parse({}),
      tasks: initialTasks,
      contacts: initialContacts,
      expenses: initialExpenses,
      trips: initialTrips,
      dossiers: {},
      routines: {},
      voiceProfile: ExecutiveVoiceProfileSchema.parse({}),
      documents: initialDocuments,
      scheduledJobs: initialScheduledJobs,
      receipts: {},
      memories: initialMemories,
      oauthTokens: null,
      mobileApprovals: {},
      integrationConfig: {
        useMockGmail: true,
        useMockCalendar: true,
        aiProvider: 'mock'
      }
    };
  }

  private static decryptStateSecrets(parsed: AppState): AppState {
    const defaults = this.getDefaultState();
    const merged: AppState = {
      ...defaults,
      ...parsed,
      memories: parsed.memories || defaults.memories,
      oauthTokens: parsed.oauthTokens ?? null,
      integrationConfig: {
        ...defaults.integrationConfig,
        ...(parsed.integrationConfig || {})
      }
    };

    if (merged.integrationConfig) {
      merged.integrationConfig.geminiApiKey = CryptoVault.decrypt(merged.integrationConfig.geminiApiKey);
      merged.integrationConfig.openaiApiKey = CryptoVault.decrypt(merged.integrationConfig.openaiApiKey);
      merged.integrationConfig.telegramBotToken = CryptoVault.decrypt(merged.integrationConfig.telegramBotToken);
    }

    if (merged.oauthTokens) {
      merged.oauthTokens = {
        ...merged.oauthTokens,
        accessToken: CryptoVault.decrypt(merged.oauthTokens.accessToken) || '',
        refreshToken: CryptoVault.decrypt(merged.oauthTokens.refreshToken)
      };
    }

    return merged;
  }

  private static encryptStateForDisk(state: AppState): AppState {
    const clone: AppState = JSON.parse(JSON.stringify(state));

    if (clone.integrationConfig) {
      if (clone.integrationConfig.geminiApiKey) {
        clone.integrationConfig.geminiApiKey = CryptoVault.encrypt(clone.integrationConfig.geminiApiKey);
      }
      if (clone.integrationConfig.openaiApiKey) {
        clone.integrationConfig.openaiApiKey = CryptoVault.encrypt(clone.integrationConfig.openaiApiKey);
      }
      if (clone.integrationConfig.telegramBotToken) {
        clone.integrationConfig.telegramBotToken = CryptoVault.encrypt(clone.integrationConfig.telegramBotToken);
      }
    }

    if (clone.oauthTokens) {
      clone.oauthTokens = {
        ...clone.oauthTokens,
        accessToken: CryptoVault.encrypt(clone.oauthTokens.accessToken) || '',
        refreshToken: CryptoVault.encrypt(clone.oauthTokens.refreshToken)
      };
    }

    return clone;
  }

  public static initialize(): void {
    if (this.state) return;

    try {
      const dataDir = path.dirname(this.filePath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        this.state = this.decryptStateSecrets(JSON.parse(raw));
      } else {
        this.state = this.getDefaultState();
        this.save();
      }
    } catch {
      this.state = this.getDefaultState();
    }
  }

  private static save(): void {
    if (!this.state) return;
    try {
      const dataDir = path.dirname(this.filePath);
      if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
      const encryptedClone = this.encryptStateForDisk(this.state);
      const tmpPath = `${this.filePath}.tmp.${process.pid}.${Math.random().toString(36).slice(2, 8)}`;
      fs.writeFileSync(tmpPath, JSON.stringify(encryptedClone, null, 2), { encoding: 'utf-8', mode: 0o600 });
      fs.renameSync(tmpPath, this.filePath);
    } catch {
      // Fallback in memory
    }
  }

  // --- Plans ---
  public static savePlan(plan: TaskPlan): void {
    this.initialize();
    if (!this.state) return;
    this.state.plans[plan.id] = plan;
    this.save();
  }

  public static getPlan(id: string): TaskPlan | null {
    this.initialize();
    return this.state?.plans[id] || null;
  }

  public static listPlans(): TaskPlan[] {
    this.initialize();
    return Object.values(this.state?.plans || {}).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  // --- Conversations ---
  public static addMessage(role: 'user' | 'assistant', text: string, planId?: string): void {
    this.initialize();
    if (!this.state) return;
    this.state.conversations.push({
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      role,
      text,
      planId,
      timestamp: new Date().toISOString()
    });
    this.save();
  }

  public static getConversationHistory(): AppState['conversations'] {
    this.initialize();
    return this.state?.conversations || [];
  }

  // --- Preferences ---
  public static getPreferences(): UserPreferences {
    this.initialize();
    return this.state?.preferences || UserPreferencesSchema.parse({});
  }

  public static updatePreferences(updates: Partial<UserPreferences>): UserPreferences {
    this.initialize();
    if (!this.state) return UserPreferencesSchema.parse({});
    this.state.preferences = UserPreferencesSchema.parse({
      ...this.state.preferences,
      ...updates
    });
    this.save();
    return this.state.preferences;
  }

  // --- Config ---
  public static getIntegrationConfig(): AppState['integrationConfig'] {
    this.initialize();
    return this.state?.integrationConfig || { useMockGmail: true, aiProvider: 'mock' };
  }

  public static updateIntegrationConfig(updates: Partial<AppState['integrationConfig']>): void {
    this.initialize();
    if (!this.state) return;
    this.state.integrationConfig = {
      ...this.state.integrationConfig,
      ...updates
    };
    this.save();
  }

  // --- Tasks ---
  public static saveTask(task: TaskItem): void {
    this.initialize();
    if (!this.state) return;
    this.state.tasks[task.id] = task;
    this.save();
  }

  public static getTask(id: string): TaskItem | null {
    this.initialize();
    return this.state?.tasks[id] || null;
  }

  public static listTasks(): TaskItem[] {
    this.initialize();
    return Object.values(this.state?.tasks || {}).sort((a, b) => {
      // Sort priority high -> medium -> low, then by dueDate
      const pMap = { high: 0, medium: 1, low: 2 };
      const pDiff = (pMap[a.priority] || 1) - (pMap[b.priority] || 1);
      if (pDiff !== 0) return pDiff;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }

  public static deleteTask(id: string): boolean {
    this.initialize();
    if (!this.state || !this.state.tasks[id]) return false;
    delete this.state.tasks[id];
    this.save();
    return true;
  }

  // --- Contacts ---
  public static saveContact(contact: ContactItem): void {
    this.initialize();
    if (!this.state) return;
    this.state.contacts[contact.id] = contact;
    this.save();
  }

  public static getContact(id: string): ContactItem | null {
    this.initialize();
    return this.state?.contacts[id] || null;
  }

  public static listContacts(): ContactItem[] {
    this.initialize();
    return Object.values(this.state?.contacts || {}).sort((a, b) => 
      (b.isVIP ? 1 : 0) - (a.isVIP ? 1 : 0) || a.name.localeCompare(b.name)
    );
  }

  public static searchContacts(query: string): ContactItem[] {
    this.initialize();
    const q = query.toLowerCase();
    return this.listContacts().filter(c => 
      c.name.toLowerCase().includes(q) || 
      c.email.toLowerCase().includes(q) || 
      (c.company && c.company.toLowerCase().includes(q))
    );
  }

  // --- Expenses ---
  public static saveExpense(exp: ExpenseRecord): void {
    this.initialize();
    if (!this.state) return;
    this.state.expenses[exp.id] = exp;
    this.save();
  }

  public static listExpenses(): ExpenseRecord[] {
    this.initialize();
    return Object.values(this.state?.expenses || {}).sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }

  // --- Trips & Travel ---
  public static saveTrip(trip: TripItinerary): void {
    this.initialize();
    if (!this.state) return;
    this.state.trips[trip.id] = trip;
    this.save();
  }

  public static getTrip(id: string): TripItinerary | null {
    this.initialize();
    return this.state?.trips[id] || null;
  }

  public static listTrips(): TripItinerary[] {
    this.initialize();
    return Object.values(this.state?.trips || {}).sort((a, b) => 
      new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );
  }

  public static deleteTrip(id: string): boolean {
    this.initialize();
    if (!this.state || !this.state.trips[id]) return false;
    delete this.state.trips[id];
    this.save();
    return true;
  }

  // --- Meeting Dossiers ---
  public static saveMeetingDossier(dossier: MeetingDossier): void {
    this.initialize();
    if (!this.state) return;
    this.state.dossiers[dossier.meetingId] = dossier;
    this.save();
  }

  public static getMeetingDossier(meetingId: string): MeetingDossier | null {
    this.initialize();
    return this.state?.dossiers[meetingId] || null;
  }

  public static listMeetingDossiers(): MeetingDossier[] {
    this.initialize();
    return Object.values(this.state?.dossiers || {});
  }

  // --- Automation Routines ---
  public static saveRoutineResult(result: RoutineExecutionResult): void {
    this.initialize();
    if (!this.state) return;
    this.state.routines[result.id] = result;
    this.save();
  }

  public static listRoutineResults(): RoutineExecutionResult[] {
    this.initialize();
    return Object.values(this.state?.routines || {}).sort((a, b) => 
      new Date(b.executedAt).getTime() - new Date(a.executedAt).getTime()
    );
  }

  // --- Executive Voice Profile ---
  public static getVoiceProfile(): ExecutiveVoiceProfile {
    this.initialize();
    return this.state?.voiceProfile || ExecutiveVoiceProfileSchema.parse({});
  }

  public static saveVoiceProfile(profile: Partial<ExecutiveVoiceProfile>): ExecutiveVoiceProfile {
    this.initialize();
    if (!this.state) return ExecutiveVoiceProfileSchema.parse({});
    this.state.voiceProfile = {
      ...this.getVoiceProfile(),
      ...profile
    };
    this.save();
    return this.state.voiceProfile;
  }

  // --- Cloud Document Storage ---
  public static listDocuments(): CloudDocument[] {
    this.initialize();
    return Object.values(this.state?.documents || {}).sort((a, b) => 
      new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
    );
  }

  public static getDocument(id: string): CloudDocument | null {
    this.initialize();
    return this.state?.documents[id] || null;
  }

  public static saveDocument(doc: CloudDocument): void {
    this.initialize();
    if (!this.state) return;
    this.state.documents[doc.id] = doc;
    this.save();
  }

  public static searchDocuments(query: string): CloudDocument[] {
    this.initialize();
    const q = query.toLowerCase().trim();
    if (!q) return this.listDocuments();
    return this.listDocuments().filter(doc => 
      doc.title.toLowerCase().includes(q) ||
      doc.contentSnippet.toLowerCase().includes(q) ||
      doc.tags.some(t => t.toLowerCase().includes(q)) ||
      (doc.summary && doc.summary.toLowerCase().includes(q))
    );
  }

  // --- Scheduled Background Jobs ---
  public static listScheduledJobs(): ScheduledJobConfig[] {
    this.initialize();
    return Object.values(this.state?.scheduledJobs || {});
  }

  public static getScheduledJob(id: string): ScheduledJobConfig | null {
    this.initialize();
    return this.state?.scheduledJobs[id] || null;
  }

  public static saveScheduledJob(job: ScheduledJobConfig): void {
    this.initialize();
    if (!this.state) return;
    this.state.scheduledJobs[job.id] = job;
    this.save();
  }

  // --- Parsed Receipts & Invoices ---
  public static listReceipts(): ParsedReceipt[] {
    this.initialize();
    return Object.values(this.state?.receipts || {}).sort((a, b) => 
      new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime()
    );
  }

  public static getReceipt(id: string): ParsedReceipt | null {
    this.initialize();
    return this.state?.receipts[id] || null;
  }

  public static saveReceipt(receipt: ParsedReceipt): void {
    this.initialize();
    if (!this.state) return;
    this.state.receipts[receipt.receiptId] = receipt;
    this.save();
  }

  // --- Mobile Approvals ---
  public static createMobileApproval(planId: string, token: string): void {
    this.initialize();
    if (!this.state) return;
    this.state.mobileApprovals[token] = {
      planId,
      token,
      createdAt: new Date().toISOString(),
      status: 'pending'
    };
    this.save();
  }

  public static getMobileApproval(token: string): { planId: string; token: string; createdAt: string; status: 'pending' | 'approved' | 'rejected' } | null {
    this.initialize();
    return this.state?.mobileApprovals[token] || null;
  }

  public static resolveMobileApproval(token: string, approved: boolean): boolean {
    this.initialize();
    if (!this.state || !this.state.mobileApprovals[token]) return false;
    this.state.mobileApprovals[token].status = approved ? 'approved' : 'rejected';
    this.save();
    return true;
  }

  // --- OAuth Tokens (Encrypted at Rest) ---
  public static getOAuthTokens(): PersistedOAuthTokens | null {
    this.initialize();
    return this.state?.oauthTokens || null;
  }

  public static saveOAuthTokens(tokens: PersistedOAuthTokens): void {
    this.initialize();
    if (!this.state) return;
    this.state.oauthTokens = tokens;
    this.save();
  }

  public static clearOAuthTokens(): void {
    this.initialize();
    if (!this.state) return;
    this.state.oauthTokens = null;
    this.save();
  }

  // --- Long-Term Executive Memory ---
  public static listMemories(): MemoryFact[] {
    this.initialize();
    return Object.values(this.state?.memories || {}).sort((a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  public static saveMemory(memory: MemoryFact): void {
    this.initialize();
    if (!this.state) return;
    if (!this.state.memories) this.state.memories = {};
    this.state.memories[memory.id] = memory;
    this.save();
  }

  public static searchMemories(query: string, category?: string): MemoryFact[] {
    const q = query.toLowerCase().trim();
    return this.listMemories().filter(m => {
      if (category && m.category !== category) return false;
      if (!q) return true;
      return m.fact.toLowerCase().includes(q) || m.category.toLowerCase().includes(q);
    });
  }

  public static deleteMemory(id: string): boolean {
    this.initialize();
    if (!this.state?.memories?.[id]) return false;
    delete this.state.memories[id];
    this.save();
    return true;
  }

  public static reset(): void {
    this.state = this.getDefaultState();
    this.save();
  }
}
