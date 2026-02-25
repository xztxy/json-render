import type { VNode } from "vue";
import type {
  Catalog,
  InferCatalogComponents,
  InferCatalogActions,
  InferComponentProps,
  InferActionParams,
  StateModel,
} from "@json-render/core";

export type { StateModel };

export type SetState = (
  updater: (prev: Record<string, unknown>) => Record<string, unknown>,
) => void;

export interface EventHandle {
  emit: () => void;
  shouldPreventDefault: boolean;
  bound: boolean;
}

export interface BaseComponentProps<P = Record<string, unknown>> {
  props: P;
  children?: VNode[];
  emit: (event: string) => void;
  on: (event: string) => EventHandle;
  bindings?: Record<string, string>;
  loading?: boolean;
}

export interface ComponentContext<
  C extends Catalog,
  K extends keyof InferCatalogComponents<C>,
> extends BaseComponentProps<InferComponentProps<C, K>> {}

export type ComponentFn<
  C extends Catalog,
  K extends keyof InferCatalogComponents<C>,
> = (ctx: ComponentContext<C, K>) => VNode | VNode[] | null;

export type Components<C extends Catalog> = {
  [K in keyof InferCatalogComponents<C>]: ComponentFn<C, K>;
};

export type ActionFn<
  C extends Catalog,
  K extends keyof InferCatalogActions<C>,
> = (
  params: InferActionParams<C, K> | undefined,
  setState: SetState,
  state: StateModel,
) => Promise<void>;

export type Actions<C extends Catalog> = {
  [K in keyof InferCatalogActions<C>]: ActionFn<C, K>;
};

export type CatalogHasActions<C extends Catalog> = [
  InferCatalogActions<C>,
] extends [never]
  ? false
  : [keyof InferCatalogActions<C>] extends [never]
    ? false
    : true;
