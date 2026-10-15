'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, User, Send, ShieldCheck, ShieldAlert, CheckCircle2, 
  AlertTriangle, Clock, RefreshCw, Mail, Settings, 
  FileText, Play, XCircle, Eye, Lock,
  ChevronRight, Sparkles, Filter, Calendar as CalendarIcon,
  Folder, ListTodo, CheckSquare, Users, DollarSign, Sun, Star, Plus, Search,
  Briefcase, Plane, Hotel, FileCheck, Repeat,
  PenTool, FileSearch, Smartphone, Receipt, Radio,
  Mic, MicOff, Volume2, VolumeX
} from 'lucide-react';
import { 
  TaskPlan, AuditEvent, UserPreferences, TaskItem, ContactItem, ExpenseRecord, ExecutiveBriefing,
  MeetingDossier, TripItinerary, RoutineExecutionResult,
  ExecutiveVoiceProfile, CloudDocument, ScheduledJobConfig, ParsedReceipt, GhostwriteResult
} from '@/types';

export default function AssistantApp() {
  const [activeTab, setActiveTab] = useState<'chat' | 'briefing' | 'tasks' | 'contacts' | 'expenses' | 'dossiers' | 'travel' | 'routines' | 'voice' | 'documents' | 'scheduler' | 'omnichannel' | 'jobs' | 'calendar' | 'files' | 'history' | 'integrations' | 'audit' | 'preferences'>('chat');
  const [inputMessage, setInputMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Data states
  const [conversations, setConversations] = useState<Array<{ id: string; role: 'user' | 'assistant'; text: string; planId?: string; timestamp: string }>>([]);
  const [currentPlan, setCurrentPlan] = useState<TaskPlan | null>(null);
  const [allPlans, setAllPlans] = useState<TaskPlan[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [workspaceFiles, setWorkspaceFiles] = useState<{ baseDir: string; files: any[] }>({ baseDir: '', files: [] });
  const [backgroundJobs, setBackgroundJobs] = useState<any[]>([]);
  const [integrationConfig, setIntegrationConfig] = useState<{ useMockGmail: boolean; aiProvider: string; geminiApiKey?: string; openaiApiKey?: string }>({
    useMockGmail: true,
    aiProvider: 'mock'
  });

  // Executive VA states
  const [briefing, setBriefing] = useState<ExecutiveBriefing | null>(null);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [expenseSummary, setExpenseSummary] = useState<{ totalAmount: number; currency: string; byCategory: Record<string, number>; count: number } | null>(null);
  const [dossiers, setDossiers] = useState<MeetingDossier[]>([]);
  const [selectedDossier, setSelectedDossier] = useState<MeetingDossier | null>(null);
  const [trips, setTrips] = useState<TripItinerary[]>([]);
  const [routineHistory, setRoutineHistory] = useState<RoutineExecutionResult[]>([]);

  // Forms and filter states
  const [taskFilter, setTaskFilter] = useState<'all' | 'todo' | 'completed'>('all');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [contactSearchQuery, setContactSearchQuery] = useState('');
  const [newExpenseMerchant, setNewExpenseMerchant] = useState('');
  const [newExpenseAmount, setNewExpenseAmount] = useState('');
  const [newExpenseCategory, setNewExpenseCategory] = useState<'software' | 'travel' | 'meals' | 'office' | 'utilities' | 'financial' | 'other'>('software');
  const [notesMeetingTitle, setNotesMeetingTitle] = useState('');
  const [rawNotesContent, setRawNotesContent] = useState('');
  const [processedNotesResult, setProcessedNotesResult] = useState<any | null>(null);
  const [isProcessingNotes, setIsProcessingNotes] = useState(false);
  const [isRunningRoutine, setIsRunningRoutine] = useState<string | null>(null);

  // 100% Human EA Replacement feature states
  const [voiceProfile, setVoiceProfile] = useState<ExecutiveVoiceProfile | null>(null);
  const [ghostwriteRecipient, setGhostwriteRecipient] = useState('');
  const [ghostwriteSubject, setGhostwriteSubject] = useState('');
  const [ghostwriteContext, setGhostwriteContext] = useState('');
  const [ghostwriteInstructions, setGhostwriteInstructions] = useState('');
  const [ghostwriteResult, setGhostwriteResult] = useState<GhostwriteResult | null>(null);
  const [isGhostwriting, setIsGhostwriting] = useState(false);

  const [cloudDocuments, setCloudDocuments] = useState<CloudDocument[]>([]);
  const [documentSearchQuery, setDocumentSearchQuery] = useState('');
  const [summarizedDocResult, setSummarizedDocResult] = useState<any | null>(null);

  const [scheduledJobs, setScheduledJobs] = useState<ScheduledJobConfig[]>([]);
  const [isEvaluatingJobs, setIsEvaluatingJobs] = useState(false);

  const [parsedReceipts, setParsedReceipts] = useState<ParsedReceipt[]>([]);
  const [receiptRawInput, setReceiptRawInput] = useState('');
  const [latestParsedReceipt, setLatestParsedReceipt] = useState<ParsedReceipt | null>(null);
  const [isParsingReceipt, setIsParsingReceipt] = useState(false);

  const [omniChannel, setOmniChannel] = useState<'telegram' | 'whatsapp' | 'slack' | 'voice_note'>('telegram');
  const [omniInputText, setOmniInputText] = useState('');
  const [omniAudioPreset, setOmniAudioPreset] = useState('briefing_memo.wav');
  const [omniResponse, setOmniResponse] = useState<any | null>(null);
  const [isSendingOmni, setIsSendingOmni] = useState(false);

  const [pendingApprovalToken, setPendingApprovalToken] = useState('');
  const [approvalFeedback, setApprovalFeedback] = useState<string | null>(null);

  // Audio Voice & TTS states
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [audioRecordingError, setAudioRecordingError] = useState<string | null>(null);
  const [isSpeakingBriefing, setIsSpeakingBriefing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const speechSynthesisUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const toggleAudioRecording = async () => {
    if (isRecordingAudio) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      setIsRecordingAudio(false);
    } else {
      try {
        if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
          setAudioRecordingError('Microphone audio recording not supported in this browser.');
          return;
        }
        setAudioRecordingError(null);
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;
        audioChunksRef.current = [];

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };

        recorder.onstop = () => {
          stream.getTracks().forEach((track) => track.stop());
          if (!inputMessage.trim()) {
            setInputMessage('Voice Memo: Clean up old promotional emails and prepare daily briefing');
          }
        };

        recorder.start();
        setIsRecordingAudio(true);
      } catch (err: any) {
        setAudioRecordingError(err.message || 'Microphone access denied or unavailable.');
        setIsRecordingAudio(false);
      }
    }
  };

  const toggleSpeakBriefing = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }
    if (isSpeakingBriefing) {
      window.speechSynthesis.cancel();
      setIsSpeakingBriefing(false);
      return;
    }

    const textToSpeak = briefing?.summaryText || 
      `Good morning. You have ${briefing?.todaysMeetings?.length || 0} scheduled meetings today and ${briefing?.unreadUrgentEmails?.length || 0} urgent items requiring your review.`;

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.onend = () => setIsSpeakingBriefing(false);
    utterance.onerror = () => setIsSpeakingBriefing(false);

    speechSynthesisUtteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    setIsSpeakingBriefing(true);
  };

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Initial load
  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversations]);

  const fetchInitialData = async () => {
    try {
      // 1. Fetch conversations & plans
      const chatRes = await fetch('/api/assistant/chat');
      if (chatRes.ok) {
        const data = await chatRes.json();
        setConversations(data.messages || []);
        setAllPlans(data.plans || []);
        if (data.plans && data.plans.length > 0) {
          setCurrentPlan(data.plans[0]);
        }
      }

      // 2. Fetch preferences
      const prefRes = await fetch('/api/preferences');
      if (prefRes.ok) {
        const pData = await prefRes.json();
        setPreferences(pData.preferences);
      }

      // 3. Fetch integrations
      const intRes = await fetch('/api/integrations');
      if (intRes.ok) {
        const iData = await intRes.json();
        setIntegrationConfig(iData.config);
      }

      // 4. Fetch audit logs
      const auditRes = await fetch('/api/audit');
      if (auditRes.ok) {
        const aData = await auditRes.json();
        setAuditEvents(aData.events || []);
      }

      // 5. Fetch calendar events
      const calRes = await fetch('/api/calendar');
      if (calRes.ok) {
        const cData = await calRes.json();
        setCalendarEvents(cData.events || []);
      }

      // 6. Fetch workspace files
      const filesRes = await fetch('/api/files');
      if (filesRes.ok) {
        const fData = await filesRes.json();
        setWorkspaceFiles(fData);
      }

      // 7. Fetch background jobs
      const jobsRes = await fetch('/api/jobs');
      if (jobsRes.ok) {
        const jData = await jobsRes.json();
        setBackgroundJobs(jData.jobs || []);
      }

      // 8. Fetch executive briefing
      const briefRes = await fetch('/api/briefing');
      if (briefRes.ok) {
        const bData = await briefRes.json();
        setBriefing(bData.briefing);
      }

      // 9. Fetch tasks
      const tasksRes = await fetch('/api/tasks');
      if (tasksRes.ok) {
        const tData = await tasksRes.json();
        setTasks(tData.tasks || []);
      }

      // 10. Fetch contacts
      const contactsRes = await fetch('/api/contacts');
      if (contactsRes.ok) {
        const cData = await contactsRes.json();
        setContacts(cData.contacts || []);
      }

      // 11. Fetch expenses
      const expRes = await fetch('/api/expenses');
      if (expRes.ok) {
        const eData = await expRes.json();
        setExpenses(eData.expenses || []);
        setExpenseSummary(eData.summary || null);
      }

      // 12. Fetch meeting dossiers
      const dossierRes = await fetch('/api/meetings/dossier');
      if (dossierRes.ok) {
        const dData = await dossierRes.json();
        setDossiers(dData.dossiers || []);
        if (dData.dossiers && dData.dossiers.length > 0) {
          setSelectedDossier(dData.dossiers[0]);
        }
      }

      // 13. Fetch travel itineraries
      const travelRes = await fetch('/api/travel');
      if (travelRes.ok) {
        const trData = await travelRes.json();
        setTrips(trData.trips || []);
      }

      // 14. Fetch routine history
      const rtnRes = await fetch('/api/routines');
      if (rtnRes.ok) {
        const rData = await rtnRes.json();
        setRoutineHistory(rData.routines || []);
      }

      // 15. Fetch voice profile
      const voiceRes = await fetch('/api/ghostwriter');
      if (voiceRes.ok) {
        const vData = await voiceRes.json();
        setVoiceProfile(vData.profile);
      }

      // 16. Fetch cloud documents
      const docsRes = await fetch('/api/documents');
      if (docsRes.ok) {
        const dData = await docsRes.json();
        setCloudDocuments(dData.documents || []);
      }

      // 17. Fetch scheduled recurring jobs
      const schedRes = await fetch('/api/scheduler');
      if (schedRes.ok) {
        const sData = await schedRes.json();
        setScheduledJobs(sData.jobs || []);
      }

      // 18. Fetch receipts
      const rcptRes = await fetch('/api/receipts');
      if (rcptRes.ok) {
        const rData = await rcptRes.json();
        setParsedReceipts(rData.receipts || []);
      }
    } catch (err) {
      console.error('Failed to load initial data:', err);
    }
  };

  const handleUpdateVoiceProfile = async (updated: Partial<ExecutiveVoiceProfile>) => {
    try {
      const merged = { ...voiceProfile, ...updated };
      const res = await fetch('/api/ghostwriter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_profile', profile: merged })
      });
      if (res.ok) {
        const data = await res.json();
        setVoiceProfile(data.profile);
      }
    } catch (err) {
      console.error('Failed to update voice profile:', err);
    }
  };

  const handleGhostwrite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ghostwriteRecipient || !ghostwriteContext) return;
    setIsGhostwriting(true);
    try {
      const res = await fetch('/api/ghostwriter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: ghostwriteRecipient,
          subject: ghostwriteSubject || 'Follow up',
          inquiryContext: ghostwriteContext,
          executiveInstructions: ghostwriteInstructions
        })
      });
      if (res.ok) {
        const data = await res.json();
        setGhostwriteResult(data.result);
      }
    } catch (err) {
      console.error('Failed to ghostwrite reply:', err);
    } finally {
      setIsGhostwriting(false);
    }
  };

  const handleSearchDocuments = async (q: string) => {
    setDocumentSearchQuery(q);
    try {
      const res = await fetch(`/api/documents?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setCloudDocuments(data.documents || []);
      }
    } catch (err) {
      console.error('Failed to search documents:', err);
    }
  };

  const handleSummarizeDocument = async (idOrTitle: string) => {
    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'summarize', query: idOrTitle })
      });
      if (res.ok) {
        const data = await res.json();
        setSummarizedDocResult(data.summary);
      }
    } catch (err) {
      console.error('Failed to summarize document:', err);
    }
  };

  const handleToggleJob = async (id: string) => {
    try {
      const res = await fetch('/api/scheduler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle', id })
      });
      if (res.ok) {
        const data = await res.json();
        setScheduledJobs(prev => prev.map(j => j.id === id ? data.job : j));
      }
    } catch (err) {
      console.error('Failed to toggle job:', err);
    }
  };

  const handleTriggerJob = async (id: string) => {
    try {
      const res = await fetch('/api/scheduler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'trigger', id })
      });
      if (res.ok) {
        const data = await res.json();
        setScheduledJobs(prev => prev.map(j => j.id === id ? data.job : j));
        fetchInitialData();
      }
    } catch (err) {
      console.error('Failed to trigger job:', err);
    }
  };

  const handleEvaluateDueJobs = async () => {
    setIsEvaluatingJobs(true);
    try {
      const res = await fetch('/api/scheduler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'evaluate' })
      });
      if (res.ok) {
        fetchInitialData();
      }
    } catch (err) {
      console.error('Failed to evaluate jobs:', err);
    } finally {
      setIsEvaluatingJobs(false);
    }
  };

  const handleParseReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiptRawInput.trim()) return;
    setIsParsingReceipt(true);
    try {
      const res = await fetch('/api/receipts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText: receiptRawInput, sourceFileName: 'scanned_receipt.txt' })
      });
      if (res.ok) {
        const data = await res.json();
        setLatestParsedReceipt(data.receipt);
        setParsedReceipts(prev => [data.receipt, ...prev]);
        fetchInitialData();
      }
    } catch (err) {
      console.error('Failed to parse receipt:', err);
    } finally {
      setIsParsingReceipt(false);
    }
  };

  const handleSendOmnichannel = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSendingOmni(true);
    setApprovalFeedback(null);
    try {
      const payload: any = {
        channel: omniChannel,
        senderId: 'exec_mobile_user_01',
        text: omniInputText
      };
      if (omniChannel === 'voice_note' || !omniInputText) {
        payload.audioUrl = `https://storage.local/voice_notes/${omniAudioPreset}`;
      }

      const res = await fetch('/api/omnichannel/inbound', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        setOmniResponse(data.response);
        if (data.response?.approvalToken) {
          setPendingApprovalToken(data.response.approvalToken);
        }
        fetchInitialData();
      }
    } catch (err) {
      console.error('Failed to send omnichannel message:', err);
    } finally {
      setIsSendingOmni(false);
    }
  };

  const handleMobileApprovalDecision = async (token: string, approved: boolean) => {
    try {
      const res = await fetch('/api/approvals/mobile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, approved })
      });
      if (res.ok) {
        const data = await res.json();
        setApprovalFeedback(data.message);
        setPendingApprovalToken('');
        fetchInitialData();
      }
    } catch (err) {
      console.error('Failed to process mobile decision:', err);
    }
  };

  const handleToggleTask = async (id: string) => {
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle', id })
      });
      if (res.ok) {
        const data = await res.json();
        setTasks(prev => prev.map(t => t.id === id ? data.task : t));
      }
    } catch (err) {
      console.error('Failed to toggle task:', err);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTaskTitle.trim(),
          priority: newTaskPriority
        })
      });
      if (res.ok) {
        const data = await res.json();
        setTasks(prev => [data.task, ...prev]);
        setNewTaskTitle('');
      }
    } catch (err) {
      console.error('Failed to create task:', err);
    }
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpenseMerchant.trim() || !newExpenseAmount) return;
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchant: newExpenseMerchant.trim(),
          amount: parseFloat(newExpenseAmount),
          category: newExpenseCategory
        })
      });
      if (res.ok) {
        const data = await res.json();
        setExpenses(prev => [data.expense, ...prev]);
        setNewExpenseMerchant('');
        setNewExpenseAmount('');
        const expRes = await fetch('/api/expenses');
        if (expRes.ok) {
          const eData = await expRes.json();
          setExpenseSummary(eData.summary || null);
        }
      }
    } catch (err) {
      console.error('Failed to create expense:', err);
    }
  };

  const handleRefreshBriefing = async () => {
    try {
      const res = await fetch('/api/briefing');
      if (res.ok) {
        const data = await res.json();
        setBriefing(data.briefing);
      }
    } catch (err) {
      console.error('Failed to refresh briefing:', err);
    }
  };

  const handleProcessNotes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notesMeetingTitle.trim() || !rawNotesContent.trim()) return;
    setIsProcessingNotes(true);
    try {
      const res = await fetch('/api/meetings/dossier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'process_notes',
          meetingTitle: notesMeetingTitle.trim(),
          rawNotes: rawNotesContent.trim()
        })
      });
      if (res.ok) {
        const data = await res.json();
        setProcessedNotesResult(data.result);
        const tasksRes = await fetch('/api/tasks');
        if (tasksRes.ok) {
          const tData = await tasksRes.json();
          setTasks(tData.tasks || []);
        }
      }
    } catch (err) {
      console.error('Failed to process notes:', err);
    } finally {
      setIsProcessingNotes(false);
    }
  };

  const handleExtractTravel = async () => {
    try {
      const res = await fetch('/api/travel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'extract' })
      });
      if (res.ok) {
        const trRes = await fetch('/api/travel');
        if (trRes.ok) {
          const trData = await trRes.json();
          setTrips(trData.trips || []);
        }
      }
    } catch (err) {
      console.error('Failed to extract travel:', err);
    }
  };

  const handleTriggerRoutine = async (type: 'morning_briefing' | 'evening_wrapup' | 'weekly_audit') => {
    setIsRunningRoutine(type);
    try {
      const res = await fetch('/api/routines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ routineType: type })
      });
      if (res.ok) {
        const rtnRes = await fetch('/api/routines');
        if (rtnRes.ok) {
          const rData = await rtnRes.json();
          setRoutineHistory(rData.routines || []);
        }
        const bRes = await fetch('/api/briefing');
        if (bRes.ok) {
          const bData = await bRes.json();
          setBriefing(bData.briefing);
        }
        const tRes = await fetch('/api/tasks');
        if (tRes.ok) {
          const tData = await tRes.json();
          setTasks(tData.tasks || []);
        }
      }
    } catch (err) {
      console.error('Failed to trigger routine:', err);
    } finally {
      setIsRunningRoutine(null);
    }
  };

  const handlePrepareDossierForMeeting = async (meetingId: string) => {
    try {
      const res = await fetch(`/api/meetings/dossier?meetingId=${encodeURIComponent(meetingId)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.dossier) {
          setSelectedDossier(data.dossier);
          setDossiers(prev => {
            const idx = prev.findIndex(d => d.meetingId === meetingId);
            if (idx >= 0) {
              const copy = [...prev];
              copy[idx] = data.dossier;
              return copy;
            }
            return [data.dossier, ...prev];
          });
        }
      }
    } catch (err) {
      console.error('Failed to generate meeting dossier:', err);
    }
  };

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = customPrompt || inputMessage.trim();
    if (!textToSend || isSubmitting) return;

    setIsSubmitting(true);
    if (!customPrompt) setInputMessage('');

    // Optimistically update conversation
    setConversations(prev => [
      ...prev,
      { id: `temp_${Date.now()}`, role: 'user', text: textToSend, timestamp: new Date().toISOString() }
    ]);

    try {
      const res = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: textToSend })
      });

      if (res.ok) {
        const data = await res.json();
        setCurrentPlan(data.plan);
        setConversations(prev => [
          ...prev,
          { id: `resp_${Date.now()}`, role: 'assistant', text: data.assistantMessage, planId: data.plan?.id, timestamp: new Date().toISOString() }
        ]);
        fetchInitialData();
      } else {
        const errData = await res.json();
        setConversations(prev => [
          ...prev,
          { id: `err_${Date.now()}`, role: 'assistant', text: `Error: ${errData.error || 'Failed to process request.'}`, timestamp: new Date().toISOString() }
        ]);
      }
    } catch (err: any) {
      setConversations(prev => [
        ...prev,
        { id: `err_${Date.now()}`, role: 'assistant', text: `Connection error: ${err.message}`, timestamp: new Date().toISOString() }
      ]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprovalDecision = async (approved: boolean) => {
    if (!currentPlan) return;
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/assistant/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: currentPlan.id,
          approved
        })
      });

      if (res.ok) {
        const data = await res.json();
        setCurrentPlan(data.plan);
        setConversations(prev => [
          ...prev,
          { 
            id: `appr_${Date.now()}`, 
            role: 'assistant', 
            text: approved ? `Authorized execution completed: ${data.summary?.explanation}` : 'Action cancelled by user.',
            planId: data.plan?.id, 
            timestamp: new Date().toISOString() 
          }
        ]);
        fetchInitialData();
      }
    } catch (err) {
      console.error('Approval failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateConfig = async (newConfig: Partial<typeof integrationConfig>) => {
    try {
      const res = await fetch('/api/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig)
      });
      if (res.ok) {
        const data = await res.json();
        setIntegrationConfig(data.config);
      }
    } catch (err) {
      console.error('Failed to update config:', err);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'succeeded':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"><CheckCircle2 className="w-3.5 h-3.5" /> Succeeded</span>;
      case 'awaiting_approval':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 animate-pulse"><AlertTriangle className="w-3.5 h-3.5" /> Awaiting Approval</span>;
      case 'running':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Running</span>;
      case 'rejected':
      case 'cancelled':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"><XCircle className="w-3.5 h-3.5" /> Cancelled</span>;
      case 'failed':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"><XCircle className="w-3.5 h-3.5" /> Failed</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"><Clock className="w-3.5 h-3.5" /> Proposed</span>;
    }
  };

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case 'read':
        return <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">Read</span>;
      case 'reversible_write':
        return <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">Reversible Write</span>;
      case 'consequential':
        return <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-orange-50 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300 border border-orange-200 dark:border-orange-800">Consequential</span>;
      case 'high_risk':
        return <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800">High Risk</span>;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      {/* Top Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight">AI Virtual Assistant</h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Open-Source • Evidence-Driven • Self-Hostable</p>
          </div>
        </div>

        {/* Integration Status Badges */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-medium">
            <Mail className="w-3.5 h-3.5 text-red-500" />
            <span>Gmail: {integrationConfig.useMockGmail ? 'Mock Sandbox' : 'Live OAuth'}</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-medium">
            <CalendarIcon className="w-3.5 h-3.5 text-blue-500" />
            <span>Calendar</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-medium">
            <Folder className="w-3.5 h-3.5 text-amber-500" />
            <span>Files: Sandbox</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>AI: {integrationConfig.aiProvider.toUpperCase()}</span>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="flex items-center px-6 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 gap-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex items-center gap-2 px-3 py-2.5 text-xs font-semibold border-b-2 transition-colors shrink-0 ${
            activeTab === 'chat'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
          }`}
        >
          <Bot className="w-4 h-4" /> Chat & Task Execution
        </button>

        <button
          onClick={() => setActiveTab('briefing')}
          className={`flex items-center gap-2 px-3 py-2.5 text-xs font-semibold border-b-2 transition-colors shrink-0 ${
            activeTab === 'briefing'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
          }`}
        >
          <Sun className="w-4 h-4 text-amber-500" /> Morning Briefing
          {briefing?.todaysMeetings && briefing.todaysMeetings.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 text-[10px] font-bold">
              {briefing.todaysMeetings.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('tasks')}
          className={`flex items-center gap-2 px-3 py-2.5 text-xs font-semibold border-b-2 transition-colors shrink-0 ${
            activeTab === 'tasks'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
          }`}
        >
          <CheckSquare className="w-4 h-4 text-emerald-500" /> Tasks & To-Dos
          {tasks.filter(t => t.status === 'todo').length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-bold">
              {tasks.filter(t => t.status === 'todo').length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('contacts')}
          className={`flex items-center gap-2 px-3 py-2.5 text-xs font-semibold border-b-2 transition-colors shrink-0 ${
            activeTab === 'contacts'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
          }`}
        >
          <Users className="w-4 h-4 text-purple-500" /> VIP Contacts ({contacts.length})
        </button>

        <button
          onClick={() => setActiveTab('expenses')}
          className={`flex items-center gap-2 px-3 py-2.5 text-xs font-semibold border-b-2 transition-colors shrink-0 ${
            activeTab === 'expenses'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
          }`}
        >
          <DollarSign className="w-4 h-4 text-blue-500" /> Expenses (${expenseSummary?.totalAmount ? Math.round(expenseSummary.totalAmount) : 0})
        </button>

        <button
          onClick={() => setActiveTab('dossiers')}
          className={`flex items-center gap-2 px-3 py-2.5 text-xs font-semibold border-b-2 transition-colors shrink-0 ${
            activeTab === 'dossiers'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
          }`}
        >
          <Briefcase className="w-4 h-4 text-rose-500" /> Meeting Dossiers & Notes
        </button>

        <button
          onClick={() => setActiveTab('travel')}
          className={`flex items-center gap-2 px-3 py-2.5 text-xs font-semibold border-b-2 transition-colors shrink-0 ${
            activeTab === 'travel'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
          }`}
        >
          <Plane className="w-4 h-4 text-sky-500" /> Travel & Itineraries ({trips.length})
        </button>

        <button
          onClick={() => setActiveTab('routines')}
          className={`flex items-center gap-2 px-3 py-2.5 text-xs font-semibold border-b-2 transition-colors shrink-0 ${
            activeTab === 'routines'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
          }`}
        >
          <Repeat className="w-4 h-4 text-amber-500" /> Routines & Automations
        </button>

        <button
          onClick={() => setActiveTab('voice')}
          className={`flex items-center gap-2 px-3 py-2.5 text-xs font-semibold border-b-2 transition-colors shrink-0 ${
            activeTab === 'voice'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
          }`}
        >
          <PenTool className="w-4 h-4 text-pink-500" /> Executive Voice & Ghostwriter
        </button>

        <button
          onClick={() => setActiveTab('documents')}
          className={`flex items-center gap-2 px-3 py-2.5 text-xs font-semibold border-b-2 transition-colors shrink-0 ${
            activeTab === 'documents'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
          }`}
        >
          <FileSearch className="w-4 h-4 text-cyan-500" /> Cloud Documents & Drive ({cloudDocuments.length})
        </button>

        <button
          onClick={() => setActiveTab('scheduler')}
          className={`flex items-center gap-2 px-3 py-2.5 text-xs font-semibold border-b-2 transition-colors shrink-0 ${
            activeTab === 'scheduler'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
          }`}
        >
          <Radio className="w-4 h-4 text-orange-500" /> Daemon & Cron Scheduler ({scheduledJobs.length})
        </button>

        <button
          onClick={() => setActiveTab('omnichannel')}
          className={`flex items-center gap-2 px-3 py-2.5 text-xs font-semibold border-b-2 transition-colors shrink-0 ${
            activeTab === 'omnichannel'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
          }`}
        >
          <Smartphone className="w-4 h-4 text-indigo-500" /> Omnichannel & Approvals
          {pendingApprovalToken && (
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('jobs')}
          className={`flex items-center gap-2 px-3 py-2.5 text-xs font-semibold border-b-2 transition-colors shrink-0 ${
            activeTab === 'jobs'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
          }`}
        >
          <ListTodo className="w-4 h-4" /> Background Jobs ({backgroundJobs.length})
        </button>

        <button
          onClick={() => setActiveTab('calendar')}
          className={`flex items-center gap-2 px-3 py-2.5 text-xs font-semibold border-b-2 transition-colors shrink-0 ${
            activeTab === 'calendar'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
          }`}
        >
          <CalendarIcon className="w-4 h-4" /> Calendar ({calendarEvents.length})
        </button>

        <button
          onClick={() => setActiveTab('files')}
          className={`flex items-center gap-2 px-3 py-2.5 text-xs font-semibold border-b-2 transition-colors shrink-0 ${
            activeTab === 'files'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
          }`}
        >
          <Folder className="w-4 h-4" /> Sandboxed Files ({workspaceFiles.files?.length || 0})
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-3 py-2.5 text-xs font-semibold border-b-2 transition-colors shrink-0 ${
            activeTab === 'history'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
          }`}
        >
          <Clock className="w-4 h-4" /> Task History ({allPlans.length})
        </button>

        <button
          onClick={() => setActiveTab('integrations')}
          className={`flex items-center gap-2 px-3 py-2.5 text-xs font-semibold border-b-2 transition-colors shrink-0 ${
            activeTab === 'integrations'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
          }`}
        >
          <Settings className="w-4 h-4" /> Integrations & BYOK
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-2 px-3 py-2.5 text-xs font-semibold border-b-2 transition-colors shrink-0 ${
            activeTab === 'audit'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
          }`}
        >
          <ShieldCheck className="w-4 h-4" /> Security & Audit ({auditEvents.length})
        </button>

        <button
          onClick={() => setActiveTab('preferences')}
          className={`flex items-center gap-2 px-3 py-2.5 text-xs font-semibold border-b-2 transition-colors shrink-0 ${
            activeTab === 'preferences'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
          }`}
        >
          <Filter className="w-4 h-4" /> Protection Policies
        </button>
      </div>

      {/* Main Workspace Area */}
      <main className="flex-1 overflow-hidden">
        {activeTab === 'chat' && (
          <div className="grid grid-cols-12 h-full">
            {/* Conversation Stream (Left 6 cols) */}
            <div className="col-span-12 lg:col-span-6 flex flex-col h-full border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              {/* Quick Actions Bar */}
              <div className="p-3 border-b border-zinc-100 dark:border-zinc-800/60 bg-zinc-50/50 dark:bg-zinc-900/50 flex flex-wrap gap-2">
                <button
                  onClick={() => handleSendMessage('Give me my morning briefing')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-2xs hover:bg-zinc-50 dark:hover:bg-zinc-700 transition"
                >
                  <Sun className="w-3.5 h-3.5 text-amber-500" />
                  Morning Briefing
                </button>
                <button
                  onClick={() => handleSendMessage('Triage my inbox for action items, follow-ups, and records')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-2xs hover:bg-zinc-50 dark:hover:bg-zinc-700 transition"
                >
                  <Mail className="w-3.5 h-3.5 text-indigo-600" />
                  Triage Inbox
                </button>
                <button
                  onClick={() => handleSendMessage('Find 45min open tomorrow for a meeting')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-2xs hover:bg-zinc-50 dark:hover:bg-zinc-700 transition"
                >
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                  Find Meeting Slots
                </button>
                <button
                  onClick={() => handleSendMessage('Summarize recent expenses and receipts')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-2xs hover:bg-zinc-50 dark:hover:bg-zinc-700 transition"
                >
                  <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                  Summarize Expenses
                </button>
                <button
                  onClick={() => handleSendMessage('Find emails older than five years that I no longer need and clean them up.')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-2xs hover:bg-zinc-50 dark:hover:bg-zinc-700 transition"
                >
                  <Lock className="w-3.5 h-3.5 text-rose-500" />
                  Clean Old Emails
                </button>
                <button
                  onClick={() => handleSendMessage('List files in safe workspace')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-2xs hover:bg-zinc-50 dark:hover:bg-zinc-700 transition"
                >
                  <Folder className="w-3.5 h-3.5 text-amber-600" />
                  List Files
                </button>
                <button
                  onClick={() => handleSendMessage('Prepare briefing dossier for my next meeting')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-2xs hover:bg-zinc-50 dark:hover:bg-zinc-700 transition"
                >
                  <Briefcase className="w-3.5 h-3.5 text-rose-500" />
                  Prep Meeting Dossier
                </button>
                <button
                  onClick={() => handleSendMessage('Scan my inbox for flight and hotel reservations')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-2xs hover:bg-zinc-50 dark:hover:bg-zinc-700 transition"
                >
                  <Plane className="w-3.5 h-3.5 text-sky-500" />
                  Scan Travel Bookings
                </button>
                <button
                  onClick={() => handleSendMessage('Run evening wrap-up routine')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-2xs hover:bg-zinc-50 dark:hover:bg-zinc-700 transition"
                >
                  <Repeat className="w-3.5 h-3.5 text-amber-500" />
                  Evening Wrap-Up
                </button>
              </div>

              {/* Chat Message List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {conversations.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-400">
                    <Bot className="w-12 h-12 text-zinc-300 dark:text-zinc-600 mb-3" />
                    <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Ready to assist</h3>
                    <p className="text-xs max-w-sm mt-1">
                      Ask me to inspect, organize, or clean up your emails with safe previews and explicit human authorization gates.
                    </p>
                  </div>
                ) : (
                  conversations.map(msg => (
                    <div
                      key={msg.id}
                      className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {msg.role === 'assistant' && (
                        <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                          <Bot className="w-4 h-4" />
                        </div>
                      )}
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                          msg.role === 'user'
                            ? 'bg-indigo-600 text-white rounded-br-xs'
                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-bl-xs border border-zinc-200/50 dark:border-zinc-700/50'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                        <span className="block text-[10px] mt-1.5 opacity-60">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      {msg.role === 'user' && (
                        <div className="w-7 h-7 rounded-lg bg-zinc-800 dark:bg-zinc-700 text-white flex items-center justify-center shrink-0 mt-0.5">
                          <User className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  ))
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input */}
              <div className="p-3 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                {isRecordingAudio && (
                  <div className="mb-2 p-2 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 flex items-center justify-between text-xs text-rose-700 dark:text-rose-300">
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping" />
                      Listening &amp; recording audio voice memo...
                    </span>
                    <button
                      type="button"
                      onClick={toggleAudioRecording}
                      className="text-[11px] underline font-bold"
                    >
                      Finish Memo
                    </button>
                  </div>
                )}
                {audioRecordingError && (
                  <div className="mb-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-700 dark:text-amber-300 flex justify-between">
                    <span>{audioRecordingError}</span>
                    <button onClick={() => setAudioRecordingError(null)} className="underline font-bold">Dismiss</button>
                  </div>
                )}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Enter instructions (e.g., Clean up emails older than 5 years)..."
                    disabled={isSubmitting}
                    className="flex-1 text-xs px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={toggleAudioRecording}
                    className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition ${
                      isRecordingAudio
                        ? 'bg-rose-600 text-white border-rose-600 animate-pulse'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                    }`}
                    title={isRecordingAudio ? 'Stop Recording' : 'Record Voice Memo'}
                  >
                    {isRecordingAudio ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !inputMessage.trim()}
                    className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-xs"
                  >
                    {isSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    <span>Run</span>
                  </button>
                </form>
              </div>
            </div>

            {/* Task Plan & Verification Inspector (Right 6 cols) */}
            <div className="col-span-12 lg:col-span-6 flex flex-col h-full bg-zinc-50 dark:bg-zinc-950 overflow-y-auto p-6 space-y-6">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-sm font-bold flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    Structured Execution Plan
                  </h2>
                  {currentPlan && getStatusBadge(currentPlan.status)}
                </div>
                <p className="text-xs text-zinc-500">
                  Inspectable multi-step plan separating conversational proposal from verified backend execution.
                </p>
              </div>

              {!currentPlan ? (
                <div className="border-2 border-dashed border-zinc-300 dark:border-zinc-800 rounded-2xl p-8 text-center text-zinc-400">
                  <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-xs font-medium">No active execution plan</p>
                  <p className="text-[11px] mt-1">Submit a request to generate an inspectable action plan.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Summary Card */}
                  <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs">
                    <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Plan Summary</div>
                    <p className="text-xs font-medium leading-relaxed">{currentPlan.summary}</p>
                    <div className="mt-3 flex items-center gap-4 text-[11px] text-zinc-400 border-t border-zinc-100 dark:border-zinc-800 pt-2">
                      <span>Plan ID: <code className="text-indigo-600 dark:text-indigo-400">{currentPlan.id}</code></span>
                      <span>Actions: {currentPlan.actions.length}</span>
                    </div>
                  </div>

                  {/* Affected Resource Preview Card */}
                  {currentPlan.affectedResourcePreview && (
                    <div className="p-4 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900 dark:text-indigo-200">
                          <Eye className="w-4 h-4" />
                          <span>Affected Resource Preview</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-200 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200">
                          {currentPlan.affectedResourcePreview.count} Items Affected
                        </span>
                      </div>
                      <p className="text-xs text-indigo-800 dark:text-indigo-300 mb-3">
                        {currentPlan.affectedResourcePreview.description}
                      </p>

                      {currentPlan.affectedResourcePreview.sampleItems.length > 0 && (
                        <div className="space-y-1.5 border-t border-indigo-200/50 dark:border-indigo-800/40 pt-2.5">
                          <div className="text-[11px] font-semibold text-indigo-900 dark:text-indigo-200">Sample Qualifying Messages:</div>
                          {currentPlan.affectedResourcePreview.sampleItems.map((item, idx) => (
                            <div key={idx} className="text-[11px] font-mono bg-white/80 dark:bg-zinc-900/80 px-2.5 py-1.5 rounded-lg border border-indigo-100 dark:border-indigo-900/60 truncate">
                              {item}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Human Confirmation Gate Banner */}
                  {currentPlan.status === 'awaiting_approval' && (
                    <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-700 shadow-xs">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200">Explicit Authorization Required</h4>
                          <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
                            {currentPlan.confirmationPrompt || 'This action modifies email state and requires your confirmation before proceeding.'}
                          </p>

                          <div className="mt-3 flex items-center gap-2">
                            <button
                              onClick={() => handleApprovalDecision(true)}
                              disabled={isSubmitting}
                              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
                            >
                              <Play className="w-3.5 h-3.5" /> Authorize & Move to Trash
                            </button>
                            <button
                              onClick={() => handleApprovalDecision(false)}
                              disabled={isSubmitting}
                              className="px-4 py-2 rounded-lg bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-semibold transition"
                            >
                              Decline / Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Steps List */}
                  <div className="space-y-3">
                    <div className="text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                      Execution Steps ({currentPlan.actions.length})
                    </div>

                    {currentPlan.actions.map((action, idx) => (
                      <div
                        key={action.id}
                        className="p-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-[11px] font-bold flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <span className="text-xs font-bold font-mono text-zinc-800 dark:text-zinc-200">
                              {action.toolName}
                            </span>
                            {getRiskBadge(action.riskLevel)}
                          </div>
                          {getStatusBadge(action.status)}
                        </div>

                        <p className="text-xs text-zinc-600 dark:text-zinc-400 pl-7">
                          {action.expectedOutcome}
                        </p>

                        {/* Verification Status */}
                        <div className="pl-7 pt-1 flex items-center gap-3 text-[11px]">
                          <span className="text-zinc-400">Target: <code className="text-zinc-600 dark:text-zinc-300">{action.targetResource}</code></span>
                          {action.verificationStatus === 'verified' && (
                            <span className="text-emerald-600 font-semibold flex items-center gap-1">
                              <ShieldCheck className="w-3.5 h-3.5" /> Verified on Provider
                            </span>
                          )}
                          {action.verificationStatus === 'failed' && (
                            <span className="text-rose-600 font-semibold flex items-center gap-1">
                              <ShieldAlert className="w-3.5 h-3.5" /> Verification Failed
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Executive Morning Briefing Tab */}
        {activeTab === 'briefing' && (
          <div className="p-8 max-w-5xl mx-auto space-y-6 overflow-y-auto h-full">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center">
                  <Sun className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Executive Daily Briefing</h2>
                  <p className="text-xs text-zinc-500">{briefing?.date || new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleSpeakBriefing}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-2xs transition ${
                    isSpeakingBriefing
                      ? 'bg-rose-600 text-white hover:bg-rose-700 animate-pulse'
                      : 'bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700'
                  }`}
                  title={isSpeakingBriefing ? 'Stop reading aloud' : 'Read morning briefing aloud using text-to-speech'}
                >
                  {isSpeakingBriefing ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-indigo-600" />}
                  <span>{isSpeakingBriefing ? 'Stop Audio' : 'Listen to Briefing'}</span>
                </button>
                <button
                  onClick={handleRefreshBriefing}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-2xs hover:bg-zinc-50 dark:hover:bg-zinc-700 transition"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-zinc-500" /> Refresh Briefing
                </button>
                <button
                  onClick={() => {
                    setActiveTab('chat');
                    handleSendMessage('Triage my inbox for action items, follow-ups, and records');
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white shadow-xs hover:bg-indigo-700 transition"
                >
                  <Mail className="w-3.5 h-3.5" /> Triage Inbox
                </button>
              </div>
            </div>

            {/* Hero Summary Card */}
            {briefing?.summaryText && (
              <div className="p-5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 shadow-2xs">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">Assistant Daily Overview</h3>
                    <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 mt-1 leading-relaxed">{briefing.summaryText}</p>
                  </div>
                </div>
              </div>
            )}

            {/* KPI Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs">
                <span className="text-[11px] font-medium text-zinc-500">Today&apos;s Schedule</span>
                <div className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mt-1 flex items-baseline gap-1">
                  {briefing?.todaysMeetings?.length || 0}
                  <span className="text-xs font-normal text-zinc-400">events</span>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs">
                <span className="text-[11px] font-medium text-zinc-500">Urgent Inquiries</span>
                <div className="text-xl font-bold text-amber-600 mt-1 flex items-baseline gap-1">
                  {briefing?.unreadUrgentEmails?.length || 0}
                  <span className="text-xs font-normal text-zinc-400">emails</span>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs">
                <span className="text-[11px] font-medium text-zinc-500">Tasks Due</span>
                <div className="text-xl font-bold text-indigo-600 mt-1 flex items-baseline gap-1">
                  {briefing?.dueTasks?.length || 0}
                  <span className="text-xs font-normal text-zinc-400">items</span>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs">
                <span className="text-[11px] font-medium text-zinc-500">Stalled Follow-Ups</span>
                <div className="text-xl font-bold text-purple-600 mt-1 flex items-baseline gap-1">
                  {briefing?.pendingFollowUps?.length || 0}
                  <span className="text-xs font-normal text-zinc-400">contacts</span>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs">
                <span className="text-[11px] font-medium text-zinc-500">Recent Spend</span>
                <div className="text-xl font-bold text-emerald-600 mt-1 flex items-baseline gap-1">
                  ${briefing?.recentExpenses?.totalAmount ? Math.round(briefing.recentExpenses.totalAmount) : 0}
                  <span className="text-xs font-normal text-zinc-400">USD</span>
                </div>
              </div>
            </div>

            {/* Split Content: Schedule & Follow-ups on Left, Urgent Inbox & Tasks on Right */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-6">
                {/* Today's Schedule Card */}
                <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4 text-blue-500" />
                      Today&apos;s Meetings &amp; Commitments
                    </h3>
                    <button
                      onClick={() => setActiveTab('calendar')}
                      className="text-xs text-indigo-600 hover:underline flex items-center gap-1"
                    >
                      View Calendar <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                  {(!briefing?.todaysMeetings || briefing.todaysMeetings.length === 0) ? (
                    <div className="p-6 text-center rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-dashed border-zinc-200 dark:border-zinc-700">
                      <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1" />
                      <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Calendar clear today</p>
                      <p className="text-[11px] text-zinc-400">Ideal for deep focus and high-priority strategic projects.</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {briefing.todaysMeetings.map(m => (
                        <div key={m.id} className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
                          <div>
                            <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">{m.summary}</span>
                            <div className="text-[11px] text-zinc-500 flex items-center gap-2 mt-0.5">
                              <span>⏰ {m.time}</span>
                              {m.location && <span>📍 {m.location}</span>}
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                            Confirmed
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Stalled Follow-ups Card */}
                <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold flex items-center gap-2">
                      <Users className="w-4 h-4 text-purple-500" />
                      Stalled Relationship Follow-ups
                    </h3>
                    <button
                      onClick={() => setActiveTab('contacts')}
                      className="text-xs text-indigo-600 hover:underline flex items-center gap-1"
                    >
                      All Contacts <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                  {(!briefing?.pendingFollowUps || briefing.pendingFollowUps.length === 0) ? (
                    <div className="p-6 text-center rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-dashed border-zinc-200 dark:border-zinc-700">
                      <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1" />
                      <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">All VIP cadences up to date</p>
                      <p className="text-[11px] text-zinc-400">No client or partner relationships require urgent outreach today.</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {briefing.pendingFollowUps.map((f, idx) => (
                        <div key={idx} className="p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{f.to}</span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                              {f.sentDaysAgo}d overdue
                            </span>
                          </div>
                          <p className="text-xs text-zinc-600 dark:text-zinc-400">{f.subject}</p>
                          <button
                            onClick={() => {
                              setActiveTab('chat');
                              handleSendMessage(`Draft a polite follow-up email to ${f.to}`);
                            }}
                            className="text-[11px] text-indigo-600 font-semibold hover:underline"
                          >
                            Draft follow-up email &rarr;
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                {/* Urgent Emails Card */}
                <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold flex items-center gap-2">
                      <Mail className="w-4 h-4 text-red-500" />
                      Action-Required Emails
                    </h3>
                    <button
                      onClick={() => {
                        setActiveTab('chat');
                        handleSendMessage('Triage my inbox for action items');
                      }}
                      className="text-xs text-indigo-600 hover:underline flex items-center gap-1"
                    >
                      Triage All <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                  {(!briefing?.unreadUrgentEmails || briefing.unreadUrgentEmails.length === 0) ? (
                    <div className="p-6 text-center rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-dashed border-zinc-200 dark:border-zinc-700">
                      <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1" />
                      <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Inbox zero for urgent items</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {briefing.unreadUrgentEmails.map(em => (
                        <div key={em.id} className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">{em.from}</span>
                            <button
                              onClick={() => {
                                setActiveTab('chat');
                                handleSendMessage(`Draft a reply to ${em.from} regarding "${em.subject}"`);
                              }}
                              className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 hover:bg-indigo-100"
                            >
                              Draft Reply
                            </button>
                          </div>
                          <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{em.subject}</p>
                          <p className="text-[11px] text-zinc-500 truncate">{em.snippet}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Priority Action Items / Tasks Card */}
                <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold flex items-center gap-2">
                      <CheckSquare className="w-4 h-4 text-emerald-500" />
                      Priority Action Items
                    </h3>
                    <button
                      onClick={() => setActiveTab('tasks')}
                      className="text-xs text-indigo-600 hover:underline flex items-center gap-1"
                    >
                      Task Board <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                  {(!briefing?.dueTasks || briefing.dueTasks.length === 0) ? (
                    <div className="p-6 text-center rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-dashed border-zinc-200 dark:border-zinc-700">
                      <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1" />
                      <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">All tasks completed</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {briefing.dueTasks.map(t => (
                        <div key={t.id} className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <input
                              type="checkbox"
                              checked={t.status === 'completed'}
                              onChange={() => handleToggleTask(t.id)}
                              className="w-4 h-4 rounded text-indigo-600 cursor-pointer"
                            />
                            <div className="min-w-0">
                              <span className={`text-xs font-medium block truncate ${t.status === 'completed' ? 'line-through text-zinc-400' : 'text-zinc-800 dark:text-zinc-200'}`}>
                                {t.title}
                              </span>
                              {t.dueDate && <span className="text-[10px] text-zinc-400">Due: {t.dueDate}</span>}
                            </div>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase shrink-0 ${
                            t.priority === 'high' ? 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300' :
                            t.priority === 'medium' ? 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300' :
                            'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                          }`}>
                            {t.priority}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tasks & To-Dos Management Tab */}
        {activeTab === 'tasks' && (
          <div className="p-8 max-w-4xl mx-auto space-y-6 overflow-y-auto h-full">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">Executive Tasks & Action Items</h2>
                <p className="text-xs text-zinc-500">Track and prioritize responsibilities delegated to or managed by your assistant.</p>
              </div>
              <div className="flex items-center gap-1.5 p-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-xs">
                {(['all', 'todo', 'completed'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setTaskFilter(f)}
                    className={`px-3 py-1 rounded-md capitalize font-semibold transition ${
                      taskFilter === f
                        ? 'bg-white dark:bg-zinc-700 shadow-2xs text-zinc-900 dark:text-zinc-100'
                        : 'text-zinc-500 hover:text-zinc-800'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Add Task Form */}
            <form onSubmit={handleCreateTask} className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs flex gap-3 items-center">
              <input
                type="text"
                placeholder="Add a new action item or executive task..."
                value={newTaskTitle}
                onChange={e => setNewTaskTitle(e.target.value)}
                className="flex-1 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
              <select
                value={newTaskPriority}
                onChange={e => setNewTaskPriority(e.target.value as any)}
                className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs font-medium"
              >
                <option value="high">High Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="low">Low Priority</option>
              </select>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white shadow-xs hover:bg-indigo-700 transition"
              >
                <Plus className="w-3.5 h-3.5" /> Add Task
              </button>
            </form>

            {/* Task Checklist */}
            <div className="space-y-2.5">
              {tasks.filter(t => taskFilter === 'all' ? true : t.status === taskFilter).length === 0 ? (
                <div className="p-12 text-center rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50">
                  <CheckSquare className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
                  <p className="text-xs text-zinc-500 font-medium">No tasks found in this view.</p>
                </div>
              ) : (
                tasks
                  .filter(t => taskFilter === 'all' ? true : t.status === taskFilter)
                  .map(task => (
                    <div
                      key={task.id}
                      className={`p-4 rounded-xl border transition shadow-2xs flex items-center justify-between gap-4 ${
                        task.status === 'completed'
                          ? 'bg-zinc-50 dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800 opacity-60'
                          : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <input
                          type="checkbox"
                          checked={task.status === 'completed'}
                          onChange={() => handleToggleTask(task.id)}
                          className="w-4 h-4 rounded text-indigo-600 cursor-pointer"
                        />
                        <div className="min-w-0">
                          <span className={`text-xs font-semibold block ${task.status === 'completed' ? 'line-through text-zinc-400' : 'text-zinc-900 dark:text-zinc-100'}`}>
                            {task.title}
                          </span>
                          {task.description && (
                            <p className="text-[11px] text-zinc-500 mt-0.5">{task.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1 text-[10px] text-zinc-400">
                            <span>Source: <strong className="capitalize">{task.source}</strong></span>
                            {task.dueDate && <span>• Due: {task.dueDate}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                          task.priority === 'high' ? 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300' :
                          task.priority === 'medium' ? 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300' :
                          'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                        }`}>
                          {task.priority}
                        </span>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        )}

        {/* VIP Contacts & Relationship CRM Tab */}
        {activeTab === 'contacts' && (
          <div className="p-8 max-w-5xl mx-auto space-y-6 overflow-y-auto h-full">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">VIP Contacts & Relationship Follow-Up CRM</h2>
                <p className="text-xs text-zinc-500">Track executive relationships, communication cadence, and preferences.</p>
              </div>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search contacts by name, company, email..."
                  value={contactSearchQuery}
                  onChange={e => setContactSearchQuery(e.target.value)}
                  className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl pl-9 pr-4 py-1.5 text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500 w-64 shadow-2xs"
                />
              </div>
            </div>

            {/* Contacts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {contacts
                .filter(c => {
                  if (!contactSearchQuery) return true;
                  const q = contactSearchQuery.toLowerCase();
                  return c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || (c.company && c.company.toLowerCase().includes(q));
                })
                .map(c => {
                  const daysAgo = c.lastContactedAt 
                    ? Math.floor((Date.now() - new Date(c.lastContactedAt).getTime()) / (1000 * 60 * 60 * 24))
                    : 0;
                  const isOverdue = daysAgo >= c.followUpCadenceDays;

                  return (
                    <div key={c.id} className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs flex flex-col justify-between space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{c.name}</h3>
                              {c.isVIP && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[10px] font-bold">
                                  <Star className="w-3 h-3 fill-amber-500 text-amber-500" /> VIP
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-zinc-500">{c.role} {c.company ? `• ${c.company}` : ''}</p>
                          </div>
                        </div>

                        <div className="text-xs font-mono text-zinc-600 dark:text-zinc-400">
                          {c.email}
                        </div>

                        {/* Cadence Status */}
                        <div className="pt-1">
                          <div className={`p-2 rounded-lg text-[11px] ${
                            isOverdue 
                              ? 'bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                              : 'bg-zinc-50 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                          }`}>
                            <div className="font-semibold">
                              {isOverdue ? `⚠️ Cadence Overdue: Last contacted ${daysAgo}d ago` : `Cadence: every ${c.followUpCadenceDays} days (contacted ${daysAgo}d ago)`}
                            </div>
                          </div>
                        </div>

                        {/* Notes */}
                        {c.notes && c.notes.length > 0 && (
                          <div className="space-y-1 pt-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Key Context Notes:</span>
                            <ul className="text-xs text-zinc-600 dark:text-zinc-400 space-y-1 list-disc list-inside">
                              {c.notes.map((note, idx) => (
                                <li key={idx} className="text-[11px] leading-relaxed">{note}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => {
                          setActiveTab('chat');
                          handleSendMessage(`Draft a follow-up email to ${c.name} (${c.email})`);
                        }}
                        className="w-full py-1.5 px-3 rounded-xl text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 transition"
                      >
                        Draft Follow-Up Email
                      </button>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Expenses & Financial Records Tab */}
        {activeTab === 'expenses' && (
          <div className="p-8 max-w-5xl mx-auto space-y-6 overflow-y-auto h-full">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">Expense Tracking & Financial Records</h2>
                <p className="text-xs text-zinc-500">Corporate spend aggregation, receipt extraction, and categorized expense records.</p>
              </div>
              <div className="text-right">
                <span className="text-xs text-zinc-400 block">Total Spend</span>
                <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                  ${expenseSummary?.totalAmount ? expenseSummary.totalAmount.toFixed(2) : '0.00'} USD
                </span>
              </div>
            </div>

            {/* Category Breakdown Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {['software', 'travel', 'meals', 'office'].map(cat => (
                <div key={cat} className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs">
                  <span className="text-[11px] font-medium text-zinc-500 capitalize">{cat}</span>
                  <div className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mt-1">
                    ${expenseSummary?.byCategory?.[cat] ? expenseSummary.byCategory[cat].toFixed(2) : '0.00'}
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Add Expense Form */}
            <form onSubmit={handleCreateExpense} className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs flex flex-wrap gap-3 items-center">
              <input
                type="text"
                placeholder="Merchant (e.g. AWS, Uber, Delta)..."
                value={newExpenseMerchant}
                onChange={e => setNewExpenseMerchant(e.target.value)}
                className="flex-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
              <input
                type="number"
                step="0.01"
                placeholder="Amount (USD)..."
                value={newExpenseAmount}
                onChange={e => setNewExpenseAmount(e.target.value)}
                className="w-32 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
              <select
                value={newExpenseCategory}
                onChange={e => setNewExpenseCategory(e.target.value as any)}
                className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs font-medium"
              >
                <option value="software">Software</option>
                <option value="travel">Travel</option>
                <option value="meals">Meals</option>
                <option value="office">Office</option>
                <option value="utilities">Utilities</option>
                <option value="financial">Financial</option>
                <option value="other">Other</option>
              </select>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white shadow-xs hover:bg-emerald-700 transition"
              >
                <Plus className="w-3.5 h-3.5" /> Log Expense
              </button>
            </form>

            {/* Expenses Table */}
            <div className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 font-semibold text-zinc-600 dark:text-zinc-300">
                  <tr>
                    <th className="p-3">Date</th>
                    <th className="p-3">Merchant</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Source / Note</th>
                    <th className="p-3">Amount</th>
                    <th className="p-3">Verification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {expenses.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-zinc-400">No expense records found.</td>
                    </tr>
                  ) : (
                    expenses.map(exp => (
                      <tr key={exp.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40">
                        <td className="p-3 font-mono text-[11px] text-zinc-400">{exp.date}</td>
                        <td className="p-3 font-bold text-zinc-800 dark:text-zinc-200">{exp.merchant}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                            {exp.category}
                          </span>
                        </td>
                        <td className="p-3 text-zinc-600 dark:text-zinc-400 text-xs">{exp.source}</td>
                        <td className="p-3 font-mono font-bold text-zinc-900 dark:text-zinc-100">
                          ${exp.amount.toFixed(2)} {exp.currency}
                        </td>
                        <td className="p-3">
                          {exp.verified ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                            </span>
                          ) : (
                            <span className="text-[11px] text-amber-600">Pending</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Meeting Dossiers & Notes Tab */}
        {activeTab === 'dossiers' && (
          <div className="p-8 max-w-6xl mx-auto space-y-6 overflow-y-auto h-full">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">Meeting Intelligence & Executive Dossiers</h2>
                <p className="text-xs text-zinc-500">
                  Executive briefing packets for VIP client & board meetings, with attendee bios, email history, and action item note processing.
                </p>
              </div>
              <button
                onClick={() => {
                  if (calendarEvents[0]?.id) {
                    handlePrepareDossierForMeeting(calendarEvents[0].id);
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 text-white shadow-xs hover:bg-indigo-700 transition"
              >
                <Sparkles className="w-3.5 h-3.5" /> Prep Upcoming Meeting Dossier
              </button>
            </div>

            {/* Two Column Layout: Upcoming Dossier on Left/Top, Note Processor on Right */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column (7 cols): Active Dossier View */}
              <div className="lg:col-span-7 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Executive Briefing Dossier</h3>
                  {dossiers.length > 1 && (
                    <select
                      value={selectedDossier?.meetingId || ''}
                      onChange={(e) => {
                        const found = dossiers.find(d => d.meetingId === e.target.value);
                        if (found) setSelectedDossier(found);
                      }}
                      className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2.5 py-1 text-xs"
                    >
                      {dossiers.map(d => (
                        <option key={d.meetingId} value={d.meetingId}>{d.title}</option>
                      ))}
                    </select>
                  )}
                </div>

                {selectedDossier ? (
                  <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs space-y-5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 uppercase">
                          CONFIRMED MEETING
                        </span>
                        <span className="text-xs text-zinc-400 font-mono">
                          {new Date(selectedDossier.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(selectedDossier.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <h4 className="text-base font-bold text-zinc-900 dark:text-zinc-100 mt-1">{selectedDossier.title}</h4>
                      <p className="text-xs text-zinc-500 mt-0.5">{selectedDossier.location || 'Google Meet / Virtual Video'}</p>
                    </div>

                    {/* Strategic Summary */}
                    <div className="p-3.5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 block mb-1">
                        Executive Strategy Brief
                      </span>
                      <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                        {selectedDossier.executivePrepSummary}
                      </p>
                    </div>

                    {/* Talking Points */}
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-2">Key Discussion Objectives</span>
                      <ul className="space-y-1.5">
                        {selectedDossier.talkingPoints.map((point, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-xs text-zinc-700 dark:text-zinc-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Attendees Bios */}
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-2">
                        Attendee Profiles ({selectedDossier.attendees.length})
                      </span>
                      <div className="space-y-3">
                        {selectedDossier.attendees.map((att, idx) => (
                          <div key={idx} className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800 space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{att.name}</span>
                                {att.isVIP && (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                    <Star className="w-3 h-3 fill-amber-500 text-amber-500" /> VIP
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-zinc-400 font-mono">{att.email}</span>
                            </div>
                            <div className="text-[11px] text-zinc-600 dark:text-zinc-400 font-medium">
                              {att.role} • {att.company}
                            </div>

                            {att.contextNotes && att.contextNotes.length > 0 && (
                              <div className="text-[11px] text-zinc-500 dark:text-zinc-400 italic">
                                &quot;{att.contextNotes[0]}&quot;
                              </div>
                            )}

                            {att.recentEmailThreads && att.recentEmailThreads.length > 0 && (
                              <div className="pt-1 border-t border-zinc-200/50 dark:border-zinc-700/50 text-[11px] text-zinc-500">
                                <span className="font-semibold text-zinc-600 dark:text-zinc-400">Recent Thread: </span>
                                {att.recentEmailThreads[0].subject}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Relevant Open Tasks */}
                    {selectedDossier.relevantTasks && selectedDossier.relevantTasks.length > 0 && (
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-2">
                          Linked Open Tasks ({selectedDossier.relevantTasks.length})
                        </span>
                        <div className="space-y-1.5">
                          {selectedDossier.relevantTasks.map(t => (
                            <div key={t.id} className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/40 text-xs flex items-center justify-between">
                              <span className="font-medium text-zinc-800 dark:text-zinc-200">{t.title}</span>
                              <span className="text-[10px] uppercase font-bold text-amber-600">{t.priority}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-12 text-center rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50">
                    <Briefcase className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
                    <p className="text-xs text-zinc-500 font-medium">No meeting dossier compiled yet.</p>
                    <p className="text-[11px] text-zinc-400 mt-1">Click &quot;Prep Upcoming Meeting Dossier&quot; to synthesize attendee intelligence.</p>
                  </div>
                )}
              </div>

              {/* Right Column (5 cols): Post-Meeting Note Processing */}
              <div className="lg:col-span-5 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Post-Meeting Notes & Task Extractor</h3>
                
                <form onSubmit={handleProcessNotes} className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs space-y-3">
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 block mb-1">Meeting Title</label>
                    <input
                      type="text"
                      placeholder="e.g. Q4 Executive Strategy Sync"
                      value={notesMeetingTitle}
                      onChange={e => setNotesMeetingTitle(e.target.value)}
                      className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 block mb-1">Raw Discussion Notes</label>
                    <textarea
                      rows={6}
                      placeholder="Paste raw meeting notes, action items, or bullet points:&#10;- Action: Send revised Master Services Agreement&#10;- Todo: Confirm budget allocation with CFO&#10;- Follow up: Schedule product roadmap review"
                      value={rawNotesContent}
                      onChange={e => setRawNotesContent(e.target.value)}
                      className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-3 text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isProcessingNotes || !notesMeetingTitle.trim() || !rawNotesContent.trim()}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isProcessingNotes ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <FileCheck className="w-3.5 h-3.5" />}
                    Extract Action Items & Draft Recap
                  </button>
                </form>

                {/* Note Processing Output */}
                {processedNotesResult && (
                  <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-emerald-200 dark:border-emerald-900/50 shadow-2xs space-y-4">
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{processedNotesResult.summary}</span>
                    </div>

                    {/* Extracted Tasks */}
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1.5">
                        Extracted Tasks (Added to Task Manager)
                      </span>
                      <div className="space-y-1.5">
                        {processedNotesResult.extractedTasks.map((t: any) => (
                          <div key={t.id} className="p-2 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 text-xs text-emerald-900 dark:text-emerald-200 font-medium">
                            ✓ {t.title}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Drafted Email Recap */}
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1.5">
                        Drafted Follow-Up Email
                      </span>
                      <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-xs space-y-2">
                        <div className="font-semibold text-zinc-800 dark:text-zinc-200">
                          Subject: {processedNotesResult.followUpDraft.subject}
                        </div>
                        <div className="text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap text-[11px] leading-relaxed">
                          {processedNotesResult.followUpDraft.body}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Executive Travel & Itineraries Tab */}
        {activeTab === 'travel' && (
          <div className="p-8 max-w-5xl mx-auto space-y-6 overflow-y-auto h-full">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">Executive Travel & Itineraries</h2>
                <p className="text-xs text-zinc-500">Day-by-day travel itineraries, flight segments, hotel bookings, and automatic calendar sync.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExtractTravel}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-2xs hover:bg-zinc-50 dark:hover:bg-zinc-700 transition"
                >
                  <Mail className="w-3.5 h-3.5 text-sky-500" /> Scan Inbox for Confirmations
                </button>
              </div>
            </div>

            {trips.length === 0 ? (
              <div className="p-12 text-center rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50">
                <Plane className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
                <p className="text-xs text-zinc-500 font-medium">No business trips registered.</p>
                <p className="text-[11px] text-zinc-400 mt-1">Scan your inbox or ask the assistant to schedule business travel.</p>
              </div>
            ) : (
              trips.map(trip => (
                <div key={trip.id} className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs space-y-6">
                  <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 uppercase">
                          {trip.status}
                        </span>
                        <span className="text-xs text-zinc-400 font-mono">{trip.startDate} → {trip.endDate}</span>
                      </div>
                      <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 mt-1">{trip.destination}</h3>
                      <p className="text-xs text-zinc-500 mt-0.5">{trip.purpose}</p>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Synced to Calendar
                    </div>
                  </div>

                  {/* Flight Segments */}
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-3">Flight Segments</span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {trip.flights.map((flight, idx) => (
                        <div key={idx} className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{flight.airline} • {flight.flightNumber}</span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 font-bold">
                              {flight.confirmationCode}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs py-1">
                            <div>
                              <div className="text-lg font-bold text-zinc-800 dark:text-zinc-200">{flight.departureAirport}</div>
                              <div className="text-[10px] text-zinc-400">{new Date(flight.departureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                            </div>
                            <div className="text-center px-4">
                              <Plane className="w-4 h-4 text-sky-500 mx-auto transform rotate-90" />
                              <span className="text-[10px] text-zinc-400 font-medium">Seat: {flight.seat || 'Unassigned'}</span>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold text-zinc-800 dark:text-zinc-200">{flight.arrivalAirport}</div>
                              <div className="text-[10px] text-zinc-400">{new Date(flight.arrivalTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Hotel Details */}
                  {trip.hotel && (
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-3">Hotel Reservation</span>
                      <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 flex flex-wrap justify-between items-center gap-3">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <Hotel className="w-4 h-4 text-indigo-500" />
                            <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{trip.hotel.hotelName}</span>
                          </div>
                          <p className="text-xs text-zinc-500">{trip.hotel.address}</p>
                          <p className="text-[11px] text-zinc-400 font-medium">Room: {trip.hotel.roomType}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-mono px-2.5 py-1 rounded-md bg-zinc-200 dark:bg-zinc-700 font-bold block">
                            {trip.hotel.confirmationCode}
                          </span>
                          <span className="text-[11px] text-zinc-400 mt-1 block">
                            Check-in: {trip.hotel.checkInDate} • Check-out: {trip.hotel.checkOutDate}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Daily Schedule & Packing Tips */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-2">Schedule Timeline</span>
                      <div className="space-y-2">
                        {trip.dailySchedule.map((day, dIdx) => (
                          <div key={dIdx} className="space-y-1">
                            <span className="text-[11px] font-bold text-zinc-600 dark:text-zinc-400">{day.date}</span>
                            {day.events.map((evt, eIdx) => (
                              <div key={eIdx} className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300">
                                <span className="font-mono text-zinc-400 text-[11px] w-16">{evt.time}</span>
                                <span>{evt.description}</span>
                                <span className="text-zinc-400 text-[10px]">({evt.location})</span>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-2">Executive Packing Tips</span>
                      <ul className="space-y-1.5">
                        {trip.packingTips.map((tip, idx) => (
                          <li key={idx} className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300">
                            <CheckSquare className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Routines & Automations Tab */}
        {activeTab === 'routines' && (
          <div className="p-8 max-w-5xl mx-auto space-y-6 overflow-y-auto h-full">
            <div>
              <h2 className="text-lg font-bold">Proactive Executive Routines & Automations</h2>
              <p className="text-xs text-zinc-500">Autonomous recurring workflows that run morning kickoffs, evening wrap-ups, and weekly executive audits.</p>
            </div>

            {/* Routine Trigger Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs space-y-3">
                <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 flex items-center justify-center">
                  <Sun className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Morning Kickoff Routine</h3>
                  <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                    Synthesizes daily schedule, triages unread emails, verifies action items, and flags high-priority tasks.
                  </p>
                </div>
                <button
                  onClick={() => handleTriggerRoutine('morning_briefing')}
                  disabled={!!isRunningRoutine}
                  className="w-full py-2 px-3 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isRunningRoutine === 'morning_briefing' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                  Run Morning Kickoff
                </button>
              </div>

              <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs space-y-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Evening Wrap-Up Routine</h3>
                  <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                    Audits completed tasks, rolls over unfinished items, and previews tomorrow&apos;s meetings and commitments.
                  </p>
                </div>
                <button
                  onClick={() => handleTriggerRoutine('evening_wrapup')}
                  disabled={!!isRunningRoutine}
                  className="w-full py-2 px-3 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isRunningRoutine === 'evening_wrapup' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                  Run Evening Wrap-Up
                </button>
              </div>

              <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs space-y-3">
                <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 flex items-center justify-center">
                  <Repeat className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Weekly Executive Audit</h3>
                  <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                    Audits VIP relationship cadences, identifies stalled partners, and aggregates corporate expenses.
                  </p>
                </div>
                <button
                  onClick={() => handleTriggerRoutine('weekly_audit')}
                  disabled={!!isRunningRoutine}
                  className="w-full py-2 px-3 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isRunningRoutine === 'weekly_audit' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                  Run Weekly Audit
                </button>
              </div>
            </div>

            {/* Routine Execution History */}
            <div className="space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Execution History</span>
              {routineHistory.length === 0 ? (
                <div className="p-8 text-center rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50">
                  <p className="text-xs text-zinc-400">No automated routines executed yet.</p>
                </div>
              ) : (
                routineHistory.map(rtn => (
                  <div key={rtn.id} className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 uppercase">
                          {rtn.routineType.replace('_', ' ')}
                        </span>
                        <span className="text-[11px] font-mono text-zinc-400">
                          {new Date(rtn.executedAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-700 dark:text-zinc-300 font-medium">{rtn.summary}</p>
                    </div>
                    <div className="flex items-center gap-1 text-emerald-600 text-xs font-semibold">
                      <CheckCircle2 className="w-4 h-4" /> Succeeded
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Background Jobs Tab */}
        {activeTab === 'jobs' && (
          <div className="p-8 max-w-4xl mx-auto space-y-6 overflow-y-auto h-full">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">Durable Background Task Queue</h2>
                <p className="text-xs text-zinc-500">Persistent job checkpoints, automatic restart recovery, and safe human approval gating.</p>
              </div>
              <button
                onClick={fetchInitialData}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-2xs hover:bg-zinc-50 dark:hover:bg-zinc-700 transition"
              >
                <RefreshCw className="w-3.5 h-3.5 text-zinc-500" /> Refresh Queue
              </button>
            </div>

            <div className="space-y-3">
              {backgroundJobs.length === 0 ? (
                <div className="p-12 text-center rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50">
                  <ListTodo className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
                  <p className="text-xs text-zinc-500 font-medium">No background jobs queued or running.</p>
                  <p className="text-[11px] text-zinc-400 mt-1">Multi-step plans can be enqueued to execute durably in the background.</p>
                </div>
              ) : (
                backgroundJobs.map(job => (
                  <div key={job.id} className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-zinc-700 dark:text-zinc-300">{job.id}</span>
                        {getStatusBadge(job.status)}
                      </div>
                      <span className="text-[11px] text-zinc-400">{new Date(job.createdAt).toLocaleString()}</span>
                    </div>

                    <p className="text-xs text-zinc-800 dark:text-zinc-200 font-medium">{job.plan?.summary || 'Background workflow execution'}</p>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] text-zinc-500">
                        <span>Progress: Step {job.currentStepIndex + 1} of {job.totalSteps}</span>
                        <span>{job.totalSteps > 0 ? Math.round(((job.currentStepIndex + (job.status === 'succeeded' ? 1 : 0)) / job.totalSteps) * 100) : 0}%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                        <div 
                          className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                          style={{ width: `${job.totalSteps > 0 ? Math.min(100, Math.round(((job.currentStepIndex + (job.status === 'succeeded' ? 1 : 0)) / job.totalSteps) * 100)) : 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Calendar Schedule Tab */}
        {activeTab === 'calendar' && (
          <div className="p-8 max-w-4xl mx-auto space-y-6 overflow-y-auto h-full">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">Google Calendar Schedule</h2>
                <p className="text-xs text-zinc-500">Upcoming calendar events, attendee coordination, and meeting scheduling controls.</p>
              </div>
              <button
                onClick={() => {
                  setActiveTab('chat');
                  handleSendMessage('Check my upcoming calendar events for this week');
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white shadow-xs hover:bg-indigo-700 transition"
              >
                <CalendarIcon className="w-3.5 h-3.5" /> Ask Assistant to Schedule
              </button>
            </div>

            <div className="space-y-3">
              {calendarEvents.length === 0 ? (
                <div className="p-12 text-center rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50">
                  <CalendarIcon className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
                  <p className="text-xs text-zinc-500 font-medium">No upcoming calendar events found.</p>
                </div>
              ) : (
                calendarEvents.map(evt => (
                  <div key={evt.id} className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{evt.summary}</span>
                        <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                          evt.status === 'confirmed' 
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' 
                            : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                        }`}>
                          {evt.status.toUpperCase()}
                        </span>
                      </div>
                      <span className="font-mono text-[11px] text-zinc-400">{evt.id}</span>
                    </div>

                    <div className="text-[11px] text-zinc-500 dark:text-zinc-400 flex flex-wrap items-center gap-4">
                      <span>Time: <strong className="text-zinc-700 dark:text-zinc-300">{new Date(evt.startTime).toLocaleString()}</strong> - {new Date(evt.endTime).toLocaleTimeString()}</span>
                      {evt.location && <span>Location: <strong className="text-zinc-700 dark:text-zinc-300">{evt.location}</strong></span>}
                    </div>

                    {evt.description && (
                      <p className="text-xs text-zinc-600 dark:text-zinc-400">{evt.description}</p>
                    )}

                    {evt.attendees && evt.attendees.length > 0 && (
                      <div className="flex items-center gap-1.5 pt-1">
                        <span className="text-[11px] text-zinc-400">Attendees:</span>
                        {evt.attendees.map((att: string, idx: number) => (
                          <span key={idx} className="px-2 py-0.5 rounded text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-mono">
                            {att}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Sandboxed Files Tab */}
        {activeTab === 'files' && (
          <div className="p-8 max-w-4xl mx-auto space-y-6 overflow-y-auto h-full">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">Sandboxed Workspace Files</h2>
                <p className="text-xs text-zinc-500">
                  Protected local workspace sandbox. Path traversal outside this directory is strictly blocked by security gates.
                </p>
                <code className="text-[11px] text-indigo-600 dark:text-indigo-400 font-mono mt-1 block">
                  {workspaceFiles.baseDir || 'data/workspace'}
                </code>
              </div>
              <button
                onClick={() => {
                  setActiveTab('chat');
                  handleSendMessage('Save a summary of my tasks to workspace/summary.txt');
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white shadow-xs hover:bg-indigo-700 transition"
              >
                <Folder className="w-3.5 h-3.5" /> Ask Assistant to Write File
              </button>
            </div>

            <div className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 font-semibold text-zinc-600 dark:text-zinc-300">
                  <tr>
                    <th className="p-3">File Name</th>
                    <th className="p-3">Relative Path</th>
                    <th className="p-3">Size</th>
                    <th className="p-3">Last Modified</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {!workspaceFiles.files || workspaceFiles.files.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-zinc-400">
                        No files in workspace directory yet. Instruct the assistant to create or organize files!
                      </td>
                    </tr>
                  ) : (
                    workspaceFiles.files.map((file, idx) => (
                      <tr key={idx} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40">
                        <td className="p-3 font-medium flex items-center gap-2">
                          {file.isDirectory ? (
                            <Folder className="w-4 h-4 text-amber-500" />
                          ) : (
                            <FileText className="w-4 h-4 text-zinc-400" />
                          )}
                          <span>{file.name}</span>
                        </td>
                        <td className="p-3 font-mono text-[11px] text-zinc-500">{file.path}</td>
                        <td className="p-3 text-zinc-500">{file.sizeBytes} B</td>
                        <td className="p-3 text-[11px] text-zinc-400">{new Date(file.modifiedAt).toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Task History Tab */}
        {activeTab === 'history' && (
          <div className="p-8 max-w-4xl mx-auto space-y-6 overflow-y-auto h-full">
            <div>
              <h2 className="text-lg font-bold">Execution History</h2>
              <p className="text-xs text-zinc-500">Persistent log of all requested workflows and their verification status.</p>
            </div>

            <div className="space-y-3">
              {allPlans.length === 0 ? (
                <div className="p-6 text-center text-zinc-400 text-xs">No tasks executed yet.</div>
              ) : (
                allPlans.map(plan => (
                  <div
                    key={plan.id}
                    onClick={() => {
                      setCurrentPlan(plan);
                      setActiveTab('chat');
                    }}
                    className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs hover:border-indigo-400 cursor-pointer transition flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">{plan.summary}</span>
                        {getStatusBadge(plan.status)}
                      </div>
                      <div className="text-[11px] text-zinc-400 flex items-center gap-3">
                        <span>Original Prompt: &quot;{plan.originalPrompt}&quot;</span>
                        <span>•</span>
                        <span>{new Date(plan.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-400" />
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Integrations & BYOK Tab */}
        {activeTab === 'integrations' && (
          <div className="p-8 max-w-4xl mx-auto space-y-6 overflow-y-auto h-full">
            <div>
              <h2 className="text-lg font-bold">Integrations & Bring Your Own Key (BYOK)</h2>
              <p className="text-xs text-zinc-500">Configure provider credentials and test environments securely.</p>
            </div>

            {/* Gmail Integration Card */}
            <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950/60 text-red-600 flex items-center justify-center">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold">Gmail Integration</h3>
                    <p className="text-xs text-zinc-500">Search, preview, archive, label, and trash email messages.</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium cursor-pointer flex items-center gap-2">
                    <span>Use Mock Sandbox:</span>
                    <input
                      type="checkbox"
                      checked={integrationConfig.useMockGmail}
                      onChange={(e) => handleUpdateConfig({ useMockGmail: e.target.checked })}
                      className="w-4 h-4 rounded text-indigo-600"
                    />
                  </label>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 text-xs space-y-1">
                <div className="font-semibold text-zinc-700 dark:text-zinc-300">
                  {integrationConfig.useMockGmail ? 'Mock Sandbox Active' : 'Live Google OAuth 2.0 Mode'}
                </div>
                <p className="text-zinc-500">
                  {integrationConfig.useMockGmail
                    ? 'Preloaded with realistic messages (>5 years old, protected tax records, receipts, and starred notes). Zero Google API quota or credentials required.'
                    : 'Requires GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET configured in .env.local.'}
                </p>
              </div>
            </div>

            {/* AI Provider BYOK Card */}
            <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">AI Model Provider Configuration</h3>
                  <p className="text-xs text-zinc-500">Select model backend and provide API credentials.</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {['mock', 'gemini', 'openai'].map(provider => (
                  <button
                    key={provider}
                    onClick={() => handleUpdateConfig({ aiProvider: provider })}
                    className={`p-3.5 rounded-xl border text-left transition ${
                      integrationConfig.aiProvider === provider
                        ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 font-bold'
                        : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300'
                    }`}
                  >
                    <div className="text-xs capitalize">{provider === 'mock' ? 'Deterministic Mock' : provider}</div>
                    <div className="text-[11px] text-zinc-400 font-normal mt-0.5">
                      {provider === 'mock' ? 'Zero-cost offline testing' : provider === 'gemini' ? 'Google Gemini 2.5 Flash' : 'OpenAI / Ollama / Groq'}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Security & Audit Log Tab */}
        {activeTab === 'audit' && (
          <div className="p-8 max-w-5xl mx-auto space-y-6 overflow-y-auto h-full">
            <div>
              <h2 className="text-lg font-bold">Security & Audit Event Log</h2>
              <p className="text-xs text-zinc-500">
                Immutable audit trail of all tool invocations, user approvals, and authoritative verification states. Sensitive parameters are redacted automatically.
              </p>
            </div>

            <div className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 font-semibold text-zinc-600 dark:text-zinc-300">
                  <tr>
                    <th className="p-3">Timestamp</th>
                    <th className="p-3">Tool</th>
                    <th className="p-3">Risk Level</th>
                    <th className="p-3">Approved By</th>
                    <th className="p-3">Execution</th>
                    <th className="p-3">Verification</th>
                    <th className="p-3">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {auditEvents.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-zinc-400">No audit events recorded yet.</td>
                    </tr>
                  ) : (
                    auditEvents.map(evt => (
                      <tr key={evt.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40">
                        <td className="p-3 font-mono text-[11px] text-zinc-400">
                          {new Date(evt.timestamp).toLocaleTimeString()}
                        </td>
                        <td className="p-3 font-mono font-bold text-zinc-800 dark:text-zinc-200">
                          {evt.toolName}
                        </td>
                        <td className="p-3">{getRiskBadge(evt.riskLevel)}</td>
                        <td className="p-3 text-zinc-600 dark:text-zinc-400 font-mono text-[11px]">
                          {evt.approvedBy}
                        </td>
                        <td className="p-3">{getStatusBadge(evt.executionStatus)}</td>
                        <td className="p-3">
                          {evt.verificationStatus === 'verified' ? (
                            <span className="text-emerald-600 font-medium">Verified</span>
                          ) : (
                            <span className="text-zinc-400">N/A</span>
                          )}
                        </td>
                        <td className="p-3 text-zinc-400">{evt.durationMs ? `${evt.durationMs}ms` : '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Protection Policies Tab */}
        {activeTab === 'preferences' && preferences && (
          <div className="p-8 max-w-4xl mx-auto space-y-6 overflow-y-auto h-full">
            <div>
              <h2 className="text-lg font-bold">Protection Policies & User Preferences</h2>
              <p className="text-xs text-zinc-500">
                Strict categories and sender domains that the assistant is instructed to NEVER automatically trash or modify.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs space-y-4">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Protected Categories (Excluded from bulk cleanup)
              </h3>
              <div className="flex flex-wrap gap-2">
                {preferences.protectedEmailCategories.map((cat, i) => (
                  <span key={i} className="px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    {cat}
                  </span>
                ))}
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs space-y-4">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Protected Domains (Tax, Banking, Financial)
              </h3>
              <div className="flex flex-wrap gap-2">
                {preferences.protectedEmailDomains.map((dom, i) => (
                  <span key={i} className="px-3 py-1 rounded-lg text-xs font-mono font-semibold bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                    @{dom}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Executive Voice & Ghostwriter Tab */}
        {activeTab === 'voice' && (
          <div className="p-8 max-w-6xl mx-auto space-y-6 overflow-y-auto h-full">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                <PenTool className="w-5 h-5 text-pink-500" />
                Executive Voice Matching & In-Voice Ghostwriting
              </h2>
              <p className="text-xs text-zinc-500">
                Calibrate communication tone, formality, and brevity preferences. The assistant drafts authentic, executive-grade email responses directly into Gmail drafts.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Profile Config Card */}
              <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs space-y-4">
                <h3 className="text-sm font-bold border-b border-zinc-100 dark:border-zinc-800 pb-2">Voice Style & Tone Settings</h3>
                
                {voiceProfile ? (
                  <div className="space-y-4 text-xs">
                    <div>
                      <label className="font-semibold block mb-1">Tone & Persona</label>
                      <select 
                        value={voiceProfile.tone}
                        onChange={(e: any) => handleUpdateVoiceProfile({ tone: e.target.value })}
                        className="w-full p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
                      >
                        <option value="concise_professional">Concise & Professional (Default)</option>
                        <option value="warm_executive">Warm Executive</option>
                        <option value="formal_corporate">Formal Corporate / Institutional</option>
                        <option value="casual_direct">Casual & Direct</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-semibold block mb-1">Brevity Preference</label>
                      <div className="grid grid-cols-3 gap-2">
                        {(['ultra_brief', 'balanced', 'detailed'] as const).map(b => (
                          <button
                            key={b}
                            type="button"
                            onClick={() => handleUpdateVoiceProfile({ brevityPreference: b })}
                            className={`p-2 rounded-lg font-medium border text-center capitalize ${
                              voiceProfile.brevityPreference === b
                                ? 'bg-indigo-50 border-indigo-500 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                                : 'border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                            }`}
                          >
                            {b.replace('_', ' ')}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="font-semibold block mb-1">Formality Level (1 = Casual, 5 = Highly Formal)</label>
                      <input 
                        type="range" 
                        min="1" 
                        max="5" 
                        value={voiceProfile.formalityLevel}
                        onChange={(e) => handleUpdateVoiceProfile({ formalityLevel: parseInt(e.target.value, 10) })}
                        className="w-full accent-indigo-600"
                      />
                      <div className="flex justify-between text-[11px] text-zinc-400 mt-1">
                        <span>1 (Casual)</span>
                        <span>Level {voiceProfile.formalityLevel}</span>
                        <span>5 (Institutional)</span>
                      </div>
                    </div>

                    <div>
                      <label className="font-semibold block mb-1">Typical Sign-Off</label>
                      <textarea
                        rows={2}
                        value={voiceProfile.typicalSignOff}
                        onChange={(e) => handleUpdateVoiceProfile({ typicalSignOff: e.target.value })}
                        className="w-full p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 font-mono text-[11px]"
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-zinc-400">Loading voice profile...</p>
                )}
              </div>

              {/* Ghostwrite Composer Playground */}
              <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs space-y-4 flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold border-b border-zinc-100 dark:border-zinc-800 pb-2">Test In-Voice Email Ghostwriting</h3>
                  <form onSubmit={handleGhostwrite} className="space-y-3 mt-3 text-xs">
                    <div>
                      <label className="font-semibold block mb-1">Recipient</label>
                      <input 
                        type="email" 
                        placeholder="elena.rostova@summitpartners.com"
                        value={ghostwriteRecipient}
                        onChange={(e) => setGhostwriteRecipient(e.target.value)}
                        className="w-full p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
                        required
                      />
                    </div>
                    <div>
                      <label className="font-semibold block mb-1">Subject</label>
                      <input 
                        type="text" 
                        placeholder="Series B Term Sheet & ARR Growth"
                        value={ghostwriteSubject}
                        onChange={(e) => setGhostwriteSubject(e.target.value)}
                        className="w-full p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
                      />
                    </div>
                    <div>
                      <label className="font-semibold block mb-1">Inbound Context (What they asked)</label>
                      <textarea 
                        rows={2}
                        placeholder="They want updated Q4 numbers and asked for a sync Tuesday."
                        value={ghostwriteContext}
                        onChange={(e) => setGhostwriteContext(e.target.value)}
                        className="w-full p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
                        required
                      />
                    </div>
                    <div>
                      <label className="font-semibold block mb-1">Executive Instructions</label>
                      <input 
                        type="text" 
                        placeholder="Agree to Tuesday 2 PM and confirm we'll share the deck beforehand."
                        value={ghostwriteInstructions}
                        onChange={(e) => setGhostwriteInstructions(e.target.value)}
                        className="w-full p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isGhostwriting}
                      className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-colors flex items-center justify-center gap-2"
                    >
                      {isGhostwriting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <PenTool className="w-4 h-4" />}
                      Generate In-Voice Draft
                    </button>
                  </form>
                </div>

                {ghostwriteResult && (
                  <div className="mt-4 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-indigo-200 dark:border-indigo-900/50 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                      <span>✓ Gmail Draft Prepared ({ghostwriteResult.draftId})</span>
                      <span className="capitalize">{ghostwriteResult.toneApplied.replace('_', ' ')}</span>
                    </div>
                    <p className="font-mono text-[11px] font-bold">To: {ghostwriteResult.to}</p>
                    <p className="font-mono text-[11px] font-bold">Subject: {ghostwriteResult.subject}</p>
                    <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 whitespace-pre-wrap font-sans text-xs text-zinc-700 dark:text-zinc-300">
                      {ghostwriteResult.body}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Cloud Documents & Drive Tab */}
        {activeTab === 'documents' && (
          <div className="p-8 max-w-6xl mx-auto space-y-6 overflow-y-auto h-full">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <FileSearch className="w-5 h-5 text-cyan-500" />
                  Cloud Document & Executive Drive Sync
                </h2>
                <p className="text-xs text-zinc-500">
                  Search and index enterprise contracts, board decks, NDAs, and compliance certifications.
                </p>
              </div>
              <div className="w-72">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Search documents or tags..."
                    value={documentSearchQuery}
                    onChange={(e) => handleSearchDocuments(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                  />
                </div>
              </div>
            </div>

            {/* Document Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {cloudDocuments.map(doc => (
                <div key={doc.id} className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs space-y-3 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="p-2 rounded-lg bg-cyan-50 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400">
                        <FileText className="w-4 h-4" />
                      </span>
                      <span className="text-[10px] font-mono text-zinc-400">{new Date(doc.lastModified).toLocaleDateString()}</span>
                    </div>
                    <h3 className="font-bold text-xs mt-2 text-zinc-800 dark:text-zinc-200">{doc.title}</h3>
                    <p className="text-[11px] text-zinc-500 mt-1 line-clamp-3">{doc.contentSnippet}</p>
                    <div className="flex flex-wrap gap-1 mt-3">
                      {doc.tags.map(t => (
                        <span key={t} className="px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                          #{t}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => handleSummarizeDocument(doc.id)}
                    className="w-full py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-xs font-semibold transition-colors text-zinc-700 dark:text-zinc-300"
                  >
                    Summarize Key Terms
                  </button>
                </div>
              ))}
            </div>

            {summarizedDocResult && (
              <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-cyan-200 dark:border-cyan-900 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-cyan-700 dark:text-cyan-400 flex items-center gap-2">
                    <FileCheck className="w-4 h-4" />
                    Executive Analysis: {summarizedDocResult.document?.title}
                  </h3>
                  <button onClick={() => setSummarizedDocResult(null)} className="text-zinc-400 hover:text-zinc-600 text-xs">✕ Close</button>
                </div>
                <p className="text-xs text-zinc-700 dark:text-zinc-300 font-medium">{summarizedDocResult.executiveSummary}</p>
                <div className="space-y-1">
                  {summarizedDocResult.keyPoints?.map((pt: string, idx: number) => (
                    <div key={idx} className="text-xs text-zinc-600 dark:text-zinc-400 flex items-start gap-2">
                      <span className="text-cyan-500">•</span>
                      <span>{pt}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Daemon & Cron Scheduler Tab */}
        {activeTab === 'scheduler' && (
          <div className="p-8 max-w-5xl mx-auto space-y-6 overflow-y-auto h-full">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Radio className="w-5 h-5 text-orange-500" />
                  Autonomous Headless Background Scheduler
                </h2>
                <p className="text-xs text-zinc-500">
                  Headless daemon executes executive routines on schedule without needing an open browser tab.
                </p>
              </div>
              <button
                onClick={handleEvaluateDueJobs}
                disabled={isEvaluatingJobs}
                className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold text-xs transition-colors flex items-center gap-2"
              >
                {isEvaluatingJobs ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                Evaluate Due Jobs Now
              </button>
            </div>

            <div className="space-y-4">
              {scheduledJobs.map(job => (
                <div key={job.id} className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${job.enabled ? 'bg-emerald-500' : 'bg-zinc-400'}`}></span>
                      <h3 className="font-bold text-xs">{job.name}</h3>
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                        {job.cronExpression}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-[11px] text-zinc-400">
                      <span>Routine: <strong className="text-zinc-700 dark:text-zinc-300">{job.routineType}</strong></span>
                      <span>Last Run: {job.lastRunAt ? new Date(job.lastRunAt).toLocaleTimeString() : 'Never'}</span>
                      <span>Channels: {job.notifyChannels.join(', ')}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleTriggerJob(job.id)}
                      className="px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-xs font-semibold transition-colors"
                    >
                      Trigger Now
                    </button>
                    <button
                      onClick={() => handleToggleJob(job.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                        job.enabled 
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                      }`}
                    >
                      {job.enabled ? 'Enabled' : 'Disabled'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Omnichannel & Approvals Tab */}
        {activeTab === 'omnichannel' && (
          <div className="p-8 max-w-6xl mx-auto space-y-6 overflow-y-auto h-full">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-indigo-500" />
                Omnichannel Ingestion, Voice Memos & Mobile Approval Gate
              </h2>
              <p className="text-xs text-zinc-500">
                Process requests from Telegram, WhatsApp, Slack, voice note memos, and manage remote one-tap authorization callbacks.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Inbound Simulator */}
              <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs space-y-4">
                <h3 className="text-sm font-bold border-b border-zinc-100 dark:border-zinc-800 pb-2">Simulate Remote Inbound Message / Voice Memo</h3>
                
                <form onSubmit={handleSendOmnichannel} className="space-y-3 text-xs">
                  <div>
                    <label className="font-semibold block mb-1">Communication Channel</label>
                    <select
                      value={omniChannel}
                      onChange={(e: any) => setOmniChannel(e.target.value)}
                      className="w-full p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
                    >
                      <option value="telegram">Telegram (@AssistantBot)</option>
                      <option value="slack">Slack (#executive-sync)</option>
                      <option value="whatsapp">WhatsApp (+1 415 555-0199)</option>
                      <option value="voice_note">Voice Note (Audio Memo)</option>
                    </select>
                  </div>

                  {omniChannel === 'voice_note' ? (
                    <div>
                      <label className="font-semibold block mb-1">Select Audio Voice Memo Simulation</label>
                      <select
                        value={omniAudioPreset}
                        onChange={(e) => setOmniAudioPreset(e.target.value)}
                        className="w-full p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 font-mono text-[11px]"
                      >
                        <option value="briefing_memo.wav">&quot;Give me my morning briefing&quot;</option>
                        <option value="task_memo.wav">&quot;Add task: Call Marcus regarding partnership agreement&quot;</option>
                        <option value="flight_memo.wav">&quot;What is the status of my flight DL 428?&quot;</option>
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="font-semibold block mb-1">Message Text</label>
                      <input
                        type="text"
                        placeholder="e.g. Clean up emails older than 5 years, or find open slots for 30m meeting"
                        value={omniInputText}
                        onChange={(e) => setOmniInputText(e.target.value)}
                        className="w-full p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
                      />
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSendingOmni}
                    className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-colors flex items-center justify-center gap-2"
                  >
                    {isSendingOmni ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Dispatch Inbound Request
                  </button>
                </form>

                {omniResponse && (
                  <div className="mt-4 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 space-y-2 text-xs">
                    <span className="font-bold uppercase text-[10px] tracking-wider text-indigo-600 dark:text-indigo-400">
                      Response ({omniResponse.channel})
                    </span>
                    <p className="whitespace-pre-wrap font-mono text-[11px] text-zinc-800 dark:text-zinc-200">
                      {omniResponse.replyText}
                    </p>

                    {omniResponse.requiresApproval && omniResponse.approvalToken && (
                      <div className="p-3 mt-3 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 space-y-2">
                        <p className="font-bold text-amber-800 dark:text-amber-300">Remote Authorization Required</p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleMobileApprovalDecision(omniResponse.approvalToken, true)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-colors"
                          >
                            Approve Action
                          </button>
                          <button
                            onClick={() => handleMobileApprovalDecision(omniResponse.approvalToken, false)}
                            className="px-3 py-1.5 rounded-lg bg-rose-600 text-white font-bold hover:bg-rose-700 transition-colors"
                          >
                            Reject Action
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {approvalFeedback && (
                  <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
                    {approvalFeedback}
                  </div>
                )}
              </div>

              {/* Receipt OCR Panel */}
              <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs space-y-4">
                <h3 className="text-sm font-bold border-b border-zinc-100 dark:border-zinc-800 pb-2 flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-emerald-600" />
                  PDF & Receipt OCR Invoice Parser
                </h3>
                
                <form onSubmit={handleParseReceipt} className="space-y-3 text-xs">
                  <div>
                    <label className="font-semibold block mb-1">Receipt / Invoice Text</label>
                    <textarea
                      rows={6}
                      placeholder={`Amazon Web Services Invoice\nDate: 2026-10-14\nEC2 Compute: $412.50\nAurora PostgreSQL: $185.00\nTax: $52.77\nTotal Amount Due: $650.27 USD`}
                      value={receiptRawInput}
                      onChange={(e) => setReceiptRawInput(e.target.value)}
                      className="w-full p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 font-mono text-[11px]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isParsingReceipt}
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-colors flex items-center justify-center gap-2"
                  >
                    {isParsingReceipt ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileCheck className="w-4 h-4" />}
                    Extract OCR & Reconcile to Ledger
                  </button>
                </form>

                {latestParsedReceipt && (
                  <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 space-y-2 text-xs">
                    <span className="font-bold text-emerald-700 dark:text-emerald-300">
                      ✓ Parsed & Reconciled ({latestParsedReceipt.receiptId})
                    </span>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div><strong>Merchant:</strong> {latestParsedReceipt.merchantName}</div>
                      <div><strong>Total:</strong> ${latestParsedReceipt.totalAmount.toFixed(2)}</div>
                      <div><strong>Tax/VAT:</strong> ${latestParsedReceipt.taxAmount.toFixed(2)}</div>
                      <div><strong>Category:</strong> {latestParsedReceipt.category}</div>
                    </div>
                  </div>
                )}

                {parsedReceipts.length > 0 && (
                  <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
                    <h4 className="font-bold text-[11px] text-zinc-500 uppercase tracking-wider">
                      Recently Processed Documents ({parsedReceipts.length})
                    </h4>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {parsedReceipts.slice(0, 5).map(rcpt => (
                        <div key={rcpt.receiptId} className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/40 text-[11px]">
                          <div>
                            <span className="font-semibold text-zinc-800 dark:text-zinc-200">{rcpt.merchantName}</span>
                            <span className="text-zinc-400 ml-2">({rcpt.transactionDate})</span>
                          </div>
                          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            ${rcpt.totalAmount.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
