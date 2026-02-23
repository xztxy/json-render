import {
  getByPath,
  immutableSetByPath,
  type StateModel,
  type StateStore,
} from "@json-render/core";
import type { Store, Action, UnknownAction } from "redux";

export type { StateStore } from "@json-render/core";

/**
 * Options for {@link reduxStateStore}.
 */
export interface ReduxStateStoreOptions<
  S extends StateModel = StateModel,
  A extends Action = UnknownAction,
> {
  /** The Redux store instance. */
  store: Store<S, A>;
  /**
   * Select the json-render state slice from the Redux state tree.
   * Defaults to `(state) => state` (the entire tree is the state model).
   */
  selector?: (state: S) => StateModel;
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
  S extends StateModel = StateModel,
  A extends Action = UnknownAction,
>(options: ReduxStateStoreOptions<S, A>): StateStore {
  const { store, selector = (s: S) => s as StateModel, dispatch } = options;

  function getSnapshot(): StateModel {
    return selector(store.getState());
  }

  return {
    get(path: string): unknown {
      return getByPath(getSnapshot(), path);
    },

    set(path: string, value: unknown): void {
      if (getByPath(getSnapshot(), path) === value) return;
      const next = immutableSetByPath(getSnapshot(), path, value);
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
