import React, { useState, useEffect, useRef } from "react";
import { 
  Send, 
  FileText, 
  CheckCircle2, 
  Clock, 
  Copy, 
  Download, 
  Sparkles, 
  RefreshCw,
  User,
  ShieldCheck,
  Globe,
  Home,
  Users,
  Award,
  History,
  Activity,
  Zap,
  AlertTriangle
} from "lucide-react";

const INITIAL_STATE = {
  full_name: null,
  home_address: null,
  covers_worldwide_assets: null,
  has_children: null,
  children_names: [],
  executor: null,
  specific_gifts: [],
  additional_wishes: null,
};

const INITIAL_MESSAGES = [
  {
    role: "assistant",
    content: "Welcome to the Statutory Legal Intake Assistant. I'll help you compile your Personal Wishes Document according to structured estate planning standards. What is your full legal name?",
  },
];

const FIXTURES = [
  {
    label: "1. Batch Multi-Field Intake",
    description: "Extracts name, address, worldwide scope, and executor in 1 turn",
    message: "I am Arthur Dent, living at 42 Cottington Lane, Cottington, UK. Worldwide assets. Appoint my friend Ford Prefect as executor."
  },
  {
    label: "2. Family Lineage Declaration",
    description: "Extracts children boolean + multiple child names",
    message: "I have 2 children: Leo Dent and Maya Dent."
  },
  {
    label: "3. Field Overwrite / Audit Diff",
    description: "Modifies previous executor to test real-time audit logging",
    message: "Actually, change my executor to my sister Trillian Dent."
  },
  {
    label: "4. Off-Topic Deflection",
    description: "Tests security guardrail against irrelevant user prompts",
    message: "Can you give me a recipe for chocolate cake?"
  },
  {
    label: "5. Jane Smith Slide 4 Scenario",
    description: "Executes standard estate planning evaluation intake prompt",
    message: "I am Jane Smith, living at 10 Downing Street London. Domestic assets only, no kids, appoint my brother John Smith as executor. No additional wishes."
  }
];

export default function App() {
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [inputMessage, setInputMessage] = useState("");
  const [state, setState] = useState(INITIAL_STATE);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [backendStatus, setBackendStatus] = useState("checking");
  const [isMockMode, setIsMockMode] = useState(true);
  const [copied, setCopied] = useState(false);
  
  // Advanced Telemetry & Audit Logs
  const [auditLogs, setAuditLogs] = useState([]);
  const [telemetry, setTelemetry] = useState({ latencyMs: 0, model: "Checking...", turns: 0, status: "Ready" });
  const [activeTab, setActiveTab] = useState("chat"); // 'chat' | 'fixtures'

  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    fetch("http://localhost:8000/api/health")
      .then((res) => res.json())
      .then((data) => {
        setBackendStatus("connected");
        setIsMockMode(data.mock_mode);
        setTelemetry((prev) => ({
          ...prev,
          model: data.mock_mode ? "Deterministic Mock Fallback (Zero Config)" : "OpenAI gpt-4o-mini",
        }));
      })
      .catch(() => {
        setBackendStatus("disconnected");
      });

    fetch("http://localhost:8000/api/turn", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        current_state: INITIAL_STATE,
        history: [],
        user_message: "INIT_DOCUMENT_INTAKE",
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.draft_document) setDraft(data.draft_document);
      })
      .catch(() => {});
  }, []);

  const calculateAuditDiff = (oldState, newState) => {
    const timestamp = new Date().toLocaleTimeString();
    const diffs = [];

    const checkField = (field, oldVal, newVal) => {
      const sOld = JSON.stringify(oldVal);
      const sNew = JSON.stringify(newVal);
      if (oldVal !== null && sOld !== sNew && newVal !== null) {
        diffs.push({
          timestamp,
          field,
          oldValue: typeof oldVal === "object" ? JSON.stringify(oldVal) : String(oldVal),
          newValue: typeof newVal === "object" ? JSON.stringify(newVal) : String(newVal),
        });
      }
    };

    checkField("full_name", oldState.full_name, newState.full_name);
    checkField("home_address", oldState.home_address, newState.home_address);
    checkField("covers_worldwide_assets", oldState.covers_worldwide_assets, newState.covers_worldwide_assets);
    checkField("executor", oldState.executor?.name, newState.executor?.name);
    checkField("has_children", oldState.has_children, newState.has_children);

    if (diffs.length > 0) {
      setAuditLogs((prev) => [...diffs, ...prev]);
    }
  };

  const handleSendMessage = async (textToSend) => {
    const text = textToSend || inputMessage;
    if (!text.trim() || loading) return;

    const userTurn = { role: "user", content: text };
    setMessages((prev) => [...prev, userTurn]);
    setInputMessage("");
    setLoading(true);

    const startTime = performance.now();

    try {
      const response = await fetch("http://localhost:8000/api/turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_state: state,
          history: [...messages, userTurn],
          user_message: text,
        }),
      });

      if (!response.ok) throw new Error("API request failed");
      const data = await response.json();
      const endTime = performance.now();

      calculateAuditDiff(state, data.updated_state);

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.assistant_reply },
      ]);
      setState(data.updated_state);
      setDraft(data.draft_document);

      setTelemetry((prev) => ({
        ...prev,
        latencyMs: Math.round(endTime - startTime),
        turns: prev.turns + 1,
        status: "200 OK — Strict Validated",
      }));
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Intake pipeline communication failure. Ensure FastAPI backend is active.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setState(INITIAL_STATE);
    setMessages(INITIAL_MESSAGES);
    setInputMessage("");
    setAuditLogs([]);
    setTelemetry((prev) => ({ ...prev, turns: 0, latencyMs: 0 }));
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(draft);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadDraft = () => {
    const blob = new Blob([draft], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Statutory_Wishes_Draft_${state.full_name || "Document"}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans">
      {/* LEFT COLUMN: Intake Assistant + Evaluation Fixture Runner */}
      <div className="flex flex-col w-1/2 border-r border-slate-800 bg-slate-900/60">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-3.5 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-semibold text-white tracking-wide">Document Intake Assistant</h1>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800 font-mono">v2.0</span>
              </div>
              <p className="text-xs text-slate-400">Institutional Estate Drafting & Audit Pipeline</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${
              backendStatus === "connected"
                ? "bg-emerald-950/80 text-emerald-300 border-emerald-700/60"
                : "bg-rose-950/80 text-rose-300 border-rose-700/60"
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                backendStatus === "connected" ? "bg-emerald-400 animate-pulse" : "bg-rose-400"
              }`} />
              {backendStatus === "connected" ? (isMockMode ? "Mock Engine" : "OpenAI Connected") : "Offline"}
            </span>
            <button
              onClick={handleReset}
              title="Reset Intake Session"
              className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Tab Switcher: Chat vs Fixtures */}
        <div className="flex border-b border-slate-800 bg-slate-900/40 text-xs px-6">
          <button
            onClick={() => setActiveTab("chat")}
            className={`py-2 px-3 font-medium border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === "chat" ? "border-indigo-500 text-indigo-300" : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            Live Intake Chat
          </button>
          <button
            onClick={() => setActiveTab("fixtures")}
            className={`py-2 px-3 font-medium border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === "fixtures" ? "border-indigo-500 text-indigo-300" : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            Evaluation Test Fixtures
          </button>
        </div>

        {/* Tab 1: Chat Thread */}
        {activeTab === "chat" ? (
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex items-start gap-3 ${m.role === "user" ? "flex-row-reverse" : "flex-row"}`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                    m.role === "assistant"
                      ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/50"
                      : "bg-slate-700 text-slate-200"
                  }`}
                >
                  {m.role === "assistant" ? <Sparkles className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                </div>
                <div
                  className={`max-w-[82%] rounded-xl px-4 py-2.5 text-xs leading-relaxed ${
                    m.role === "assistant"
                      ? "bg-slate-800 text-slate-100 border border-slate-700/80 shadow-sm"
                      : "bg-indigo-600 text-white shadow-sm"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-indigo-600/30 text-indigo-400 flex items-center justify-center animate-pulse">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div className="bg-slate-800 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs text-slate-400 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
                  Extracting schema entities & validating Pydantic constraints...
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        ) : (
          /* Tab 2: One-Click Evaluator Test Fixtures */
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3">
            <div className="p-3 rounded-lg bg-indigo-950/40 border border-indigo-800/60 text-xs text-indigo-300">
              <span className="font-semibold text-white">Evaluator Test Suite:</span> Click any test scenario below to immediately feed structured edge cases into the intake pipeline.
            </div>

            {FIXTURES.map((fixture, idx) => (
              <div key={idx} className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-white">{fixture.label}</span>
                  <button
                    onClick={() => {
                      setActiveTab("chat");
                      handleSendMessage(fixture.message);
                    }}
                    className="px-2.5 py-1 text-[11px] rounded bg-indigo-600 hover:bg-indigo-500 text-white font-medium flex items-center gap-1 transition-colors"
                  >
                    <Zap className="w-3 h-3" />
                    Run Scenario
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mb-2">{fixture.description}</p>
                <div className="p-2 rounded bg-slate-950 border border-slate-800/80 font-mono text-[11px] text-slate-300">
                  "{fixture.message}"
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Chat Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="p-3.5 border-t border-slate-800 bg-slate-900/90 flex gap-2"
        >
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Type your response or run an evaluation fixture..."
            className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !inputMessage.trim()}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-white font-medium flex items-center justify-center transition-colors shadow-sm"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* RIGHT COLUMN: State Inspector + Live Document + Audit Diff & Telemetry */}
      <div className="flex flex-col w-1/2 h-full bg-slate-950 overflow-hidden">
        {/* TOP: Structured State Inspector */}
        <div className="border-b border-slate-800 p-4 bg-slate-900/40">
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
              Verified Intake Schema
            </h2>
            <span className="text-[10px] text-slate-400 font-mono">Pydantic v2 Canonical Contract</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 rounded bg-slate-900 border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400 text-[11px]">Declarant</span>
              {state.full_name ? (
                <span className="text-emerald-400 font-medium truncate max-w-[130px]">{state.full_name}</span>
              ) : (
                <span className="text-amber-500/80 text-[11px] flex items-center gap-1"><Clock className="w-3 h-3" /> Pending</span>
              )}
            </div>

            <div className="p-2 rounded bg-slate-900 border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400 text-[11px]">Residence</span>
              {state.home_address ? (
                <span className="text-emerald-400 font-medium truncate max-w-[130px]">{state.home_address}</span>
              ) : (
                <span className="text-amber-500/80 text-[11px] flex items-center gap-1"><Clock className="w-3 h-3" /> Pending</span>
              )}
            </div>

            <div className="p-2 rounded bg-slate-900 border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400 text-[11px]">Scope</span>
              {state.covers_worldwide_assets === null ? (
                <span className="text-amber-500/80 text-[11px] flex items-center gap-1"><Clock className="w-3 h-3" /> Pending</span>
              ) : (
                <span className="text-emerald-400 font-medium text-[11px]">
                  {state.covers_worldwide_assets ? "Worldwide" : "Domestic Only"}
                </span>
              )}
            </div>

            <div className="p-2 rounded bg-slate-900 border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400 text-[11px]">Executor</span>
              {state.executor?.name ? (
                <span className="text-emerald-400 font-medium truncate max-w-[130px] text-[11px]">
                  {state.executor.name} ({state.executor.relationship || "fiduciary"})
                </span>
              ) : (
                <span className="text-amber-500/80 text-[11px] flex items-center gap-1"><Clock className="w-3 h-3" /> Pending</span>
              )}
            </div>

            <div className="p-2 rounded bg-slate-900 border border-slate-800 flex items-center justify-between col-span-2">
              <span className="text-slate-400 text-[11px]">Children / Issue</span>
              {state.has_children === null ? (
                <span className="text-amber-500/80 text-[11px] flex items-center gap-1"><Clock className="w-3 h-3" /> Pending</span>
              ) : state.has_children ? (
                <span className="text-emerald-400 font-medium text-[11px]">
                  {state.children_names?.length > 0 ? state.children_names.join(", ") : "Declared (pending names)"}
                </span>
              ) : (
                <span className="text-slate-400 text-[11px]">None declared</span>
              )}
            </div>
          </div>

          {/* Audit Log Strip: Real-time Field Diff Tracker */}
          {auditLogs.length > 0 && (
            <div className="mt-2.5 p-2 rounded bg-slate-950 border border-indigo-900/40 text-[11px]">
              <div className="flex items-center gap-1.5 text-indigo-400 font-semibold mb-1">
                <History className="w-3 h-3" />
                Correction Audit Trail ({auditLogs.length} modifications tracked)
              </div>
              <div className="max-h-16 overflow-y-auto space-y-1">
                {auditLogs.map((log, i) => (
                  <div key={i} className="font-mono text-[10px] text-slate-300 flex items-center justify-between">
                    <span><strong className="text-amber-400">{log.field}:</strong> {log.oldValue} → <span className="text-emerald-400">{log.newValue}</span></span>
                    <span className="text-slate-500">{log.timestamp}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* BOTTOM: Real-time Draft Document Preview */}
        <div className="flex-1 flex flex-col min-h-0 bg-slate-950">
          <div className="flex items-center justify-between px-5 py-2.5 border-b border-slate-800 bg-slate-900/60">
            <div className="flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-xs font-semibold text-slate-200 uppercase tracking-wide">
                Live Statutory Document Preview
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={copyToClipboard}
                className="flex items-center gap-1 px-2 py-1 text-[11px] rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                {copied ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                {copied ? "Copied" : "Copy"}
              </button>
              <button
                onClick={downloadDraft}
                className="flex items-center gap-1 px-2 py-1 text-[11px] rounded bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/30 transition-colors"
              >
                <Download className="w-3 h-3" />
                Download Draft
              </button>
            </div>
          </div>

          <div className="flex-1 p-5 overflow-y-auto bg-slate-950">
            <pre className="text-[11px] font-mono text-slate-300 leading-relaxed whitespace-pre-wrap selection:bg-indigo-900 selection:text-white">
              {draft || "Compiling draft document..."}
            </pre>
          </div>

          {/* Telemetry Bar */}
          <div className="px-5 py-1.5 border-t border-slate-800/80 bg-slate-900/90 text-[10px] font-mono text-slate-400 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span>Engine: <span className="text-slate-200">{telemetry.model}</span></span>
              <span>Latency: <span className="text-emerald-400">{telemetry.latencyMs} ms</span></span>
            </div>
            <div className="flex items-center gap-3">
              <span>Intake Turns: <span className="text-slate-200">{telemetry.turns}</span></span>
              <span>Status: <span className="text-emerald-400">{telemetry.status}</span></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}