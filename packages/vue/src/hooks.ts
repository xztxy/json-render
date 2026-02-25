import {
  ref,
  computed,
  watch,
  onBeforeUnmount,
  type ComputedRef,
  type Ref,
} from "vue";
import type {
  Spec,
  UIElement,
  FlatElement,
  JsonPatch,
  SpecDataPart,
} from "@json-render/core";
import {
  setByPath,
  getByPath,
  addByPath,
  removeByPath,
  createMixedStreamParser,
  applySpecPatch,
  nestedToFlat,
  SPEC_DATA_PART_TYPE,
} from "@json-render/core";
import { useStateStore } from "./composables/state.js";

/**
 * Token usage metadata from AI generation
 */
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

type ParsedLine =
  | { type: "patch"; patch: JsonPatch }
  | { type: "usage"; usage: TokenUsage }
  | null;

function parseLine(line: string): ParsedLine {
  try {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("//")) {
      return null;
    }
    const parsed = JSON.parse(trimmed);

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
    const statePath = path.slice("/state".length);
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

function getSpecValue(spec: Spec, path: string): unknown {
  if (path === "/root") return spec.root;
  if (path === "/state") return spec.state;
  if (path.startsWith("/state/") && spec.state) {
    const statePath = path.slice("/state".length);
    return getByPath(spec.state as Record<string, unknown>, statePath);
  }
  return getByPath(spec as unknown as Record<string, unknown>, path);
}

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
      break;
    }
  }

  return newSpec;
}

// =============================================================================
// useUIStream
// =============================================================================

export interface UseUIStreamOptions {
  api: string;
  onComplete?: (spec: Spec) => void;
  onError?: (error: Error) => void;
}

export interface UseUIStreamReturn {
  spec: Ref<Spec | null>;
  isStreaming: Ref<boolean>;
  error: Ref<Error | null>;
  usage: Ref<TokenUsage | null>;
  rawLines: Ref<string[]>;
  send: (prompt: string, context?: Record<string, unknown>) => Promise<void>;
  clear: () => void;
}

export function useUIStream({
  api,
  onComplete,
  onError,
}: UseUIStreamOptions): UseUIStreamReturn {
  const spec = ref<Spec | null>(null);
  const isStreaming = ref(false);
  const error = ref<Error | null>(null);
  const usage = ref<TokenUsage | null>(null);
  const rawLines = ref<string[]>([]);
  let abortController: AbortController | null = null;

  const clear = () => {
    spec.value = null;
    error.value = null;
  };

  const send = async (
    prompt: string,
    context?: Record<string, unknown>,
  ): Promise<void> => {
    abortController?.abort();
    abortController = new AbortController();

    isStreaming.value = true;
    error.value = null;
    usage.value = null;
    rawLines.value = [];

    const previousSpec = context?.previousSpec as Spec | undefined;
    let currentSpec: Spec =
      previousSpec && previousSpec.root
        ? { ...previousSpec, elements: { ...previousSpec.elements } }
        : { root: "", elements: {} };
    spec.value = currentSpec;

    try {
      const response = await fetch(api, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, context, currentSpec }),
        signal: abortController.signal,
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
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          const result = parseLine(trimmed);
          if (!result) continue;
          if (result.type === "usage") {
            usage.value = result.usage;
          } else {
            rawLines.value = [...rawLines.value, trimmed];
            currentSpec = applyPatch(currentSpec, result.patch);
            spec.value = { ...currentSpec };
          }
        }
      }

      if (buffer.trim()) {
        const trimmed = buffer.trim();
        const result = parseLine(trimmed);
        if (result) {
          if (result.type === "usage") {
            usage.value = result.usage;
          } else {
            rawLines.value = [...rawLines.value, trimmed];
            currentSpec = applyPatch(currentSpec, result.patch);
            spec.value = { ...currentSpec };
          }
        }
      }

      onComplete?.(currentSpec);
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        return;
      }
      const resolvedError = err instanceof Error ? err : new Error(String(err));
      error.value = resolvedError;
      onError?.(resolvedError);
    } finally {
      isStreaming.value = false;
    }
  };

  onBeforeUnmount(() => {
    abortController?.abort();
  });

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

// =============================================================================
// flatToTree
// =============================================================================

export function flatToTree(elements: FlatElement[]): Spec {
  const elementMap: Record<string, UIElement> = {};
  let root = "";

  for (const element of elements) {
    elementMap[element.key] = {
      type: element.type,
      props: element.props,
      children: [],
      visible: element.visible,
    };
  }

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
// buildSpecFromParts / getTextFromParts
// =============================================================================

export interface DataPart {
  type: string;
  text?: string;
  data?: unknown;
}

function isSpecDataPart(data: unknown): data is SpecDataPart {
  if (typeof data !== "object" || data === null) return false;
  const obj = data as Record<string, unknown>;
  switch (obj.type) {
    case "patch":
      return typeof obj.patch === "object" && obj.patch !== null;
    case "flat":
    case "nested":
      return typeof obj.spec === "object" && obj.spec !== null;
    default:
      return false;
  }
}

export function buildSpecFromParts(parts: DataPart[]): Spec | null {
  const spec: Spec = { root: "", elements: {} };
  let hasSpec = false;

  for (const part of parts) {
    if (part.type === SPEC_DATA_PART_TYPE) {
      if (!isSpecDataPart(part.data)) continue;
      const payload = part.data;
      if (payload.type === "patch") {
        hasSpec = true;
        applySpecPatch(spec, payload.patch);
      } else if (payload.type === "flat") {
        hasSpec = true;
        Object.assign(spec, payload.spec);
      } else if (payload.type === "nested") {
        hasSpec = true;
        const flat = nestedToFlat(payload.spec);
        Object.assign(spec, flat);
      }
    }
  }

  return hasSpec ? spec : null;
}

export function getTextFromParts(parts: DataPart[]): string {
  return parts
    .filter(
      (p): p is DataPart & { text: string } =>
        p.type === "text" && typeof p.text === "string",
    )
    .map((p) => p.text.trim())
    .filter(Boolean)
    .join("\n\n");
}

// =============================================================================
// useJsonRenderMessage
// =============================================================================

export function useJsonRenderMessage(parts: Ref<DataPart[]>) {
  const result = ref<{ spec: Spec | null; text: string }>({
    spec: null,
    text: "",
  });

  let prevParts: DataPart[] = [];

  watch(
    parts,
    (newParts) => {
      const partsChanged =
        newParts !== prevParts &&
        (newParts.length !== prevParts.length ||
          newParts[newParts.length - 1] !== prevParts[prevParts.length - 1]);

      if (partsChanged || prevParts.length === 0) {
        prevParts = newParts;
        result.value = {
          spec: buildSpecFromParts(newParts),
          text: getTextFromParts(newParts),
        };
      }
    },
    { immediate: true, deep: true },
  );

  return {
    spec: computed(() => result.value.spec),
    text: computed(() => result.value.text),
    hasSpec: computed(() => {
      const s = result.value.spec;
      return s !== null && Object.keys(s.elements || {}).length > 0;
    }),
    result,
  };
}

// =============================================================================
// useChatUI
// =============================================================================

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  spec: Spec | null;
}

export interface UseChatUIOptions {
  api: string;
  onComplete?: (message: ChatMessage) => void;
  onError?: (error: Error) => void;
}

export interface UseChatUIReturn {
  messages: Ref<ChatMessage[]>;
  isStreaming: Ref<boolean>;
  error: Ref<Error | null>;
  send: (text: string) => Promise<void>;
  clear: () => void;
}

let chatMessageIdCounter = 0;
function generateChatId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  chatMessageIdCounter += 1;
  return `msg-${Date.now()}-${chatMessageIdCounter}`;
}

export function useChatUI({
  api,
  onComplete,
  onError,
}: UseChatUIOptions): UseChatUIReturn {
  const messages = ref<ChatMessage[]>([]);
  const isStreaming = ref(false);
  const error = ref<Error | null>(null);
  let abortController: AbortController | null = null;

  const clear = () => {
    messages.value = [];
    error.value = null;
  };

  const send = async (text: string): Promise<void> => {
    if (!text.trim()) return;

    abortController?.abort();
    abortController = new AbortController();

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

    messages.value = [...messages.value, userMessage, assistantMessage];
    isStreaming.value = true;
    error.value = null;

    const historyForApi = [
      ...messages.value
        .filter((m) => m.id !== assistantId)
        .map((m) => ({
          role: m.role,
          content: m.text,
        })),
    ];

    let accumulatedText = "";
    let currentSpec: Spec = { root: "", elements: {} };
    let hasSpec = false;

    try {
      const response = await fetch(api, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: historyForApi }),
        signal: abortController.signal,
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

      const parser = createMixedStreamParser({
        onPatch(patch) {
          hasSpec = true;
          applySpecPatch(currentSpec, patch);
          messages.value = messages.value.map((m) =>
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
          );
        },
        onText(line) {
          accumulatedText += (accumulatedText ? "\n" : "") + line;
          messages.value = messages.value.map((m) =>
            m.id === assistantId ? { ...m, text: accumulatedText } : m,
          );
        },
      });

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        parser.push(decoder.decode(value, { stream: true }));
      }
      parser.flush();

      const finalMessage: ChatMessage = {
        id: assistantId,
        role: "assistant",
        text: accumulatedText,
        spec: hasSpec
          ? {
              root: currentSpec.root,
              elements: { ...currentSpec.elements },
              ...(currentSpec.state ? { state: { ...currentSpec.state } } : {}),
            }
          : null,
      };
      onComplete?.(finalMessage);
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        return;
      }
      const resolvedError = err instanceof Error ? err : new Error(String(err));
      error.value = resolvedError;
      messages.value = messages.value.filter(
        (m) => m.id !== assistantId || m.text.length > 0,
      );
      onError?.(resolvedError);
    } finally {
      isStreaming.value = false;
    }
  };

  onBeforeUnmount(() => {
    abortController?.abort();
  });

  return {
    messages,
    isStreaming,
    error,
    send,
    clear,
  };
}

// =============================================================================
// useBoundProp
// =============================================================================

export function useBoundProp<T>(
  propValue: T | undefined,
  bindingPath: string | undefined,
): [T | undefined, (value: T) => void] {
  const { set } = useStateStore();
  const setValue = (value: T) => {
    if (bindingPath) set(bindingPath, value);
  };
  return [propValue, setValue];
}
