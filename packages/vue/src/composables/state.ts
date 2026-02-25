import {
  defineComponent,
  provide,
  inject,
  shallowRef,
  onBeforeUnmount,
  watch,
  type InjectionKey,
  type PropType,
} from "vue";
import {
  getByPath,
  createStateStore,
  type StateModel,
  type StateStore,
} from "@json-render/core";
import { flattenToPointers } from "@json-render/core/store-utils";

export interface StateContextValue {
  state: StateModel;
  get: (path: string) => unknown;
  set: (path: string, value: unknown) => void;
  update: (updates: Record<string, unknown>) => void;
  getSnapshot: () => StateModel;
}

export const StateKey: InjectionKey<StateContextValue> =
  Symbol("json-render-state");

export interface StateProviderProps {
  store?: StateStore;
  initialState?: StateModel;
  onStateChange?: (changes: Array<{ path: string; value: unknown }>) => void;
}

export const StateProvider = defineComponent({
  name: "StateProvider",
  props: {
    store: {
      type: Object as PropType<StateStore>,
      default: undefined,
    },
    initialState: {
      type: Object as PropType<StateModel>,
      default: () => ({}),
    },
    onStateChange: {
      type: Function as PropType<
        (changes: Array<{ path: string; value: unknown }>) => void
      >,
      default: undefined,
    },
  },
  setup(props, { slots }) {
    const isControlled = !!props.store;
    let internalStore: StateStore | undefined;
    if (!isControlled) {
      internalStore = createStateStore(props.initialState);
    }

    const activeStore = props.store ?? internalStore!;

    const stateRef = shallowRef<StateModel>(activeStore.getSnapshot());

    const unsub = activeStore.subscribe(() => {
      stateRef.value = activeStore.getSnapshot();
    });
    onBeforeUnmount(unsub);

    // Sync initialState changes for uncontrolled mode
    if (!isControlled) {
      let prevFlat: Record<string, unknown> =
        props.initialState && Object.keys(props.initialState).length > 0
          ? flattenToPointers(props.initialState)
          : {};

      watch(
        () => props.initialState,
        (newState) => {
          if (isControlled || !newState) return;
          const nextFlat =
            Object.keys(newState).length > 0 ? flattenToPointers(newState) : {};
          const allKeys = new Set([
            ...Object.keys(prevFlat),
            ...Object.keys(nextFlat),
          ]);
          const updates: Record<string, unknown> = {};
          for (const key of allKeys) {
            if (prevFlat[key] !== nextFlat[key]) {
              updates[key] = key in nextFlat ? nextFlat[key] : undefined;
            }
          }
          prevFlat = nextFlat;
          if (Object.keys(updates).length > 0) {
            activeStore.update(updates);
          }
        },
        { deep: true },
      );
    }

    const get = (path: string) => activeStore.get(path);

    const set = (path: string, value: unknown) => {
      const prev = activeStore.getSnapshot();
      activeStore.set(path, value);
      if (!isControlled && activeStore.getSnapshot() !== prev) {
        props.onStateChange?.([{ path, value }]);
      }
    };

    const update = (updates: Record<string, unknown>) => {
      const prev = activeStore.getSnapshot();
      activeStore.update(updates);
      if (!isControlled && activeStore.getSnapshot() !== prev) {
        const changes: Array<{ path: string; value: unknown }> = [];
        for (const [path, value] of Object.entries(updates)) {
          if (getByPath(prev, path) !== value) {
            changes.push({ path, value });
          }
        }
        if (changes.length > 0) {
          props.onStateChange?.(changes);
        }
      }
    };

    const getSnapshot = () => activeStore.getSnapshot();

    const ctx: StateContextValue = {
      get state() {
        return stateRef.value;
      },
      get,
      set,
      update,
      getSnapshot,
    };

    provide(StateKey, ctx);

    return () => slots.default?.();
  },
});

export function useStateStore(): StateContextValue {
  const ctx = inject(StateKey);
  if (!ctx) {
    throw new Error("useStateStore must be used within a StateProvider");
  }
  return ctx;
}

export function useStateValue<T>(path: string): T | undefined {
  const { state } = useStateStore();
  return getByPath(state, path) as T | undefined;
}

export function useStateBinding<T>(
  path: string,
): [T | undefined, (value: T) => void] {
  const { state, set } = useStateStore();
  const value = getByPath(state, path) as T | undefined;
  const setValue = (newValue: T) => set(path, newValue);
  return [value, setValue];
}
