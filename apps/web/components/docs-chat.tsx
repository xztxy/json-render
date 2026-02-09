"use client";

import { useRef, useEffect, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Streamdown } from "streamdown";

const transport = new DefaultChatTransport({ api: "/api/docs-chat" });

export function DocsChat() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status, setMessages } = useChat({ transport });

  const isLoading = status === "streaming" || status === "submitted";

  // Auto-open when new messages arrive
  const prevMessageCount = useRef(0);
  useEffect(() => {
    if (messages.length > prevMessageCount.current) {
      setOpen(true);
    }
    prevMessageCount.current = messages.length;
  }, [messages.length]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Close message area when clicking outside
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage({ text: input });
    setInput("");
  };

  const handleClear = () => {
    setMessages([]);
    setOpen(false);
    inputRef.current?.focus();
  };

  const getTextFromParts = (
    parts: (typeof messages)[number]["parts"],
  ): string => {
    return parts
      .filter(
        (p): p is Extract<typeof p, { type: "text" }> => p.type === "text",
      )
      .map((p) => p.text)
      .join("");
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
      <div
        ref={containerRef}
        className="max-w-2xl mx-auto px-4 pb-4 [&>*]:pointer-events-auto"
      >
        {/* Messages panel */}
        {open && messages.length > 0 && (
          <div className="mb-2 bg-background border border-border rounded-lg shadow-lg max-h-[60vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-2 border-b border-border shrink-0">
              <span className="text-xs font-medium text-muted-foreground">
                Docs Assistant
              </span>
              <button
                onClick={handleClear}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Clear conversation"
              >
                Clear
              </button>
            </div>
            <div className="p-4 space-y-4 overflow-y-auto">
              {messages.map((message) => {
                const text = getTextFromParts(message.parts);
                if (!text) return null;
                return (
                  <div key={message.id}>
                    {message.role === "assistant" ? (
                      <div className="text-sm text-foreground/90 leading-relaxed prose prose-sm dark:prose-invert max-w-none">
                        <Streamdown>{text}</Streamdown>
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                        {text}
                      </div>
                    )}
                  </div>
                );
              })}
              {isLoading &&
                messages.length > 0 &&
                messages[messages.length - 1]?.role === "user" && (
                  <div className="text-sm text-muted-foreground">
                    Searching docs...
                  </div>
                )}
              <div ref={messagesEndRef} />
            </div>
          </div>
        )}

        {/* Input bar */}
        <form
          onSubmit={handleSubmit}
          onClick={() => inputRef.current?.focus()}
          className="flex items-center gap-2 bg-background border border-border rounded-lg shadow-lg px-4 py-3 cursor-text"
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about the docs..."
            onFocus={() => {
              if (messages.length > 0) setOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setOpen(false);
                inputRef.current?.blur();
              }
            }}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-primary text-primary-foreground rounded-md p-1 hover:bg-primary/90 transition-colors disabled:opacity-30"
            aria-label="Send message"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="19" x2="12" y2="5" />
              <polyline points="5 12 12 5 19 12" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
