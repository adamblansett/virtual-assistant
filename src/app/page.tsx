'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, User, Send, ShieldCheck, ShieldAlert, CheckCircle2, 
  AlertTriangle, Clock, RefreshCw, Mail, Settings, 
  FileText, Play, XCircle, Eye, Lock,
  ChevronRight, Sparkles, Filter
} from 'lucide-react';
import { TaskPlan, AuditEvent, UserPreferences } from '@/types';

export default function AssistantApp() {
  const [activeTab, setActiveTab] = useState<'chat' | 'history' | 'integrations' | 'audit' | 'preferences'>('chat');
  const [inputMessage, setInputMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Data states
  const [conversations, setConversations] = useState<Array<{ id: string; role: 'user' | 'assistant'; text: string; planId?: string; timestamp: string }>>([]);
  const [currentPlan, setCurrentPlan] = useState<TaskPlan | null>(null);
  const [allPlans, setAllPlans] = useState<TaskPlan[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [integrationConfig, setIntegrationConfig] = useState<{ useMockGmail: boolean; aiProvider: string; geminiApiKey?: string; openaiApiKey?: string }>({
    useMockGmail: true,
    aiProvider: 'mock'
  });

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
    } catch (err) {
      console.error('Failed to load initial data:', err);
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
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-medium">
            <Mail className="w-3.5 h-3.5 text-red-500" />
            <span>Gmail: {integrationConfig.useMockGmail ? 'Mock Sandbox' : 'Live OAuth'}</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>AI: {integrationConfig.aiProvider.toUpperCase()}</span>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="flex items-center px-6 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 gap-1">
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === 'chat'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
          }`}
        >
          <Bot className="w-4 h-4" /> Chat & Task Execution
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === 'history'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
          }`}
        >
          <Clock className="w-4 h-4" /> Task History ({allPlans.length})
        </button>

        <button
          onClick={() => setActiveTab('integrations')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === 'integrations'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
          }`}
        >
          <Settings className="w-4 h-4" /> Integrations & BYOK
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === 'audit'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
          }`}
        >
          <ShieldCheck className="w-4 h-4" /> Security & Audit Log ({auditEvents.length})
        </button>

        <button
          onClick={() => setActiveTab('preferences')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
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
                  onClick={() => handleSendMessage('Find emails older than five years that I no longer need and clean them up.')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-2xs hover:bg-zinc-50 dark:hover:bg-zinc-700 transition"
                >
                  <Mail className="w-3.5 h-3.5 text-indigo-600" />
                  Clean emails older than 5 years
                </button>
                <button
                  onClick={() => handleSendMessage('Search emails from irs.gov or chase.com')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-2xs hover:bg-zinc-50 dark:hover:bg-zinc-700 transition"
                >
                  <Lock className="w-3.5 h-3.5 text-emerald-600" />
                  Check protected receipts/tax
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
      </main>
    </div>
  );
}
