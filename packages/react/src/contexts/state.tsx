"use client";

import React, {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  getByPath,
  createStateStore,
  flattenToPointers,
  type StateModel,
  type StateStore,
} from "@json-render/core";

/**
 * State context value
 */
export interface StateContextValue {
  /** The current state model */
  state: StateModel;
  /** Get a value by path */
  get: (path: string) => unknown;
  /** Set a value by path */
  set: (path: string, value: unknown) => void;
  /** Update multiple values at once */
  update: (updates: Record<string, unknown>) => void;
}

const StateContext = createContext<StateContextValue | null>(null);

/**
 * Props for StateProvider
 */
export interface StateProviderProps {
  /**
   * External store that owns the state. When provided, the provider operates
   * in **controlled mode** — `initialState` and `onStateChange` are ignored
   * and the store is the single source of truth.
   */
  store?: StateStore;
  /** Initial state model (used only in uncontrolled mode) */
  initialState?: StateModel;
  /** Callback when state changes (used only in uncontrolled mode) */
  onStateChange?: (path: string, value: unknown) => void;
  children: ReactNode;
}

/**
 * Provider for state model context.
 *
 * Supports two modes:
 * - **Controlled**: pass a `store` prop (e.g. backed by Redux / Zustand).
 * - **Uncontrolled** (default): omit `store` and optionally pass
 *   `initialState` / `onStateChange`.
 */
export function StateProvider({
  store: externalStore,
  initialState = {},
  onStateChange,
  children,
}: StateProviderProps) {
  const internalStoreRef = useRef<StateStore | undefined>(
    externalStore ? undefined : createStateStore(initialState),
  );

  const store = externalStore ?? internalStoreRef.current!;

  const initialModeRef = useRef(externalStore ? "controlled" : "uncontrolled");
  if (process.env.NODE_ENV !== "production") {
    const currentMode = externalStore ? "controlled" : "uncontrolled";
    if (currentMode !== initialModeRef.current) {
      console.warn(
        `StateProvider: switching from ${initialModeRef.current} to ${currentMode} mode is not supported.`,
      );
    }
  }

  const prevInitialJsonRef = useRef<string>(JSON.stringify(initialState));
  useEffect(() => {
    if (externalStore) return;
    const json = JSON.stringify(initialState);
    if (json !== prevInitialJsonRef.current) {
      prevInitialJsonRef.current = json;
      if (initialState && Object.keys(initialState).length > 0) {
        store.update(flattenToPointers(initialState));
      }
    }
  }, [externalStore, initialState, store]);

  const state = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot,
  );

  const onStateChangeRef = useRef(onStateChange);
  onStateChangeRef.current = onStateChange;

  const set = useCallback(
    (path: string, value: unknown) => {
      store.set(path, value);
      if (!externalStore) {
        onStateChangeRef.current?.(path, value);
      }
    },
    [store, externalStore],
  );

  const update = useCallback(
    (updates: Record<string, unknown>) => {
      store.update(updates);
      if (!externalStore) {
        for (const [path, value] of Object.entries(updates)) {
          onStateChangeRef.current?.(path, value);
        }
      }
    },
    [store, externalStore],
  );

  const get = useCallback((path: string) => store.get(path), [store]);

  const value = useMemo<StateContextValue>(
    () => ({ state, get, set, update }),
    [state, get, set, update],
  );

  return (
    <StateContext.Provider value={value}>{children}</StateContext.Provider>
  );
}

/**
 * Hook to access the state context
 */
export function useStateStore(): StateContextValue {
  const ctx = useContext(StateContext);
  if (!ctx) {
    throw new Error("useStateStore must be used within a StateProvider");
  }
  return ctx;
}

/**
 * Hook to get a value from the state model
 */
export function useStateValue<T>(path: string): T | undefined {
  const { state } = useStateStore();
  return getByPath(state, path) as T | undefined;
}

/**
 * Hook to get and set a value from the state model (like useState).
 *
 * @deprecated Use {@link useBoundProp} with `$bindState` expressions instead.
 * `useStateBinding` takes a raw state path string, while `useBoundProp` works
 * with the renderer's `bindings` map and supports both `$bindState` and
 * `$bindItem` expressions.
 */
export function useStateBinding<T>(
  path: string,
): [T | undefined, (value: T) => void] {
  const { state, set } = useStateStore();
  const value = getByPath(state, path) as T | undefined;
  const setValue = useCallback(
    (newValue: T) => set(path, newValue),
    [path, set],
  );
  return [value, setValue];
}
