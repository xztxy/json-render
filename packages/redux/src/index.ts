import { getByPath, type StateModel, type StateStore } from "@json-render/core";
import { immutableSetByPath } from "@json-render/core/store-utils";
import type { Store, Action, UnknownAction } from "redux";

export type { StateStore } from "@json-render/core";

/**
 * Options for {@link reduxStateStore}.
 */
export interface ReduxStateStoreOptions<
  S = Record<string, unknown>,
  A extends Action = UnknownAction,
> {
  /** The Redux store instance. */
  store: Store<S, A>;
  /**
   * Select the json-render state slice from the Redux state tree.
   * For a simple store where the entire state is the model, use
   * `selector: (s) => s`.
   */
  selector: (state: S) => StateModel;
  /**
   * Dispatch a state change back to the Redux store.
   *
   * Called for every `set` / `update` with the full next state model.
   * You must dispatch an action that replaces the selected slice.
   *
   * @example
   * ```ts
   * dispatch: (nextState, reduxStore) =>
   *   reduxStore.dispatch(replaceState(nextState))
   * ```
   */
  dispatch: (nextState: StateModel, store: Store<S, A>) => void;
}

/**
 * Create a {@link StateStore} backed by a Redux store.
 *
 * @example
 * ```ts
 * import { configureStore, createSlice } from "@reduxjs/toolkit";
 * import { reduxStateStore } from "@json-render/redux";
 *
 * const uiSlice = createSlice({
 *   name: "ui",
 *   initialState: { count: 0 } as Record<string, unknown>,
 *   reducers: {
 *     replaceUiState: (_state, action) => action.payload,
 *   },
 * });
 *
 * const reduxStore = configureStore({
 *   reducer: { ui: uiSlice.reducer },
 * });
 *
 * const store = reduxStateStore({
 *   store: reduxStore,
 *   selector: (state) => state.ui,
 *   dispatch: (next, s) => s.dispatch(uiSlice.actions.replaceUiState(next)),
 * });
 *
 * <StateProvider store={store}>...</StateProvider>
 * ```
 */
export function reduxStateStore<
  S = Record<string, unknown>,
  A extends Action = UnknownAction,
>(options: ReduxStateStoreOptions<S, A>): StateStore {
  const { store, selector, dispatch } = options;

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
      dispatch(next, store);
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
      dispatch(next, store);
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
