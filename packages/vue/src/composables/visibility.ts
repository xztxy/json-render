import {
  defineComponent,
  provide,
  inject,
  computed,
  type InjectionKey,
} from "vue";
import {
  evaluateVisibility,
  type VisibilityCondition,
  type VisibilityContext as CoreVisibilityContext,
} from "@json-render/core";
import { useStateStore } from "./state.js";

export interface VisibilityContextValue {
  isVisible: (condition: VisibilityCondition | undefined) => boolean;
  ctx: CoreVisibilityContext;
}

export const VisibilityKey: InjectionKey<VisibilityContextValue> = Symbol(
  "json-render-visibility",
);

export const VisibilityProvider = defineComponent({
  name: "VisibilityProvider",
  setup(_, { slots }) {
    const storeCtx = useStateStore();

    const ctxRef = computed<CoreVisibilityContext>(() => ({
      stateModel: storeCtx.state,
    }));

    const value: VisibilityContextValue = {
      isVisible: (condition: VisibilityCondition | undefined) =>
        evaluateVisibility(condition, ctxRef.value),
      get ctx() {
        return ctxRef.value;
      },
    };

    provide(VisibilityKey, value);

    return () => slots.default?.();
  },
});

export function useVisibility(): VisibilityContextValue {
  const ctx = inject(VisibilityKey);
  if (!ctx) {
    throw new Error("useVisibility must be used within a VisibilityProvider");
  }
  return ctx;
}

export function useIsVisible(
  condition: VisibilityCondition | undefined,
): boolean {
  const { isVisible } = useVisibility();
  return isVisible(condition);
}
