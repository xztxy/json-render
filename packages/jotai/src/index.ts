import { getByPath, type StateModel, type StateStore } from "@json-render/core";
import { immutableSetByPath } from "@json-render/core/store-utils";
import type { WritableAtom } from "jotai";
import { createStore as createJotaiStore } from "jotai/vanilla";

export type { StateStore } from "@json-render/core";

type JotaiStore = ReturnType<typeof createJotaiStore>;

/**
 * Options for {@link jotaiStateStore}.
 */
export interface JotaiStateStoreOptions {
  /** A writable atom that holds the json-render state model. */
  atom: WritableAtom<StateModel, [StateModel], void>;
  /**
   * The Jotai store instance. Defaults to `createStore()` from `jotai/vanilla`.
   * Pass your own if you use a `<Provider store={...}>` in your React tree.
   */
  store?: JotaiStore;
}

/**
 * Create a {@link StateStore} backed by a Jotai atom.
 *
 * @example
 * ```ts
 * import { atom } from "jotai";
 * import { jotaiStateStore } from "@json-render/jotai";
 *
 * const uiAtom = atom<Record<string, unknown>>({ count: 0 });
 *
 * const store = jotaiStateStore({ atom: uiAtom });
 *
 * <StateProvider store={store}>...</StateProvider>
 * ```
 *
 * @example With a shared Jotai store:
 * ```ts
 * import { atom, createStore } from "jotai";
 *
 * const jStore = createStore();
 * const uiAtom = atom<Record<string, unknown>>({ count: 0 });
 *
 * const store = jotaiStateStore({ atom: uiAtom, store: jStore });
 *
 * // In React:
 * <JotaiProvider store={jStore}>
 *   <StateProvider store={store}>...</StateProvider>
 * </JotaiProvider>
 * ```
 */
export function jotaiStateStore(options: JotaiStateStoreOptions): StateStore {
  const stateAtom = options.atom;
  const jStore = options.store ?? createJotaiStore();

  function getSnapshot(): StateModel {
    return jStore.get(stateAtom);
  }

  return {
    get(path: string): unknown {
      return getByPath(getSnapshot(), path);
    },

    set(path: string, value: unknown): void {
      const current = getSnapshot();
      if (getByPath(current, path) === value) return;
      const next = immutableSetByPath(current, path, value);
      jStore.set(stateAtom, next);
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
      jStore.set(stateAtom, next);
    },

    getSnapshot,

    getServerSnapshot: getSnapshot,

    subscribe(listener: () => void): () => void {
      return jStore.sub(stateAtom, listener);
    },
  };
}
