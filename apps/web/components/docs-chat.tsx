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

  const { messages, sendMessage, status, setMessages } = useChat({ transport });

  const isLoading = status === "streaming" || status === "submitted";

  // Auto-open when there are messages
  useEffect(() => {
    if (messages.length > 0 && !open) {
      setOpen(true);
    }
  }, [messages.length, open]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage({ text: input });
    setInput("");
  };

  const handleClear = () => {
    setMessages([]);
    setOpen(false);
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
      <div className="max-w-2xl mx-auto px-4 pb-4 pointer-events-auto">
        {/* Messages panel */}
        {open && messages.length > 0 && (
          <div className="mb-2 bg-background border border-border rounded-lg shadow-lg max-h-[60vh] overflow-y-auto">
            <div className="flex items-center justify-between px-4 py-2 border-b border-border">
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
            <div className="p-4 space-y-4">
              {messages.map((message) => {
                const text = getTextFromParts(message.parts);
                if (!text) return null;
                return (
                  <div key={message.id}>
                    <div
                      className={`text-xs font-medium mb-1 ${
                        message.role === "user"
                          ? "text-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      {message.role === "user" ? "You" : "Assistant"}
                    </div>
                    {message.role === "assistant" ? (
                      <div className="text-sm text-foreground/90 leading-relaxed prose prose-sm dark:prose-invert max-w-none">
                        <Streamdown>{text}</Streamdown>
                      </div>
                    ) : (
                      <div className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                        {text}
                      </div>
                    )}
                  </div>
                );
              })}
              {isLoading &&
                messages.length > 0 &&
                messages[messages.length - 1]?.role === "user" && (
                  <div>
                    <div className="text-xs font-medium mb-1 text-muted-foreground">
                      Assistant
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Searching docs...
                    </div>
                  </div>
                )}
              <div ref={messagesEndRef} />
            </div>
          </div>
        )}

        {/* Input bar */}
        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2 bg-background border border-border rounded-lg shadow-lg px-4 py-3"
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
            className="text-muted-foreground shrink-0"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about the docs..."
            disabled={isLoading}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30"
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
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
