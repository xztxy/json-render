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
} from "@json-render/core";

/**
 * Parse a single JSON patch line
 */
function parsePatchLine(line: string): JsonPatch | null {
  try {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("//")) {
      return null;
    }
    return JSON.parse(trimmed) as JsonPatch;
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
  return getByPath(spec as unknown as Record<string, unknown>, path);
}

/**
 * Apply an RFC 6902 JSON patch to the current spec.
 * Supports add, remove, replace, move, copy, and test operations.
 */
function applyPatch(spec: Spec, patch: JsonPatch): Spec {
  const newSpec = { ...spec, elements: { ...spec.elements } };

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
  /**
   * Custom fetch implementation with ReadableStream support.
   *
   * React Native's built-in fetch does not support `response.body`
   * (ReadableStream). Pass a streaming-capable fetch here, e.g.
   * `import { fetch } from 'expo/fetch'`.
   *
   * Falls back to the global `fetch` if not provided.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fetch?: (url: string, init?: any) => Promise<Response>;
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
  fetch: fetchFn = globalThis.fetch,
}: UseUIStreamOptions): UseUIStreamReturn {
  const [spec, setSpec] = useState<Spec | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<Error | null>(null);
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

      // Start with previous spec if provided, otherwise empty spec
      const previousSpec = context?.previousSpec as Spec | undefined;
      let currentSpec: Spec =
        previousSpec && previousSpec.root
          ? { ...previousSpec, elements: { ...previousSpec.elements } }
          : { root: "", elements: {} };
      setSpec(currentSpec);

      try {
        const response = await fetchFn(api, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt,
            context,
            currentSpec,
          }),
          signal: abortControllerRef.current.signal,
        });

        console.log("[useUIStream] response status:", response.status);
        console.log(
          "[useUIStream] response headers:",
          JSON.stringify(
            Object.fromEntries((response.headers as any).entries?.() ?? []),
          ),
        );

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

        console.log(
          "[useUIStream] response.body type:",
          typeof response.body,
          "truthy:",
          !!response.body,
        );
        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("No response body");
        }

        const decoder = new TextDecoder();
        let buffer = "";
        let chunkCount = 0;
        let totalBytes = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            console.log(
              "[useUIStream] stream done. Total chunks:",
              chunkCount,
              "bytes:",
              totalBytes,
            );
            break;
          }

          chunkCount++;
          totalBytes += value?.byteLength ?? 0;
          const decoded = decoder.decode(value, { stream: true });
          buffer += decoded;

          if (chunkCount <= 5) {
            console.log(
              `[useUIStream] chunk #${chunkCount} (${value?.byteLength ?? 0}b):`,
              decoded.slice(0, 200),
            );
          }

          // Process complete lines
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const patch = parsePatchLine(line);
            if (patch) {
              console.log("[useUIStream] applied patch:", patch.op, patch.path);
              currentSpec = applyPatch(currentSpec, patch);
              setSpec({ ...currentSpec });
            } else if (line.trim()) {
              console.log(
                "[useUIStream] unparseable line:",
                line.slice(0, 200),
              );
            }
          }
        }

        // Process any remaining buffer
        if (buffer.trim()) {
          console.log("[useUIStream] remaining buffer:", buffer.slice(0, 200));
          const patch = parsePatchLine(buffer);
          if (patch) {
            currentSpec = applyPatch(currentSpec, patch);
            setSpec({ ...currentSpec });
          }
        }

        console.log(
          "[useUIStream] final spec root:",
          currentSpec.root,
          "elements:",
          Object.keys(currentSpec.elements).length,
        );
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
    [api, fetchFn, onComplete, onError],
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
