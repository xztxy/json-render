import { getByPath, type StateModel, type StateStore } from "@json-render/core";
import { immutableSetByPath } from "@json-render/core/store-utils";
import type { StoreApi } from "zustand";

export type { StateStore } from "@json-render/core";

/**
 * Options for {@link zustandStateStore}.
 */
export interface ZustandStateStoreOptions<S extends StateModel = StateModel> {
  /** A Zustand vanilla store (created with `createStore` from `zustand/vanilla`). */
  store: StoreApi<S>;
  /**
   * Select the json-render state slice from the Zustand store state.
   * Defaults to `(state) => state` (the entire store is the state model).
   */
  selector?: (state: S) => StateModel;
  /**
   * Apply a state change back to the Zustand store.
   * Defaults to `(next, store) => store.setState(next)` which replaces the
   * full state. Override this if you use a selector and only want to update
   * a nested slice.
   */
  updater?: (nextState: StateModel, store: StoreApi<S>) => void;
}

/**
 * Create a {@link StateStore} backed by a Zustand store.
 *
 * @example
 * ```ts
 * import { createStore } from "zustand/vanilla";
 * import { zustandStateStore } from "@json-render/zustand";
 *
 * const bearStore = createStore(() => ({ count: 0, name: "Bear" }));
 *
 * const store = zustandStateStore({ store: bearStore });
 *
 * <StateProvider store={store}>...</StateProvider>
 * ```
 *
 * @example Using a selector for a nested slice:
 * ```ts
 * const appStore = createStore(() => ({
 *   ui: { count: 0 },
 *   auth: { token: null },
 * }));
 *
 * const store = zustandStateStore({
 *   store: appStore,
 *   selector: (s) => s.ui,
 *   updater: (next, s) => s.setState({ ui: next }),
 * });
 * ```
 */
export function zustandStateStore<S extends StateModel = StateModel>(
  options: ZustandStateStoreOptions<S>,
): StateStore {
  const {
    store,
    selector = (s: S) => s as StateModel,
    updater = (next, s) => s.setState(next as S, true),
  } = options;

  function getSnapshot(): StateModel {
    return selector(store.getState());
  }

  return {
    get(path: string): unknown {
      return getByPath(getSnapshot(), path);
    },

    set(path: string, value: unknown): void {
      const current = getSnapshot();
      if (getByPath(current, path) === value) return;
      const next = immutableSetByPath(current, path, value);
      updater(next, store);
    },

    update(updates: Record<string, unknown>): void {
      let next = getSnapshot();
      let changed = false;
      for (const [path, value] of Object.entries(updates)) {
        if (getByPath(next, path) !== value) {
          next = immutableSetByPath(next, path, value);
          changed = true;
        }
      }
      if (!changed) return;
      updater(next, store);
    },

    getSnapshot,

    getServerSnapshot: getSnapshot,

    subscribe(listener: () => void): () => void {
      let prev = getSnapshot();
      return store.subscribe(() => {
        const next = getSnapshot();
        if (next !== prev) {
          prev = next;
          listener();
        }
      });
    },
  };
}
