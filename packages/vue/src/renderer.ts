import {
  defineComponent,
  h,
  provide,
  inject,
  computed,
  unref,
  watch,
  onErrorCaptured,
  type Component,
  type ComputedRef,
  type DefineComponent,
  type PropType,
  type Ref,
  type VNode,
  type InjectionKey,
} from "vue";
import type {
  UIElement,
  Spec,
  ActionBinding,
  Catalog,
  SchemaDefinition,
  StateStore,
  ComputedFunction,
} from "@json-render/core";
import {
  resolveElementProps,
  resolveBindings,
  resolveActionParam,
  evaluateVisibility,
  getByPath,
  type PropResolutionContext,
} from "@json-render/core";
import type {
  Components,
  Actions,
  ActionFn,
  SetState,
  StateModel,
  CatalogHasActions,
  EventHandle,
} from "./catalog-types.js";
import { useVisibility } from "./composables/visibility.js";
import { useActions, ConfirmDialog } from "./composables/actions.js";
import { useStateStore, StateProvider } from "./composables/state.js";
import { VisibilityProvider } from "./composables/visibility.js";
import { ActionProvider } from "./composables/actions.js";
import { ValidationProvider } from "./composables/validation.js";
import {
  RepeatScopeProvider,
  useRepeatScope,
} from "./composables/repeat-scope.js";

// ---------------------------------------------------------------------------
// ComponentRenderProps
// ---------------------------------------------------------------------------

export interface ComponentRenderProps<P = Record<string, unknown>> {
  element: UIElement<string, P>;
  children?: VNode[];
  emit: (event: string) => void;
  on: (event: string) => EventHandle;
  bindings?: Record<string, string>;
  loading?: boolean;
}

export type ComponentRenderer<P = Record<string, unknown>> = Component<
  ComponentRenderProps<P>
>;

export type ComponentRegistry = Record<string, ComponentRenderer<any>>;

// ---------------------------------------------------------------------------
// FunctionsContext
// ---------------------------------------------------------------------------

const EMPTY_FUNCTIONS: Record<string, ComputedFunction> = {};

const FunctionsKey: InjectionKey<
  | Ref<Record<string, ComputedFunction>>
  | ComputedRef<Record<string, ComputedFunction>>
> = Symbol("json-render-functions");

function useFunctions():
  | Ref<Record<string, ComputedFunction>>
  | ComputedRef<Record<string, ComputedFunction>> {
  return inject(
    FunctionsKey,
    computed(() => EMPTY_FUNCTIONS),
  );
}

// ---------------------------------------------------------------------------
// ElementErrorBoundary
// ---------------------------------------------------------------------------

const ElementErrorBoundary = defineComponent({
  name: "ElementErrorBoundary",
  props: {
    elementType: { type: String, required: true },
  },
  setup(props, { slots }) {
    onErrorCaptured((error, _instance, info) => {
      console.error(
        `[json-render] Rendering error in <${props.elementType}>:`,
        error,
        info,
      );
      return false;
    });
    return () => slots.default?.();
  },
});

// ---------------------------------------------------------------------------
// ElementRenderer & RepeatChildren
// ---------------------------------------------------------------------------
// These two components reference each other recursively, so we declare them
// with explicit type annotations to satisfy DTS generation.

interface ElementRendererExposed {}
interface RepeatChildrenExposed {}

const ElementRenderer: DefineComponent<
  {
    element: { type: PropType<UIElement>; required: true };
    spec: { type: PropType<Spec>; required: true };
    registry: { type: PropType<ComponentRegistry>; required: true };
    loading: { type: BooleanConstructor; default: false };
    fallback: { type: PropType<ComponentRenderer>; default: undefined };
  },
  ElementRendererExposed
> = defineComponent({
  name: "ElementRenderer",
  props: {
    element: { type: Object as PropType<UIElement>, required: true },
    spec: { type: Object as PropType<Spec>, required: true },
    registry: {
      type: Object as PropType<ComponentRegistry>,
      required: true,
    },
    loading: { type: Boolean, default: false },
    fallback: {
      type: [Object, Function] as PropType<ComponentRenderer>,
      default: undefined,
    },
  },
  setup(props): () => VNode | null {
    const repeatScope = useRepeatScope();
    const { ctx } = useVisibility();
    const { execute } = useActions();
    const storeCtx = useStateStore();
    const functionsRef = useFunctions();

    const fullCtx = computed<PropResolutionContext>(() => {
      const base: PropResolutionContext = repeatScope
        ? {
            ...ctx,
            repeatItem: repeatScope.item,
            repeatIndex: repeatScope.index,
            repeatBasePath: repeatScope.basePath,
          }
        : { ...ctx };
      base.functions = unref(functionsRef);
      return base;
    });

    // Watch effect for element.watch
    let prevWatchValues: Record<string, unknown> | null = null;

    watch(
      () => {
        const watchConfig = props.element.watch;
        if (!watchConfig) return undefined;
        const values: Record<string, unknown> = {};
        for (const path of Object.keys(watchConfig)) {
          values[path] = getByPath(storeCtx.state, path);
        }
        return values;
      },
      (watchedValues, _old, onCleanup) => {
        const watchConfig = props.element.watch;
        if (!watchConfig || !watchedValues) return;

        const prev = prevWatchValues;
        prevWatchValues = watchedValues;

        // Skip initial
        if (prev === null) return;

        let cancelled = false;
        onCleanup(() => {
          cancelled = true;
        });

        const paths = Object.keys(watchConfig);
        void (async () => {
          for (const path of paths) {
            if (cancelled) break;
            if (watchedValues[path] !== prev[path]) {
              const binding = watchConfig[path];
              if (!binding) continue;
              const bindings = Array.isArray(binding) ? binding : [binding];
              for (const b of bindings) {
                if (cancelled) break;
                if (!b.params) {
                  await execute(b);
                  continue;
                }
                const liveCtx: PropResolutionContext = {
                  ...fullCtx.value,
                  stateModel: storeCtx.getSnapshot(),
                };
                const resolved: Record<string, unknown> = {};
                for (const [key, val] of Object.entries(b.params)) {
                  resolved[key] = resolveActionParam(val, liveCtx);
                }
                await execute({ ...b, params: resolved });
              }
            }
          }
        })().catch(console.error);
      },
      { deep: true },
    );

    return (): VNode | null => {
      const element = props.element;
      const currentCtx = fullCtx.value;

      // Visibility
      const isVisible =
        element.visible === undefined
          ? true
          : evaluateVisibility(element.visible, currentCtx);

      if (!isVisible) return null;

      // Bindings & props
      const rawProps = element.props as Record<string, unknown>;
      const elementBindings = resolveBindings(rawProps, currentCtx);
      const resolvedProps = resolveElementProps(rawProps, currentCtx);

      const resolvedElement =
        resolvedProps !== element.props
          ? { ...element, props: resolvedProps }
          : element;

      // Lookup component
      const Comp = props.registry[resolvedElement.type] ?? props.fallback;
      if (!Comp) {
        console.warn(`No renderer for component type: ${resolvedElement.type}`);
        return null;
      }

      // Build emit / on
      const onBindings = element.on;

      const emit = async (eventName: string): Promise<void> => {
        const binding = onBindings?.[eventName];
        if (!binding) return;
        const actionBindings = Array.isArray(binding) ? binding : [binding];
        for (const b of actionBindings) {
          if (!b.params) {
            await execute(b);
            continue;
          }
          const liveCtx: PropResolutionContext = {
            ...currentCtx,
            stateModel: storeCtx.getSnapshot(),
          };
          const resolved: Record<string, unknown> = {};
          for (const [key, val] of Object.entries(b.params)) {
            resolved[key] = resolveActionParam(val, liveCtx);
          }
          await execute({ ...b, params: resolved });
        }
      };

      const on = (eventName: string): EventHandle => {
        const binding = onBindings?.[eventName];
        if (!binding) {
          return { emit: () => {}, shouldPreventDefault: false, bound: false };
        }
        const actionBindings = Array.isArray(binding) ? binding : [binding];
        const shouldPreventDefault = actionBindings.some(
          (b) => b.preventDefault,
        );
        return {
          emit: () => emit(eventName),
          shouldPreventDefault,
          bound: true,
        };
      };

      // Render children
      let children: VNode[] | undefined;

      if (resolvedElement.repeat) {
        children = [
          h(RepeatChildren, {
            element: resolvedElement,
            spec: props.spec,
            registry: props.registry,
            loading: props.loading,
            fallback: props.fallback,
          }),
        ];
      } else if (resolvedElement.children) {
        children = resolvedElement.children
          .map((childKey): VNode | null => {
            const childElement = props.spec.elements[childKey];
            if (!childElement) {
              if (!props.loading) {
                console.warn(
                  `[json-render] Missing element "${childKey}" referenced as child of "${resolvedElement.type}". This element will not render.`,
                );
              }
              return null;
            }
            return h(ElementRenderer, {
              key: childKey,
              element: childElement,
              spec: props.spec,
              registry: props.registry,
              loading: props.loading,
              fallback: props.fallback,
            });
          })
          .filter((v): v is VNode => v !== null);
      }

      return h(
        ElementErrorBoundary,
        { elementType: resolvedElement.type },
        () =>
          h(
            Comp as Component,
            {
              element: resolvedElement,
              emit,
              on,
              bindings: elementBindings,
              loading: props.loading,
            },
            children ? () => children : undefined,
          ),
      );
    };
  },
}) as any;

const RepeatChildren: DefineComponent<
  {
    element: { type: PropType<UIElement>; required: true };
    spec: { type: PropType<Spec>; required: true };
    registry: { type: PropType<ComponentRegistry>; required: true };
    loading: { type: BooleanConstructor; default: false };
    fallback: { type: PropType<ComponentRenderer>; default: undefined };
  },
  RepeatChildrenExposed
> = defineComponent({
  name: "RepeatChildren",
  props: {
    element: { type: Object as PropType<UIElement>, required: true },
    spec: { type: Object as PropType<Spec>, required: true },
    registry: {
      type: Object as PropType<ComponentRegistry>,
      required: true,
    },
    loading: { type: Boolean, default: false },
    fallback: {
      type: [Object, Function] as PropType<ComponentRenderer>,
      default: undefined,
    },
  },
  setup(props): () => VNode[] {
    const storeCtx = useStateStore();

    return (): VNode[] => {
      const repeat = props.element.repeat!;
      const statePath = repeat.statePath;
      const items =
        (getByPath(storeCtx.state, statePath) as unknown[] | undefined) ?? [];

      return items.map((itemValue, index): VNode => {
        const key =
          repeat.key && typeof itemValue === "object" && itemValue !== null
            ? String(
                (itemValue as Record<string, unknown>)[repeat.key] ?? index,
              )
            : String(index);

        const childNodes: VNode[] = (props.element.children ?? [])
          .map((childKey): VNode | null => {
            const childElement = props.spec.elements[childKey];
            if (!childElement) {
              if (!props.loading) {
                console.warn(
                  `[json-render] Missing element "${childKey}" referenced as child of "${props.element.type}" (repeat). This element will not render.`,
                );
              }
              return null;
            }
            return h(ElementRenderer, {
              key: childKey,
              element: childElement,
              spec: props.spec,
              registry: props.registry,
              loading: props.loading,
              fallback: props.fallback,
            });
          })
          .filter((v): v is VNode => v !== null);

        return h(
          RepeatScopeProvider,
          {
            key,
            item: itemValue,
            index,
            basePath: `${statePath}/${index}`,
          },
          () => childNodes,
        );
      });
    };
  },
}) as any;

// ---------------------------------------------------------------------------
// Renderer
// ---------------------------------------------------------------------------

export interface RendererProps {
  spec: Spec | null;
  registry: ComponentRegistry;
  loading?: boolean;
  fallback?: ComponentRenderer;
}

export const Renderer = defineComponent({
  name: "Renderer",
  props: {
    spec: {
      type: Object as PropType<Spec | null>,
      default: null,
    },
    registry: {
      type: Object as PropType<ComponentRegistry>,
      required: true,
    },
    loading: { type: Boolean, default: false },
    fallback: {
      type: [Object, Function] as PropType<ComponentRenderer>,
      default: undefined,
    },
  },
  setup(props) {
    return () => {
      if (!props.spec || !props.spec.root) return null;

      const rootElement = props.spec.elements[props.spec.root];
      if (!rootElement) return null;

      return h(ElementRenderer, {
        element: rootElement,
        spec: props.spec,
        registry: props.registry,
        loading: props.loading,
        fallback: props.fallback,
      });
    };
  },
});

// ---------------------------------------------------------------------------
// ConfirmationDialogManager
// ---------------------------------------------------------------------------

const ConfirmationDialogManager = defineComponent({
  name: "ConfirmationDialogManager",
  setup() {
    const actions = useActions();

    return () => {
      const pending = actions.pendingConfirmation;
      if (!pending?.action.confirm) return null;

      return h(ConfirmDialog, {
        confirm: pending.action.confirm,
        onConfirm: actions.confirm,
        onCancel: actions.cancel,
      });
    };
  },
});

// ---------------------------------------------------------------------------
// JSONUIProvider
// ---------------------------------------------------------------------------

export interface JSONUIProviderProps {
  registry: ComponentRegistry;
  store?: StateStore;
  initialState?: Record<string, unknown>;
  handlers?: Record<
    string,
    (params: Record<string, unknown>) => Promise<unknown> | unknown
  >;
  navigate?: (path: string) => void;
  validationFunctions?: Record<
    string,
    (value: unknown, args?: Record<string, unknown>) => boolean
  >;
  functions?: Record<string, ComputedFunction>;
  onStateChange?: (changes: Array<{ path: string; value: unknown }>) => void;
}

export const JSONUIProvider = defineComponent({
  name: "JSONUIProvider",
  props: {
    registry: {
      type: Object as PropType<ComponentRegistry>,
      required: true,
    },
    store: {
      type: Object as PropType<StateStore>,
      default: undefined,
    },
    initialState: {
      type: Object as PropType<Record<string, unknown>>,
      default: () => ({}),
    },
    handlers: {
      type: Object as PropType<
        Record<
          string,
          (params: Record<string, unknown>) => Promise<unknown> | unknown
        >
      >,
      default: undefined,
    },
    navigate: {
      type: Function as PropType<(path: string) => void>,
      default: undefined,
    },
    validationFunctions: {
      type: Object as PropType<
        Record<
          string,
          (value: unknown, args?: Record<string, unknown>) => boolean
        >
      >,
      default: undefined,
    },
    functions: {
      type: Object as PropType<Record<string, ComputedFunction>>,
      default: undefined,
    },
    onStateChange: {
      type: Function as PropType<
        (changes: Array<{ path: string; value: unknown }>) => void
      >,
      default: undefined,
    },
  },
  setup(props, { slots }) {
    provide(
      FunctionsKey,
      computed(() => props.functions ?? EMPTY_FUNCTIONS),
    );

    return () =>
      h(
        StateProvider,
        {
          store: props.store,
          initialState: props.initialState,
          onStateChange: props.onStateChange,
        },
        () =>
          h(VisibilityProvider, null, () =>
            h(
              ValidationProvider,
              { customFunctions: props.validationFunctions },
              () =>
                h(
                  ActionProvider,
                  { handlers: props.handlers, navigate: props.navigate },
                  () => [slots.default?.(), h(ConfirmationDialogManager)],
                ),
            ),
          ),
      );
  },
});

// ============================================================================
// defineRegistry
// ============================================================================

export interface DefineRegistryResult {
  registry: ComponentRegistry;
  handlers: (
    getSetState: () => SetState | undefined,
    getState: () => StateModel,
  ) => Record<string, (params: Record<string, unknown>) => Promise<void>>;
  executeAction: (
    actionName: string,
    params: Record<string, unknown> | undefined,
    setState: SetState,
    state?: StateModel,
  ) => Promise<void>;
}

type DefineRegistryOptions<C extends Catalog> = {
  components?: Components<C>;
} & (CatalogHasActions<C> extends true
  ? { actions: Actions<C> }
  : { actions?: Actions<C> });

type DefineRegistryComponentFn = (ctx: {
  props: unknown;
  children?: VNode[];
  emit: (event: string) => void;
  on: (event: string) => EventHandle;
  bindings?: Record<string, string>;
  loading?: boolean;
}) => VNode | VNode[] | null;

type DefineRegistryActionFn = (
  params: Record<string, unknown> | undefined,
  setState: SetState,
  state: StateModel,
) => Promise<void>;

export function defineRegistry<C extends Catalog>(
  _catalog: C,
  options: DefineRegistryOptions<C>,
): DefineRegistryResult {
  const registry: ComponentRegistry = {};
  if (options.components) {
    for (const [name, componentFn] of Object.entries(options.components)) {
      registry[name] = defineComponent({
        name: `JR_${name}`,
        props: {
          element: { type: Object as PropType<UIElement>, required: true },
          emit: {
            type: Function as PropType<(event: string) => void>,
            required: true,
          },
          on: {
            type: Function as PropType<(event: string) => EventHandle>,
            required: true,
          },
          bindings: {
            type: Object as PropType<Record<string, string>>,
            default: undefined,
          },
          loading: { type: Boolean, default: false },
        },
        setup(compProps, { slots }) {
          return () => {
            const children = slots.default?.();
            return (componentFn as DefineRegistryComponentFn)({
              props: compProps.element.props,
              children,
              emit: compProps.emit as (event: string) => void,
              on: compProps.on as (event: string) => EventHandle,
              bindings: compProps.bindings,
              loading: compProps.loading,
            });
          };
        },
      });
    }
  }

  const actionMap = options.actions
    ? (Object.entries(options.actions) as Array<
        [string, DefineRegistryActionFn]
      >)
    : [];

  const handlers = (
    getSetState: () => SetState | undefined,
    getState: () => StateModel,
  ): Record<string, (params: Record<string, unknown>) => Promise<void>> => {
    const result: Record<
      string,
      (params: Record<string, unknown>) => Promise<void>
    > = {};
    for (const [name, actionFn] of actionMap) {
      result[name] = async (params) => {
        const setState = getSetState();
        const state = getState();
        if (setState) {
          await actionFn(params, setState, state);
        }
      };
    }
    return result;
  };

  const executeActionFn = async (
    actionName: string,
    params: Record<string, unknown> | undefined,
    setState: SetState,
    state: StateModel = {},
  ): Promise<void> => {
    const entry = actionMap.find(([name]) => name === actionName);
    if (entry) {
      await entry[1](params, setState, state);
    } else {
      console.warn(`Unknown action: ${actionName}`);
    }
  };

  return { registry, handlers, executeAction: executeActionFn };
}

// ============================================================================
// createRenderer
// ============================================================================

export interface CreateRendererProps {
  spec: Spec | null;
  store?: StateStore;
  state?: Record<string, unknown>;
  onAction?: (actionName: string, params?: Record<string, unknown>) => void;
  onStateChange?: (changes: Array<{ path: string; value: unknown }>) => void;
  functions?: Record<string, ComputedFunction>;
  loading?: boolean;
  fallback?: ComponentRenderer;
}

export type ComponentMap<
  TComponents extends Record<string, { props: unknown }>,
> = {
  [K in keyof TComponents]: Component<
    ComponentRenderProps<
      TComponents[K]["props"] extends { _output: infer O }
        ? O
        : Record<string, unknown>
    >
  >;
};

export function createRenderer<
  TDef extends SchemaDefinition,
  TCatalog extends { components: Record<string, { props: unknown }> },
>(
  _catalog: Catalog<TDef, TCatalog>,
  components: ComponentMap<TCatalog["components"]>,
): Component<CreateRendererProps> {
  const registry: ComponentRegistry =
    components as unknown as ComponentRegistry;

  return defineComponent({
    name: "CatalogRenderer",
    props: {
      spec: { type: Object as PropType<Spec | null>, default: null },
      store: { type: Object as PropType<StateStore>, default: undefined },
      state: {
        type: Object as PropType<Record<string, unknown>>,
        default: undefined,
      },
      onAction: {
        type: Function as PropType<
          (actionName: string, params?: Record<string, unknown>) => void
        >,
        default: undefined,
      },
      onStateChange: {
        type: Function as PropType<
          (changes: Array<{ path: string; value: unknown }>) => void
        >,
        default: undefined,
      },
      functions: {
        type: Object as PropType<Record<string, ComputedFunction>>,
        default: undefined,
      },
      loading: { type: Boolean, default: false },
      fallback: {
        type: [Object, Function] as PropType<ComponentRenderer>,
        default: undefined,
      },
    },
    setup(props) {
      provide(
        FunctionsKey,
        computed(() => props.functions ?? EMPTY_FUNCTIONS),
      );

      return () => {
        const actionHandlers = props.onAction
          ? new Proxy(
              {} as Record<
                string,
                (params: Record<string, unknown>) => void | Promise<void>
              >,
              {
                get: (_target, prop: string) => {
                  return (params: Record<string, unknown>) =>
                    props.onAction!(prop, params);
                },
                has: () => true,
              },
            )
          : undefined;

        return h(
          StateProvider,
          {
            store: props.store,
            initialState: props.state,
            onStateChange: props.onStateChange,
          },
          () =>
            h(VisibilityProvider, null, () =>
              h(ValidationProvider, null, () =>
                h(ActionProvider, { handlers: actionHandlers }, () => [
                  h(Renderer, {
                    spec: props.spec,
                    registry,
                    loading: props.loading,
                    fallback: props.fallback,
                  }),
                  h(ConfirmationDialogManager),
                ]),
              ),
            ),
        );
      };
    },
  });
}
