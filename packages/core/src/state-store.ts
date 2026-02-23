import {
  getByPath,
  setByPath,
  type StateModel,
  type StateStore,
} from "./types";

/**
 * Create a simple in-memory {@link StateStore}.
 *
 * This is the default store used by `StateProvider` when no external store is
 * provided. It mirrors the previous `useState`-based behaviour but is
 * framework-agnostic so it can also be used in tests or non-React contexts.
 */
export function createStateStore(initialState: StateModel = {}): StateStore {
  let state: StateModel = { ...initialState };
  const listeners = new Set<() => void>();

  function notify() {
    for (const listener of listeners) {
      listener();
    }
  }

  return {
    get(path: string): unknown {
      return getByPath(state, path);
    },

    set(path: string, value: unknown): void {
      if (getByPath(state, path) === value) return;
      const next = { ...state };
      setByPath(next, path, value);
      state = next;
      notify();
    },

    update(updates: Record<string, unknown>): void {
      let changed = false;
      const next = { ...state };
      for (const [path, value] of Object.entries(updates)) {
        if (getByPath(next, path) !== value) {
          setByPath(next, path, value);
          changed = true;
        }
      }
      if (!changed) return;
      state = next;
      notify();
    },

    getSnapshot(): StateModel {
      return state;
    },

    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

/**
 * Recursively flatten a plain object into a `Record<string, unknown>` keyed by
 * JSON Pointer paths. Only leaf values (non-plain-object) appear in the output.
 *
 * ```ts
 * flattenToPointers({ user: { name: "Alice" }, count: 1 })
 * // => { "/user/name": "Alice", "/count": 1 }
 * ```
 */
export function flattenToPointers(
  obj: Record<string, unknown>,
  prefix = "",
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const pointer = `${prefix}/${key}`;
    if (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      Object.getPrototypeOf(value) === Object.prototype
    ) {
      Object.assign(
        result,
        flattenToPointers(value as Record<string, unknown>, pointer),
      );
    } else {
      result[pointer] = value;
    }
  }
  return result;
}
