"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type {
  Spec,
  UIElement,
  FlatElement,
  JsonPatch,
} from "@json-render/core";
import {
  setByPath,
  getByPath,
  addByPath,
  removeByPath,
  createMixedStreamParser,
  applySpecPatch,
} from "@json-render/core";

/**
 * Token usage metadata from AI generation
 */
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/**
 * Parse result for a single line -- either a patch or usage metadata
 */
type ParsedLine =
  | { type: "patch"; patch: JsonPatch }
  | { type: "usage"; usage: TokenUsage }
  | null;

/**
 * Parse a single JSON line (patch or metadata)
 */
function parseLine(line: string): ParsedLine {
  try {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("//")) {
      return null;
    }
    const parsed = JSON.parse(trimmed);

    // Check for usage metadata
    if (parsed.__meta === "usage") {
      return {
        type: "usage",
        usage: {
          promptTokens: parsed.promptTokens ?? 0,
          completionTokens: parsed.completionTokens ?? 0,
          totalTokens: parsed.totalTokens ?? 0,
        },
      };
    }

    return { type: "patch", patch: parsed as JsonPatch };
  } catch {
    return null;
  }
}

/**
 * Set a value at a spec path (for add/replace operations).
 */
function setSpecValue(newSpec: Spec, path: string, value: unknown): void {
  if (path === "/root") {
    newSpec.root = value as string;
    return;
  }

  if (path === "/state") {
    newSpec.state = value as Record<string, unknown>;
    return;
  }

  if (path.startsWith("/state/")) {
    if (!newSpec.state) newSpec.state = {};
    const statePath = path.slice("/state".length); // e.g. "/posts"
    setByPath(newSpec.state as Record<string, unknown>, statePath, value);
    return;
  }

  if (path.startsWith("/elements/")) {
    const pathParts = path.slice("/elements/".length).split("/");
    const elementKey = pathParts[0];
    if (!elementKey) return;

    if (pathParts.length === 1) {
      newSpec.elements[elementKey] = value as UIElement;
    } else {
      const element = newSpec.elements[elementKey];
      if (element) {
        const propPath = "/" + pathParts.slice(1).join("/");
        const newElement = { ...element };
        setByPath(
          newElement as unknown as Record<string, unknown>,
          propPath,
          value,
        );
        newSpec.elements[elementKey] = newElement;
      }
    }
  }
}

/**
 * Remove a value at a spec path.
 */
function removeSpecValue(newSpec: Spec, path: string): void {
  if (path === "/state") {
    delete newSpec.state;
    return;
  }

  if (path.startsWith("/state/") && newSpec.state) {
    const statePath = path.slice("/state".length);
    removeByPath(newSpec.state as Record<string, unknown>, statePath);
    return;
  }

  if (path.startsWith("/elements/")) {
    const pathParts = path.slice("/elements/".length).split("/");
    const elementKey = pathParts[0];
    if (!elementKey) return;

    if (pathParts.length === 1) {
      const { [elementKey]: _, ...rest } = newSpec.elements;
      newSpec.elements = rest;
    } else {
      const element = newSpec.elements[elementKey];
      if (element) {
        const propPath = "/" + pathParts.slice(1).join("/");
        const newElement = { ...element };
        removeByPath(
          newElement as unknown as Record<string, unknown>,
          propPath,
        );
        newSpec.elements[elementKey] = newElement;
      }
    }
  }
}

/**
 * Get a value at a spec path.
 */
function getSpecValue(spec: Spec, path: string): unknown {
  if (path === "/root") return spec.root;
  if (path === "/state") return spec.state;
  if (path.startsWith("/state/") && spec.state) {
    const statePath = path.slice("/state".length);
    return getByPath(spec.state as Record<string, unknown>, statePath);
  }
  return getByPath(spec as unknown as Record<string, unknown>, path);
}

/**
 * Apply an RFC 6902 JSON patch to the current spec.
 * Supports add, remove, replace, move, copy, and test operations.
 */
function applyPatch(spec: Spec, patch: JsonPatch): Spec {
  const newSpec = {
    ...spec,
    elements: { ...spec.elements },
    ...(spec.state ? { state: { ...spec.state } } : {}),
  };

  switch (patch.op) {
    case "add":
    case "replace": {
      setSpecValue(newSpec, patch.path, patch.value);
      break;
    }
    case "remove": {
      removeSpecValue(newSpec, patch.path);
      break;
    }
    case "move": {
      if (!patch.from) break;
      const moveValue = getSpecValue(newSpec, patch.from);
      removeSpecValue(newSpec, patch.from);
      setSpecValue(newSpec, patch.path, moveValue);
      break;
    }
    case "copy": {
      if (!patch.from) break;
      const copyValue = getSpecValue(newSpec, patch.from);
      setSpecValue(newSpec, patch.path, copyValue);
      break;
    }
    case "test": {
      // test is a no-op for rendering purposes (validation only)
      break;
    }
  }

  return newSpec;
}

/**
 * Options for useUIStream
 */
export interface UseUIStreamOptions {
  /** API endpoint */
  api: string;
  /** Callback when complete */
  onComplete?: (spec: Spec) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
}

/**
 * Return type for useUIStream
 */
export interface UseUIStreamReturn {
  /** Current UI spec */
  spec: Spec | null;
  /** Whether currently streaming */
  isStreaming: boolean;
  /** Error if any */
  error: Error | null;
  /** Token usage from the last generation */
  usage: TokenUsage | null;
  /** Raw JSONL lines received from the stream (JSON patch lines) */
  rawLines: string[];
  /** Send a prompt to generate UI */
  send: (prompt: string, context?: Record<string, unknown>) => Promise<void>;
  /** Clear the current spec */
  clear: () => void;
}

/**
 * Hook for streaming UI generation
 */
export function useUIStream({
  api,
  onComplete,
  onError,
}: UseUIStreamOptions): UseUIStreamReturn {
  const [spec, setSpec] = useState<Spec | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [usage, setUsage] = useState<TokenUsage | null>(null);
  const [rawLines, setRawLines] = useState<string[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  const clear = useCallback(() => {
    setSpec(null);
    setError(null);
  }, []);

  const send = useCallback(
    async (prompt: string, context?: Record<string, unknown>) => {
      // Abort any existing request
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();

      setIsStreaming(true);
      setError(null);
      setUsage(null);
      setRawLines([]);

      // Start with previous spec if provided, otherwise empty spec
      const previousSpec = context?.previousSpec as Spec | undefined;
      let currentSpec: Spec =
        previousSpec && previousSpec.root
          ? { ...previousSpec, elements: { ...previousSpec.elements } }
          : { root: "", elements: {} };
      setSpec(currentSpec);

      try {
        const response = await fetch(api, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt,
            context,
            currentSpec,
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          // Try to parse JSON error response for better error messages
          let errorMessage = `HTTP error: ${response.status}`;
          try {
            const errorData = await response.json();
            if (errorData.message) {
              errorMessage = errorData.message;
            } else if (errorData.error) {
              errorMessage = errorData.error;
            }
          } catch {
            // Ignore JSON parsing errors, use default message
          }
          throw new Error(errorMessage);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("No response body");
        }

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Process complete lines
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            const result = parseLine(trimmed);
            if (!result) continue;
            if (result.type === "usage") {
              setUsage(result.usage);
            } else {
              setRawLines((prev) => [...prev, trimmed]);
              currentSpec = applyPatch(currentSpec, result.patch);
              setSpec({ ...currentSpec });
            }
          }
        }

        // Process any remaining buffer
        if (buffer.trim()) {
          const trimmed = buffer.trim();
          const result = parseLine(trimmed);
          if (result) {
            if (result.type === "usage") {
              setUsage(result.usage);
            } else {
              setRawLines((prev) => [...prev, trimmed]);
              currentSpec = applyPatch(currentSpec, result.patch);
              setSpec({ ...currentSpec });
            }
          }
        }

        onComplete?.(currentSpec);
      } catch (err) {
        if ((err as Error).name === "AbortError") {
          return;
        }
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        onError?.(error);
      } finally {
        setIsStreaming(false);
      }
    },
    [api, onComplete, onError],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  return {
    spec,
    isStreaming,
    error,
    usage,
    rawLines,
    send,
    clear,
  };
}

/**
 * Convert a flat element list to a Spec.
 * Input elements use key/parentKey to establish identity and relationships.
 * Output spec uses the map-based format where key is the map entry key
 * and parent-child relationships are expressed through children arrays.
 */
export function flatToTree(elements: FlatElement[]): Spec {
  const elementMap: Record<string, UIElement> = {};
  let root = "";

  // First pass: add all elements to map
  for (const element of elements) {
    elementMap[element.key] = {
      type: element.type,
      props: element.props,
      children: [],
      visible: element.visible,
    };
  }

  // Second pass: build parent-child relationships
  for (const element of elements) {
    if (element.parentKey) {
      const parent = elementMap[element.parentKey];
      if (parent) {
        if (!parent.children) {
          parent.children = [];
        }
        parent.children.push(element.key);
      }
    } else {
      root = element.key;
    }
  }

  return { root, elements: elementMap };
}

// =============================================================================
// useChatUI — Chat + GenUI hook
// =============================================================================

/**
 * A single message in the chat, which may contain text, a rendered UI spec, or both.
 */
export interface ChatMessage {
  /** Unique message ID */
  id: string;
  /** Who sent this message */
  role: "user" | "assistant";
  /** Text content (conversational prose) */
  text: string;
  /** json-render Spec built from JSONL patches (null if no UI was generated) */
  spec: Spec | null;
}

/**
 * Options for useChatUI
 */
export interface UseChatUIOptions {
  /** API endpoint that accepts `{ messages: Array<{ role, content }> }` and returns a text stream */
  api: string;
  /** Callback when streaming completes for a message */
  onComplete?: (message: ChatMessage) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
}

/**
 * Return type for useChatUI
 */
export interface UseChatUIReturn {
  /** All messages in the conversation */
  messages: ChatMessage[];
  /** Whether currently streaming an assistant response */
  isStreaming: boolean;
  /** Error from the last request, if any */
  error: Error | null;
  /** Send a user message */
  send: (text: string) => Promise<void>;
  /** Clear all messages and reset the conversation */
  clear: () => void;
}

let chatMessageIdCounter = 0;
function generateChatId(): string {
  chatMessageIdCounter += 1;
  return `msg-${Date.now()}-${chatMessageIdCounter}`;
}

/**
 * Hook for chat + GenUI experiences.
 *
 * Manages a multi-turn conversation where each assistant message can contain
 * both conversational text and a json-render UI spec. The hook sends the full
 * message history to the API endpoint, reads the streamed response, and
 * separates text lines from JSONL patch lines using `createMixedStreamParser`.
 *
 * @example
 * ```tsx
 * const { messages, isStreaming, send, clear } = useChatUI({
 *   api: "/api/chat",
 * });
 *
 * // Send a message
 * await send("Compare weather in NYC and Tokyo");
 *
 * // Render messages
 * {messages.map((msg) => (
 *   <div key={msg.id}>
 *     {msg.text && <p>{msg.text}</p>}
 *     {msg.spec && <MyRenderer spec={msg.spec} />}
 *   </div>
 * ))}
 * ```
 */
export function useChatUI({
  api,
  onComplete,
  onError,
}: UseChatUIOptions): UseChatUIReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const clear = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  const send = useCallback(
    async (text: string) => {
      if (!text.trim()) return;

      // Abort any existing request
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();

      const userMessage: ChatMessage = {
        id: generateChatId(),
        role: "user",
        text: text.trim(),
        spec: null,
      };

      const assistantId = generateChatId();
      const assistantMessage: ChatMessage = {
        id: assistantId,
        role: "assistant",
        text: "",
        spec: null,
      };

      // Append user message and empty assistant placeholder
      setMessages((prev) => [...prev, userMessage, assistantMessage]);
      setIsStreaming(true);
      setError(null);

      // Build messages array for the API (full conversation history + new message)
      const historyForApi = [
        ...messages.map((m) => ({
          role: m.role,
          content: m.text,
        })),
        { role: "user" as const, content: text.trim() },
      ];

      // Mutable state for accumulating the assistant response
      let accumulatedText = "";
      let currentSpec: Spec = { root: "", elements: {} };
      let hasSpec = false;

      try {
        const response = await fetch(api, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: historyForApi }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          let errorMessage = `HTTP error: ${response.status}`;
          try {
            const errorData = await response.json();
            if (errorData.message) {
              errorMessage = errorData.message;
            } else if (errorData.error) {
              errorMessage = errorData.error;
            }
          } catch {
            // Ignore JSON parsing errors
          }
          throw new Error(errorMessage);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("No response body");
        }

        const decoder = new TextDecoder();

        // Use createMixedStreamParser to classify lines
        const parser = createMixedStreamParser({
          onPatch(patch) {
            hasSpec = true;
            applySpecPatch(currentSpec, patch);
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? {
                      ...m,
                      spec: {
                        root: currentSpec.root,
                        elements: { ...currentSpec.elements },
                        ...(currentSpec.state
                          ? { state: { ...currentSpec.state } }
                          : {}),
                      },
                    }
                  : m,
              ),
            );
          },
          onText(line) {
            accumulatedText += (accumulatedText ? "\n" : "") + line;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, text: accumulatedText } : m,
              ),
            );
          },
        });

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          parser.push(decoder.decode(value, { stream: true }));
        }
        parser.flush();

        // Build final message for onComplete callback
        const finalMessage: ChatMessage = {
          id: assistantId,
          role: "assistant",
          text: accumulatedText,
          spec: hasSpec
            ? {
                root: currentSpec.root,
                elements: { ...currentSpec.elements },
                ...(currentSpec.state
                  ? { state: { ...currentSpec.state } }
                  : {}),
              }
            : null,
        };
        onComplete?.(finalMessage);
      } catch (err) {
        if ((err as Error).name === "AbortError") {
          return;
        }
        const resolvedError =
          err instanceof Error ? err : new Error(String(err));
        setError(resolvedError);
        // Remove empty assistant message on error
        setMessages((prev) =>
          prev.filter((m) => m.id !== assistantId || m.text.length > 0),
        );
        onError?.(resolvedError);
      } finally {
        setIsStreaming(false);
      }
    },
    [api, messages, onComplete, onError],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  return {
    messages,
    isStreaming,
    error,
    send,
    clear,
  };
}
