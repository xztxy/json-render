"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useUIStream, type Spec } from "@json-render/react";
import { ExplorerRenderer } from "@/lib/render/renderer";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowUp, Loader2, Trash2, Clock, Sparkles } from "lucide-react";

// =============================================================================
// Suggested Queries
// =============================================================================

const SUGGESTIONS = [
  {
    label: "Weather comparison",
    prompt: "Compare the weather in New York, London, and Tokyo",
  },
  {
    label: "GitHub repo stats",
    prompt: "Show me stats for the vercel/next.js and vercel/ai GitHub repos",
  },
  {
    label: "Crypto dashboard",
    prompt: "Build a crypto dashboard for Bitcoin, Ethereum, and Solana",
  },
  {
    label: "Hacker News top stories",
    prompt: "Show me the top 15 Hacker News stories right now",
  },
];

// =============================================================================
// History
// =============================================================================

interface HistoryEntry {
  id: string;
  prompt: string;
  spec: Spec;
  createdAt: string;
}

function loadHistory(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("ai-sdk-explorer-history");
    return raw ? (JSON.parse(raw) as HistoryEntry[]) : [];
  } catch {
    return [];
  }
}

function saveHistory(entries: HistoryEntry[]) {
  try {
    // Keep only the last 20 entries
    const trimmed = entries.slice(0, 20);
    localStorage.setItem("ai-sdk-explorer-history", JSON.stringify(trimmed));
  } catch {
    // localStorage might be full or unavailable
  }
}

// =============================================================================
// Page
// =============================================================================

export default function ExplorerPage() {
  const [prompt, setPrompt] = useState("");
  const [currentPrompt, setCurrentPrompt] = useState("");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load history on mount
  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  const { spec, isStreaming, error, send, clear } = useUIStream({
    api: "/api/generate",
    onError: (err) => console.error("Explorer error:", err),
    onComplete: (completedSpec) => {
      if (completedSpec && currentPrompt) {
        const entry: HistoryEntry = {
          id: crypto.randomUUID(),
          prompt: currentPrompt,
          spec: completedSpec,
          createdAt: new Date().toISOString(),
        };
        setHistory((prev) => {
          const next = [entry, ...prev];
          saveHistory(next);
          return next;
        });
      }
    },
  });

  const handleSubmit = useCallback(
    async (text?: string) => {
      const p = text || prompt;
      if (!p.trim() || isStreaming) return;
      setCurrentPrompt(p);
      setPrompt("");
      setShowHistory(false);
      await send(p);
    },
    [prompt, isStreaming, send],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  const handleLoadHistory = useCallback(
    (entry: HistoryEntry) => {
      setCurrentPrompt(entry.prompt);
      setShowHistory(false);
      // Re-run the query
      handleSubmit(entry.prompt);
    },
    [handleSubmit],
  );

  const handleClearHistory = useCallback(() => {
    setHistory([]);
    saveHistory([]);
  }, []);

  const handleClear = useCallback(() => {
    clear();
    setCurrentPrompt("");
    setPrompt("");
    inputRef.current?.focus();
  }, [clear]);

  const hasResult = spec && Object.keys(spec.elements || {}).length > 0;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold">AI Data Explorer</h1>
          <span className="text-xs text-muted-foreground px-2 py-0.5 rounded-full bg-muted">
            json-render + AI SDK
          </span>
        </div>
        <div className="flex items-center gap-2">
          {history.length > 0 && (
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="p-2 rounded-md border border-border bg-card hover:bg-accent transition-colors relative"
              aria-label="History"
            >
              <Clock className="h-4 w-4" />
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center">
                {history.length}
              </span>
            </button>
          )}
          <ThemeToggle />
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col">
        {/* Empty state / prompt area */}
        {!hasResult && !isStreaming && !error ? (
          <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
            <div className="max-w-2xl w-full space-y-8">
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-semibold tracking-tight">
                  What would you like to explore?
                </h2>
                <p className="text-muted-foreground">
                  Ask about weather, GitHub repos, crypto prices, or Hacker News
                  -- the agent will fetch real data and build a dashboard.
                </p>
              </div>

              {/* Prompt input */}
              <div className="relative">
                <textarea
                  ref={inputRef}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="e.g., Compare weather in NYC, London, and Tokyo..."
                  rows={3}
                  className="w-full resize-none rounded-xl border border-input bg-card px-4 py-3 pr-12 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  autoFocus
                />
                <button
                  onClick={() => handleSubmit()}
                  disabled={!prompt.trim() || isStreaming}
                  className="absolute right-3 bottom-3 h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
              </div>

              {/* Suggestions */}
              <div className="flex flex-wrap gap-2 justify-center">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s.label}
                    onClick={() => handleSubmit(s.prompt)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  >
                    <Sparkles className="h-3 w-3" />
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Results area */
          <div className="flex-1 flex flex-col">
            {/* Current query bar */}
            <div className="border-b px-6 py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{currentPrompt}</p>
              </div>
              {isStreaming && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Generating...</span>
                </div>
              )}
              {!isStreaming && (
                <button
                  onClick={handleClear}
                  className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  title="New query"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Error display */}
            {error && (
              <div className="px-6 py-4">
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error.message}
                </div>
              </div>
            )}

            {/* Rendered dashboard */}
            <div className="flex-1 overflow-auto px-6 py-6">
              <ExplorerRenderer spec={spec} loading={isStreaming} />
            </div>

            {/* Follow-up input */}
            {!isStreaming && hasResult && (
              <div className="border-t px-6 py-3">
                <div className="max-w-2xl mx-auto relative">
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask a follow-up or try a new query..."
                    rows={2}
                    className="w-full resize-none rounded-xl border border-input bg-card px-4 py-3 pr-12 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                  <button
                    onClick={() => handleSubmit()}
                    disabled={!prompt.trim()}
                    className="absolute right-3 bottom-3 h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* History panel */}
      {showHistory && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="flex-1 bg-black/50"
            onClick={() => setShowHistory(false)}
          />
          <div className="w-80 bg-background border-l flex flex-col">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <h3 className="font-medium text-sm">History</h3>
              <button
                onClick={handleClearHistory}
                className="text-xs text-muted-foreground hover:text-destructive transition-colors"
              >
                Clear all
              </button>
            </div>
            <div className="flex-1 overflow-auto">
              {history.map((entry) => (
                <button
                  key={entry.id}
                  onClick={() => handleLoadHistory(entry)}
                  className="w-full text-left px-4 py-3 border-b hover:bg-accent transition-colors"
                >
                  <p className="text-sm font-medium truncate">{entry.prompt}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(entry.createdAt).toLocaleString()}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
