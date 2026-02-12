"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import type { JsonPatch, Spec } from "@json-render/core";
import { buildSpecFromParts } from "@json-render/react";
import { ExplorerRenderer } from "@/lib/render/renderer";
import { ThemeToggle } from "@/components/theme-toggle";
import { ArrowUp, Loader2, Sparkles, User, Bot, Trash2 } from "lucide-react";
import { Streamdown } from "streamdown";
import { code } from "@streamdown/code";

// =============================================================================
// Types
// =============================================================================

type AppDataParts = { jsonrender: JsonPatch };
type AppMessage = UIMessage<unknown, AppDataParts>;

// =============================================================================
// Transport
// =============================================================================

const transport = new DefaultChatTransport({ api: "/api/generate" });

// =============================================================================
// Suggestions (shown in empty state)
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
// SpecFromParts — derives Spec from data-jsonrender parts via useMemo
// =============================================================================

function useSpecFromParts(parts: AppMessage["parts"]): Spec | null {
  return useMemo(() => buildSpecFromParts(parts), [parts]);
}

// =============================================================================
// Message Bubble
// =============================================================================

function MessageBubble({
  message,
  isLast,
  isStreaming,
}: {
  message: AppMessage;
  isLast: boolean;
  isStreaming: boolean;
}) {
  const isUser = message.role === "user";
  const spec = useSpecFromParts(message.parts);

  // Gather all text from text parts.
  // Each agent step produces a separate TextUIPart — join with double newline
  // so Streamdown renders them as distinct paragraphs.
  const text = useMemo(
    () =>
      message.parts
        .filter((p): p is { type: "text"; text: string } => p.type === "text")
        .map((p) => p.text.trim())
        .filter(Boolean)
        .join("\n\n"),
    [message.parts],
  );

  const hasSpec = spec && Object.keys(spec.elements || {}).length > 0;
  const showLoader =
    isLast && isStreaming && message.role === "assistant" && !text && !hasSpec;

  if (isUser) {
    return (
      <div className="flex justify-end">
        {text && (
          <div className="max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap bg-primary text-primary-foreground rounded-tr-md">
            {text}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Text content */}
      {text && (
        <div className="text-sm leading-relaxed [&_p+p]:mt-3 [&_ul]:mt-2 [&_ol]:mt-2 [&_pre]:mt-2">
          <Streamdown plugins={{ code }} animated={isLast && isStreaming}>
            {text}
          </Streamdown>
        </div>
      )}

      {/* Loading indicator */}
      {showLoader && (
        <div className="text-sm text-muted-foreground flex items-center gap-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>Thinking...</span>
        </div>
      )}

      {/* Rendered UI spec */}
      {hasSpec && (
        <div className="w-full max-w-[800px] rounded-xl border bg-card p-4 shadow-sm">
          <ExplorerRenderer spec={spec} loading={isLast && isStreaming} />
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Page
// =============================================================================

export default function ChatPage() {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { messages, sendMessage, setMessages, status, error } =
    useChat<AppMessage>({ transport });

  const isStreaming = status === "streaming" || status === "submitted";

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  const handleSubmit = useCallback(
    async (text?: string) => {
      const message = text || input;
      if (!message.trim() || isStreaming) return;
      setInput("");
      await sendMessage({ text: message.trim() });
    },
    [input, isStreaming, sendMessage],
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

  const handleClear = useCallback(() => {
    setMessages([]);
    setInput("");
    inputRef.current?.focus();
  }, [setMessages]);

  const isEmpty = messages.length === 0;

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <header className="border-b px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold">AI Data Explorer</h1>
          <span className="text-xs text-muted-foreground px-2 py-0.5 rounded-full bg-muted">
            json-render + AI SDK
          </span>
        </div>
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button
              onClick={handleClear}
              className="p-2 rounded-md border border-border bg-card hover:bg-accent transition-colors"
              aria-label="New chat"
              title="New chat"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          <ThemeToggle />
        </div>
      </header>

      {/* Messages area */}
      <main className="flex-1 overflow-auto">
        {isEmpty ? (
          /* Empty state */
          <div className="h-full flex flex-col items-center justify-center px-6 py-12">
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
          /* Message thread */
          <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
            {messages.map((message, index) => (
              <MessageBubble
                key={message.id}
                message={message}
                isLast={index === messages.length - 1}
                isStreaming={isStreaming}
              />
            ))}

            {/* Error display */}
            {error && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error.message}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </main>

      {/* Input bar - always visible at bottom */}
      <div className="px-6 pb-3 flex-shrink-0 bg-background">
        <div className="max-w-4xl mx-auto relative">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isEmpty
                ? "e.g., Compare weather in NYC, London, and Tokyo..."
                : "Ask a follow-up..."
            }
            rows={2}
            className="w-full resize-none rounded-xl border border-input bg-card px-4 py-3 pr-12 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            autoFocus
          />
          <button
            onClick={() => handleSubmit()}
            disabled={!input.trim() || isStreaming}
            className="absolute right-3 bottom-3 h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isStreaming ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowUp className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
