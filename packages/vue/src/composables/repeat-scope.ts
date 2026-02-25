import {
  defineComponent,
  provide,
  inject,
  type InjectionKey,
  type PropType,
} from "vue";

export interface RepeatScopeValue {
  item: unknown;
  index: number;
  basePath: string;
}

export const RepeatScopeKey: InjectionKey<RepeatScopeValue | null> = Symbol(
  "json-render-repeat-scope",
);

export const RepeatScopeProvider = defineComponent({
  name: "RepeatScopeProvider",
  props: {
    item: {
      type: null as unknown as PropType<unknown>,
      required: true,
    },
    index: {
      type: Number,
      required: true,
    },
    basePath: {
      type: String,
      required: true,
    },
  },
  setup(props, { slots }) {
    const value: RepeatScopeValue = {
      get item() {
        return props.item;
      },
      get index() {
        return props.index;
      },
      get basePath() {
        return props.basePath;
      },
    };

    provide(RepeatScopeKey, value);

    return () => slots.default?.();
  },
});

export function useRepeatScope(): RepeatScopeValue | null {
  return inject(RepeatScopeKey, null);
}
